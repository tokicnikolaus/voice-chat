import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceMode } from '@/domain/types';

export interface SettingsState {
  // Voice settings
  voiceMode: VoiceMode;
  pttKey: string;
  masterVolume: number;
  userVolumes: Record<string, number>;

  // Audio device settings
  audioInputDeviceId: string | null;
  audioOutputDeviceId: string | null;

  // Sound effects
  soundEffectsEnabled: boolean;
  speakerVolume: number;
  microphoneSensitivity: number;

  // UI settings
  theme: 'dark' | 'light';

  // User preferences
  lastUsername: string;

  // Actions
  setVoiceMode: (mode: VoiceMode) => void;
  setPttKey: (key: string) => void;
  setMasterVolume: (volume: number) => void;
  setUserVolume: (userId: string, volume: number) => void;
  setAudioInputDeviceId: (deviceId: string | null) => void;
  setAudioOutputDeviceId: (deviceId: string | null) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setSpeakerVolume: (volume: number) => void;
  setMicrophoneSensitivity: (sensitivity: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLastUsername: (username: string) => void;
  resetVolumes: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      voiceMode: 'vad',
      pttKey: 'KeySpace',
      masterVolume: 100,
      userVolumes: {},
      audioInputDeviceId: null,
      audioOutputDeviceId: null,
      soundEffectsEnabled: true,
      speakerVolume: 100,
      microphoneSensitivity: 100,
      theme: 'dark',
      lastUsername: '',

      setVoiceMode: (mode) => set({ voiceMode: mode }),

      setPttKey: (key) => set({ pttKey: key }),

      setMasterVolume: (volume) => set({ masterVolume: Math.max(0, Math.min(100, volume)) }),

      setUserVolume: (userId, volume) =>
        set((state) => ({
          userVolumes: {
            ...state.userVolumes,
            [userId]: Math.max(0, Math.min(100, volume)),
          },
        })),

      setAudioInputDeviceId: (deviceId) => set({ audioInputDeviceId: deviceId }),

      setAudioOutputDeviceId: (deviceId) => set({ audioOutputDeviceId: deviceId }),

      setSoundEffectsEnabled: (enabled) => set({ soundEffectsEnabled: enabled }),

      setSpeakerVolume: (volume) => set({ speakerVolume: Math.max(0, Math.min(100, volume)) }),

      setMicrophoneSensitivity: (sensitivity) => set({ microphoneSensitivity: Math.max(0, Math.min(200, sensitivity)) }),

      setTheme: (theme) => set({ theme }),

      setLastUsername: (username) => set({ lastUsername: username }),

      resetVolumes: () =>
        set({
          masterVolume: 100,
          userVolumes: {},
        }),
    }),
    {
      name: 'voice-chat-settings',
    }
  )
);
