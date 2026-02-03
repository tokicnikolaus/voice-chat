import { useEffect, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRoomStore } from '@/application/stores/roomStore';
import { useSettingsStore } from '@/application/stores/settingsStore';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';

const PTT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Push-to-talk: Hold Space (or configured key) to transmit.
 * Mic is muted by default, unmutes while key is held.
 */
export function usePushToTalk() {
  const { setMuted, setSpeaking, userId } = useRoomStore();
  const { pttKey } = useSettingsStore();

  const [isPTTActive, setIsPTTActive] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const pttStartTimeRef = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.code !== pttKey) return;
      if (e.repeat) return;
      // Don't trigger PTT when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      e.preventDefault();

      // Set state immediately for visual feedback
      flushSync(() => {
        setIsPTTActive(true);
        setMuted(false);
        if (userId) {
          setSpeaking(userId, true);
        }
      });

      // Directly enable microphone for immediate audio
      try {
        const voiceService = getVoiceService();
        if (voiceService.isConnected()) {
          await voiceService.setMicrophoneEnabled(true);
        }
      } catch (error) {
        console.error('Failed to enable mic for PTT:', error);
      }

      pttStartTimeRef.current = Date.now();

      timeoutRef.current = window.setTimeout(() => {
        setShowTimeoutWarning(true);
      }, PTT_TIMEOUT_MS);
    },
    [pttKey, setMuted, setSpeaking, userId]
  );

  const handleKeyUp = useCallback(
    async (e: KeyboardEvent) => {
      if (e.code !== pttKey) return;
      if (!isPTTActive) return; // Only process if PTT was active

      e.preventDefault();

      // Set state immediately
      flushSync(() => {
        setIsPTTActive(false);
        setShowTimeoutWarning(false);
        setMuted(true);
        if (userId) {
          setSpeaking(userId, false);
        }
      });

      // Directly disable microphone
      try {
        const voiceService = getVoiceService();
        if (voiceService.isConnected()) {
          await voiceService.setMicrophoneEnabled(false);
        }
      } catch (error) {
        console.error('Failed to disable mic after PTT:', error);
      }

      pttStartTimeRef.current = null;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [pttKey, isPTTActive, setMuted, setSpeaking, userId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp]);

  const dismissTimeoutWarning = useCallback(() => {
    setShowTimeoutWarning(false);
  }, []);

  const getPTTDuration = useCallback(() => {
    if (!pttStartTimeRef.current) return 0;
    return Date.now() - pttStartTimeRef.current;
  }, []);

  return {
    isPTTActive,
    showTimeoutWarning,
    dismissTimeoutWarning,
    getPTTDuration,
  };
}
