import {
  Room,
  RoomEvent,
  ConnectionState,
  RemoteParticipant,
  RemoteAudioTrack,
  LocalParticipant,
  Participant,
  ConnectionQuality,
  DisconnectReason,
  createLocalAudioTrack,
  Track,
} from 'livekit-client';
import type { IVoiceService, AudioDevice } from '@/domain/interfaces';

type SpeakingHandler = (participantId: string, speaking: boolean) => void;
type QualityHandler = (participantId: string, quality: number) => void;
type DataHandler = (data: Uint8Array, participantId: string) => void;

export class VoiceService implements IVoiceService {
  private room: Room | null = null;
  private speakingHandlers: Set<SpeakingHandler> = new Set();
  private qualityHandlers: Set<QualityHandler> = new Set();
  private dataHandlers: Set<DataHandler> = new Set();
  private connectingPromise: Promise<void> | null = null;
  private currentInputDeviceId: string | null = null;
  private currentOutputDeviceId: string | null = null;

  async connect(url: string, token: string): Promise<void> {
    // CRITICAL: Check for existing connection promise FIRST before doing anything else
    // This prevents race conditions where multiple connect() calls happen simultaneously
    if (this.connectingPromise) {
      console.log('🔄 LiveKit: Already connecting, waiting for existing promise...');
      try {
        await this.connectingPromise;
        console.log('🔄 LiveKit: Existing connection promise completed');
        // Check if we're now connected
        if (this.room && this.room.state === ConnectionState.Connected) {
          console.log('🔄 LiveKit: Already connected after waiting (state:', this.room.state, '), skipping reconnect');
          return;
        }
      } catch (error) {
        console.error('🔄 LiveKit: Existing connection promise failed:', error);
        // Clear the failed promise so we can retry
        this.connectingPromise = null;
      }
    }

    // If already connected to the same room, don't reconnect
    if (this.room && this.room.state === ConnectionState.Connected) {
      console.log('🔄 LiveKit: Already connected (state:', this.room.state, '), skipping reconnect');
      return;
    }

    // If we have an existing room in any state, disconnect it first BEFORE creating a new one
    // This prevents race conditions where the old room disconnects while the new one is connecting
    if (this.room) {
      const oldState = this.room.state;
      console.log('🔄 LiveKit: Disconnecting existing room (state:', oldState, ') before creating new connection...');
      const oldRoom = this.room;
      // Clear reference IMMEDIATELY to prevent event handlers from interfering
      // This ensures any disconnect events from the old room are ignored
      this.room = null;
      this.connectingPromise = null; // Clear any stale promise
      
      // Remove all event listeners from old room before disconnecting
      // This prevents the disconnect handler from firing and interfering
      try {
        // LiveKit doesn't expose a way to remove all listeners, but clearing the reference
        // and waiting should be enough since we check roomForHandlers in the handler
        await oldRoom.disconnect();
        console.log('✅ LiveKit: Old room disconnected');
      } catch (error) {
        console.error('Error disconnecting old room:', error);
      }
      // Wait longer for disconnect to fully complete and all events to fire
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Double-check we're not already connecting (shouldn't happen, but be safe)
    if (this.connectingPromise) {
      console.log('🔄 LiveKit: Connection promise exists after cleanup, waiting...');
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      let roomCreated = false;
      try {
        // Create new room instance - ensure we don't have any old room reference
        if (this.room) {
          console.warn('⚠️ LiveKit: Room still exists when creating new one, clearing it');
          this.room = null;
        }
        
        this.room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        roomCreated = true;

        this.setupEventHandlers();

        console.log('🔄 LiveKit: Calling room.connect()...');
        console.log('LiveKit URL:', url);
        console.log('Token preview:', token.substring(0, 50) + '...');
        console.log('Token full length:', token.length);
        console.log('📡 Check Network tab for WebSocket connection to:', url);
        console.log('   Look for WS entry with status 101 (Switching Protocols)');
        
        // Add connection timeout
        // Connect with autoSubscribe to receive other participants' tracks
        // Microphone is explicitly disabled after connect in useVoiceRoom hook
        const connectPromise = this.room.connect(url, token, {
          autoSubscribe: true,
        });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('LiveKit connection timeout after 10 seconds')), 10000);
        });
        
        const startTime = Date.now();
        try {
          await Promise.race([connectPromise, timeoutPromise]);
          const duration = Date.now() - startTime;
          console.log(`✅ LiveKit room.connect() promise resolved (took ${duration}ms)`);
          console.log('Room state after connect:', this.room.state);
          console.log('Local participant:', this.room.localParticipant?.identity);
          console.log('📡 Check Network tab → WS filter → Look for connection to', url);
          // Note: RoomEvent.Connected will fire separately and log the full success message
        } catch (timeoutError: any) {
          if (timeoutError.message?.includes('timeout')) {
            console.error('❌ LiveKit connection timed out after 10 seconds');
            console.error('📡 Check Network tab → WS filter → Do you see a connection attempt to', url, '?');
            console.error('This usually means:');
            console.error('  1. LiveKit server is not reachable at', url);
            console.error('  2. Firewall is blocking the connection');
            console.error('  3. LiveKit server is not running');
            console.error('  4. Network routing issue');
            console.error('💡 Test in browser console: new WebSocket("' + url + '")');
          }
          throw timeoutError;
        }
      } catch (error: any) {
        console.error('❌ LiveKit connection error:', error);
        console.error('Error message:', error?.message);
        console.error('Error name:', error?.name);
        console.error('Error code:', error?.code);
        console.error('Error stack:', error?.stack);
        // Clean up on error - only if we created the room
        if (roomCreated && this.room) {
          try {
            await this.room.disconnect();
          } catch (disconnectError) {
            console.error('Error disconnecting after failed connect:', disconnectError);
          }
          this.room = null;
        }
        throw error;
      } finally {
        // Only clear promise if this is still the current promise
        if (this.connectingPromise === this.connectingPromise) {
          this.connectingPromise = null;
        }
      }
    })();

    return this.connectingPromise;
  }

  async disconnect(): Promise<void> {
    // If currently connecting, wait for it to complete or cancel it
    if (this.connectingPromise) {
      console.log('🔄 LiveKit: Disconnect requested while connecting, waiting for connection to complete...');
      try {
        await this.connectingPromise;
      } catch (error) {
        // Connection failed, that's okay
        console.log('🔄 LiveKit: Connection promise rejected during disconnect:', error);
      }
      this.connectingPromise = null;
    }

    if (this.room) {
      console.log('🔄 LiveKit: Disconnecting room (state:', this.room.state, ')');

      // Unpublish local microphone so we stop sending; room.disconnect(true) will stop
      // local tracks and release the mic. We don't stop tracks ourselves so the SDK
      // handles it once (avoids double-stop; browser keeps permission for same origin on rejoin).
      try {
        if (this.room.localParticipant?.isMicrophoneEnabled) {
          console.log('🎤 Disabling local microphone before disconnect');
          await this.room.localParticipant.setMicrophoneEnabled(false);
        }
      } catch (error) {
        console.error('Error disabling local microphone:', error);
      }

      // Detach all remote audio tracks to stop audio playback
      try {
        this.room.remoteParticipants.forEach((participant) => {
          participant.audioTrackPublications.forEach((publication) => {
            const track = publication.track;
            if (track && track instanceof RemoteAudioTrack) {
              console.log('🔇 Detaching audio track from participant:', participant.identity);
              track.detach();
            }
          });
        });
      } catch (error) {
        console.error('Error detaching audio tracks:', error);
      }

      try {
        // stopTracks: true (default) so SDK stops local tracks and releases the microphone
        await this.room.disconnect(true);
        console.log('✅ LiveKit: Room disconnected successfully');
      } catch (error) {
        console.error('❌ LiveKit: Error during disconnect:', error);
      }
      this.room = null;
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room?.localParticipant) {
      throw new Error('Not connected to room');
    }
    
    // Check if getUserMedia is available (required for microphone access)
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHTTPS = window.location.protocol === 'https:';
      
      if (!isLocalhost && !isHTTPS) {
        throw new Error('Microphone access requires HTTPS. Please access the application via HTTPS or use localhost.');
      } else {
        throw new Error('Microphone access is not available in this browser. Please use a modern browser that supports WebRTC.');
      }
    }
    
    try {
      // Let LiveKit handle getUserMedia - it will request permissions when needed
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
    } catch (error: any) {
      console.error('Failed to set microphone enabled:', error);
      
      // Handle specific error types
      if (error?.name === 'NotAllowedError' || error?.message?.includes('permission')) {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      }
      if (error?.name === 'NotFoundError' || error?.message?.includes('device')) {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      if (error?.message?.includes('getUserMedia') || error?.message?.includes('mediaDevices')) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHTTPS = window.location.protocol === 'https:';
        if (!isLocalhost && !isHTTPS) {
          throw new Error('Microphone access requires HTTPS. Please access the application via HTTPS.');
        }
      }
      throw error;
    }
  }

  isMicrophoneEnabled(): boolean {
    return this.room?.localParticipant?.isMicrophoneEnabled ?? false;
  }

  async enumerateAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Request permission first (required for device labels)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as 'audioinput' | 'audiooutput',
        }));
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [];
    }
  }

  async setAudioInputDevice(deviceId: string): Promise<void> {
    if (!this.room?.localParticipant) {
      throw new Error('Not connected to room');
    }

    try {
      // Disable microphone first
      const wasEnabled = this.room.localParticipant.isMicrophoneEnabled;
      if (wasEnabled) {
        await this.room.localParticipant.setMicrophoneEnabled(false);
      }

      // Create new audio track with specified device
      const track = await createLocalAudioTrack({
        deviceId: deviceId,
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      });

      // Replace the existing microphone track
      const existingPublications = Array.from(this.room.localParticipant.audioTrackPublications.values());
      for (const publication of existingPublications) {
        if (publication.source === Track.Source.Microphone && publication.track) {
          await this.room.localParticipant.unpublishTrack(publication.track);
        }
      }

      await this.room.localParticipant.publishTrack(track, {
        source: Track.Source.Microphone,
      });

      // Re-enable if it was enabled before
      if (wasEnabled) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      }

      this.currentInputDeviceId = deviceId;
      console.log('Audio input device set to:', deviceId);
    } catch (error) {
      console.error('Failed to set audio input device:', error);
      throw error;
    }
  }

  async setAudioOutputDevice(deviceId: string): Promise<void> {
    // For output devices, we need to set it on the HTMLAudioElement
    // LiveKit uses HTMLAudioElement for remote audio tracks
    try {
      // Set sink ID for all remote audio tracks
      if (this.room) {
        this.room.remoteParticipants.forEach((participant) => {
          participant.audioTrackPublications.forEach((publication) => {
            const track = publication.track;
            if (track && track instanceof RemoteAudioTrack) {
              // Attach or get the audio element (attach() returns existing if already attached)
              const element = track.attach() as HTMLAudioElement;
              
              if (element && 'setSinkId' in element) {
                (element as any).setSinkId(deviceId).catch((err: Error) => {
                  console.error('Failed to set sink ID:', err);
                });
              }
            }
          });
        });
      }

      this.currentOutputDeviceId = deviceId;
      console.log('Audio output device set to:', deviceId);
    } catch (error) {
      console.error('Failed to set audio output device:', error);
      throw error;
    }
  }

  getCurrentAudioInputDevice(): string | null {
    return this.currentInputDeviceId;
  }

  getCurrentAudioOutputDevice(): string | null {
    return this.currentOutputDeviceId;
  }

  onParticipantSpeaking(handler: SpeakingHandler): () => void {
    this.speakingHandlers.add(handler);
    return () => {
      this.speakingHandlers.delete(handler);
    };
  }

  onConnectionQualityChange(handler: QualityHandler): () => void {
    this.qualityHandlers.add(handler);
    return () => {
      this.qualityHandlers.delete(handler);
    };
  }

  setParticipantVolume(participantId: string, volume: number): void {
    if (!this.room) return;

    const participant = this.room.remoteParticipants.get(participantId);
    if (participant) {
      participant.audioTrackPublications.forEach((publication) => {
        const track = publication.track;
        if (track && track instanceof RemoteAudioTrack) {
          track.setVolume(volume);
        }
      });
    }
  }

  private setupEventHandlers(): void {
    if (!this.room) return;

    // Store reference to the room we're setting up handlers for
    const roomForHandlers = this.room;

    // Connection events
    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      // Only process if this is still the current room
      if (this.room !== roomForHandlers) {
        console.log('🔴 LiveKit: Ignoring disconnect event from old room');
        return;
      }
      
      console.log('🔴 LiveKit room disconnected:', reason, 'Reason code:', reason);
      console.log('Room state after disconnect:', this.room?.state);
      
      if (reason === DisconnectReason.CLIENT_INITIATED) {
        console.log('Disconnect was client-initiated (normal)');
        // Check if we're still trying to connect - this might be a race condition
        if (this.connectingPromise) {
          console.warn('⚠️ Disconnect happened while still connecting - possible race condition');
          console.warn('This usually means the old room was disconnected while a new connection was starting');
        }
      } else if (reason === DisconnectReason.JOIN_FAILURE) {
        console.error('❌ JOIN_FAILURE - Check LiveKit URL and token');
      } else if (reason === DisconnectReason.STATE_MISMATCH) {
        console.error('❌ STATE_MISMATCH - Room state conflict');
      } else {
        console.warn('Unexpected disconnect reason:', reason);
      }
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('🔄 LiveKit room reconnecting...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('✅ LiveKit room reconnected');
    });

    // Note: RoomEvent.Connecting doesn't exist in LiveKit SDK
    // Connection state is tracked via ConnectionState enum, not events

    // Log when connection quality changes (indicates connection is working)
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant === this.room?.localParticipant) {
        console.log('📊 LiveKit connection quality:', quality);
      }
    });

    // Connection successful event
    this.room.on(RoomEvent.Connected, () => {
      if (!this.room) return;
      console.log('✅✅✅ LiveKit room CONNECTED successfully!');
      console.log('Room name:', this.room.name);
      console.log('Local participant:', this.room.localParticipant?.identity);
      console.log('Room state:', this.room.state);
    });

    // Speaking events
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      // Notify about all participants' speaking state
      const speakerIds = new Set(speakers.map((s) => s.identity));

      // Collect all participant IDs (local + remote)
      const allParticipantIds = new Set<string>();
      if (this.room?.localParticipant) {
        allParticipantIds.add(this.room.localParticipant.identity);
      }
      this.room?.remoteParticipants.forEach((p) => {
        allParticipantIds.add(p.identity);
      });

      // Update speaking state for all participants
      // Mark as speaking if in speakers list, not speaking if not
      allParticipantIds.forEach((participantId) => {
        const isSpeaking = speakerIds.has(participantId);
        this.notifySpeaking(participantId, isSpeaking);
      });
    });

    // Connection quality events
    this.room.on(
      RoomEvent.ConnectionQualityChanged,
      (quality: ConnectionQuality, participant: Participant) => {
        const qualityValue = this.mapQualityToNumber(quality);
        this.qualityHandlers.forEach((handler) =>
          handler(participant.identity, qualityValue)
        );
      }
    );

    // Track subscription
    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      console.log('🎵 Track subscribed:', track.kind, 'from', participant?.identity || 'unknown');
      if (track.kind === 'audio' && track instanceof RemoteAudioTrack) {
        // Audio track automatically plays
        // Apply output device if set
        if (this.currentOutputDeviceId) {
          // Wait a bit for the element to be attached, then set sink ID
          setTimeout(() => {
            const element = track.attach() as HTMLAudioElement;
            if (element && 'setSinkId' in element) {
              (element as any).setSinkId(this.currentOutputDeviceId!).catch((err: Error) => {
                console.error('Failed to set sink ID for new track:', err);
              });
            }
          }, 100);
        }
      }
    });

    // Track unsubscription - clean up when remote track is removed
    this.room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      console.log('🔇 Track unsubscribed:', track.kind, 'from', participant.identity);
      if (track.kind === 'audio' && track instanceof RemoteAudioTrack) {
        track.detach();
      }
    });

    // Participant disconnected - clean up all their tracks
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('👋 Participant disconnected:', participant.identity);
      participant.audioTrackPublications.forEach((publication) => {
        const track = publication.track;
        if (track && track instanceof RemoteAudioTrack) {
          console.log('🔇 Detaching audio track from disconnected participant:', participant.identity);
          track.detach();
        }
      });
    });

    // Data channel events for chat
    this.room.on(RoomEvent.DataReceived, (data: Uint8Array, participant?: RemoteParticipant) => {
      if (this.room !== roomForHandlers) {
        return; // Ignore events from old room
      }
      const participantId = participant?.identity ?? 'unknown';
      this.dataHandlers.forEach((handler) => {
        try {
          handler(data, participantId);
        } catch (error) {
          console.error('Error in data handler:', error);
        }
      });
    });
  }

  private notifySpeaking(participantId: string, speaking: boolean): void {
    this.speakingHandlers.forEach((handler) => handler(participantId, speaking));
  }

  private mapQualityToNumber(quality: ConnectionQuality): number {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return 100;
      case ConnectionQuality.Good:
        return 75;
      case ConnectionQuality.Poor:
        return 50;
      case ConnectionQuality.Lost:
        return 0;
      default:
        return 75;
    }
  }

  getLocalParticipant(): LocalParticipant | undefined {
    return this.room?.localParticipant;
  }

  getRemoteParticipants(): Map<string, RemoteParticipant> {
    return this.room?.remoteParticipants ?? new Map();
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  // Data channel methods for chat
  async publishData(data: object): Promise<void> {
    if (!this.room?.localParticipant) {
      throw new Error('Not connected to room');
    }
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    await this.room.localParticipant.publishData(encoded, { reliable: true });
  }

  async publishDataTo(data: object, destinationIdentities: string[]): Promise<void> {
    if (!this.room?.localParticipant) {
      throw new Error('Not connected to room');
    }
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    await this.room.localParticipant.publishData(encoded, {
      reliable: true,
      destinationIdentities,
    });
  }

  onDataReceived(handler: DataHandler): () => void {
    this.dataHandlers.add(handler);
    return () => {
      this.dataHandlers.delete(handler);
    };
  }

  isOldestParticipant(): boolean {
    if (!this.room?.localParticipant) return false;

    const localJoinedAt = this.room.localParticipant.joinedAt?.getTime() ?? Date.now();

    for (const participant of this.room.remoteParticipants.values()) {
      const remoteJoinedAt = participant.joinedAt?.getTime() ?? Date.now();
      if (remoteJoinedAt < localJoinedAt) {
        return false;
      }
    }

    return true;
  }

  getLocalParticipantIdentity(): string | undefined {
    return this.room?.localParticipant?.identity;
  }

  getLocalParticipantName(): string | undefined {
    return this.room?.localParticipant?.name || this.room?.localParticipant?.identity;
  }

  getRemoteParticipantIdentities(): string[] {
    if (!this.room) return [];
    return Array.from(this.room.remoteParticipants.keys());
  }
}

// Singleton instance
let instance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!instance) {
    instance = new VoiceService();
  }
  return instance;
}
