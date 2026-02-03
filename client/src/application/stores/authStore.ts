import { create } from 'zustand';
import type { User, AuthTokens } from '@/domain/types/auth';
import { getAuthService } from '@/infrastructure/auth/AuthService';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { getWebSocketService } from '@/infrastructure/websocket/WebSocketService';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';
import { useRoomStore } from './roomStore';
import { useChatStore } from './chatStore';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  clearError: () => void;
  setTokens: (tokens: AuthTokens) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiryDate: null,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const authService = getAuthService();
      const { user, tokens } = await authService.login(username, password);

      set({
        isAuthenticated: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
        isLoading: false,
        error: null,
      });

      // Schedule token refresh
      authService.scheduleTokenRefresh(
        (newTokens) => get().setTokens(newTokens),
        () => get().logout()
      );

      return true;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      return false;
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    const authService = getAuthService();

    // Stop any playing background audio (always call stop, don't check isPlaying)
    const toneGen = getToneGenerator();
    toneGen.stop();
    console.log('🛑 Background audio stopped - logout');

    // Disconnect from LiveKit voice
    try {
      await getVoiceService().disconnect();
      console.log('🎤 Voice disconnected - logout');
    } catch (error) {
      console.error('Error disconnecting voice:', error);
    }

    // Disconnect WebSocket
    getWebSocketService().disconnect();
    console.log('🔌 WebSocket disconnected - logout');

    // Reset stores
    useRoomStore.getState().reset();
    useChatStore.getState().reset();

    // Logout from auth server
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiryDate: null,
      error: null,
    });
  },

  restoreSession: async () => {
    const authService = getAuthService();
    const user = authService.getUser();
    const tokens = authService.getTokens();

    if (!user || !tokens) {
      return false;
    }

    // Check if token is expired
    if (authService.isTokenExpired()) {
      try {
        // Try to refresh the token
        const newTokens = await authService.refreshToken(tokens.refreshToken);
        set({
          isAuthenticated: true,
          user,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiryDate: newTokens.expiryDate,
        });

        // Schedule next refresh
        authService.scheduleTokenRefresh(
          (refreshedTokens) => get().setTokens(refreshedTokens),
          () => get().logout()
        );

        return true;
      } catch {
        // Token refresh failed, clear auth
        await authService.logout(tokens.refreshToken);
        return false;
      }
    }

    // Token is still valid
    set({
      isAuthenticated: true,
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate,
    });

    // Schedule token refresh
    authService.scheduleTokenRefresh(
      (newTokens) => get().setTokens(newTokens),
      () => get().logout()
    );

    return true;
  },

  clearError: () => set({ error: null }),

  setTokens: (tokens: AuthTokens) => {
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate,
    });
  },
}));
