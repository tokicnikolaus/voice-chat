import type { ConnectionState, WebSocketMessage } from '@/domain/types';
import type { IWebSocketService } from '@/domain/interfaces';

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (state: ConnectionState) => void;

export class WebSocketService implements IWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private connectingPromise: Promise<void> | null = null;
  private shouldStayConnected = true; // Flag to prevent closing during StrictMode unmounts

  constructor(url?: string) {
    // Default to using the same host and port as the current page, going through nginx proxy
    if (!url) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Includes hostname:port
      url = `${protocol}//${host}/ws`;
    }
    this.url = url;
    console.log('WebSocketService initialized with URL:', this.url);
  }

  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    // Mark that we want to stay connected
    this.shouldStayConnected = true;

    // Create new connection promise
    this.connectingPromise = new Promise((resolve, reject) => {
      this.setConnectionState('connecting');

      try {
        console.log('Attempting WebSocket connection to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.setConnectionState('connected');
          this.startPingKeepalive();
          
          // Send initial ping immediately to keep connection alive
          // Some browsers/proxies close idle WebSocket connections quickly
          setTimeout(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              // Only log initial ping, not subsequent ones
              // console.log('Sending initial ping to keep connection alive');
              this.send('ping', {});
            }
          }, 1000); // Send after 1 second
          
          this.connectingPromise = null; // Clear promise on success
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean, 'shouldStayConnected:', this.shouldStayConnected);
          this.connectingPromise = null; // Clear promise on close
          
          // If we should stay connected (not explicitly disconnected), try to reconnect
          if (this.shouldStayConnected) {
            this.handleDisconnect();
          } else {
            // Explicitly disconnected, don't reconnect
            this.setConnectionState('disconnected');
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error, 'URL:', this.url);
          this.setConnectionState('error');
          this.connectingPromise = null; // Clear promise on error
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            
            // Handle ping/pong keepalive
            if (message.type === 'ping') {
              // Silently respond to ping - reduce console noise
              this.send('pong', {});
              return; // Don't notify handlers about ping
            }
            if (message.type === 'pong') {
              // Silently handle pong - reduce console noise
              return; // Don't notify handlers about pong
            }
            
            console.log('Received message:', message.type);
            this.notifyMessageHandlers(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
      } catch (error) {
        this.setConnectionState('error');
        this.connectingPromise = null; // Clear promise on exception
        reject(error);
      }
    });

    return this.connectingPromise;
  }

  disconnect(): void {
    this.shouldStayConnected = false;
    this.stopPingKeepalive();
    this.connectingPromise = null; // Clear any pending connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }

  send<T>(type: string, payload?: T): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const message = {
      type,
      payload,
    };

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    // Immediately notify of current state
    handler(this.connectionState);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionHandlers.forEach((handler) => handler(state));
  }

  private notifyMessageHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => handler(message));
  }

  private handleDisconnect(): void {
    this.stopPingKeepalive();
    
    if (this.connectionState === 'disconnected') {
      return;
    }

    // Always try to reconnect - handlers might be temporarily removed by React StrictMode
    // The singleton pattern ensures the WebSocket persists across component mounts/unmounts
    this.setConnectionState('reconnecting');

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Use exponential backoff, but cap at 5 seconds
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 5000);

      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        // Only reconnect if we should stay connected
        if (this.shouldStayConnected) {
          // Reconnect - handlers will be re-added when component remounts
          this.connect().catch((error) => {
            console.error('Reconnect failed:', error);
            // Will try again if attempts remain
          });
        } else {
          console.log('Not reconnecting - shouldStayConnected is false');
          this.setConnectionState('disconnected');
        }
      }, delay);
    } else {
      // Max reconnection attempts reached
      console.log('Max reconnection attempts reached');
      this.setConnectionState('error');
    }
  }

  private startPingKeepalive(): void {
    this.stopPingKeepalive(); // Clear any existing interval
    
    // Only log once, not every time
    if (this.pingInterval === null) {
      console.log('Starting ping keepalive (every 20 seconds)');
    }
    
    // Send ping every 20 seconds to keep connection alive
    // Reduced from 25s to ensure we ping before any potential 30s timeouts
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Only log ping/pong in debug mode or when there are issues
        // Commented out to reduce console noise
        // console.log('Sending ping keepalive');
        this.send('ping', {});
      } else {
        console.log('Cannot send ping - WebSocket state:', this.ws?.readyState);
      }
    }, 20000); // Reduced to 20 seconds
  }

  private stopPingKeepalive(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton instance
let instance: WebSocketService | null = null;

export function getWebSocketService(url?: string): WebSocketService {
  if (!instance) {
    instance = new WebSocketService(url);
  }
  return instance;
}
