import { useEffect, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRoomStore } from '@/application/stores/roomStore';
import { useSettingsStore } from '@/application/stores/settingsStore';

const PTT_TIMEOUT_MS = 30000; // 30 seconds

export function usePushToTalk() {
  const { voiceMode, setMuted, setSpeaking, userId } = useRoomStore();
  const { pttKey } = useSettingsStore();

  const [isPTTActive, setIsPTTActive] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const pttStartTimeRef = useRef<number | null>(null);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (voiceMode !== 'ptt') return;
      if (e.code !== pttKey) return;
      if (e.repeat) return; // Ignore key repeat

      // Use flushSync to ensure immediate visual feedback for ALL state updates
      flushSync(() => {
        setIsPTTActive(true);
        setMuted(false); // Unmute immediately within the same sync flush
        // Mark local user as speaking immediately (don't wait for LiveKit's VAD)
        if (userId) {
          setSpeaking(userId, true);
        }
      });
      pttStartTimeRef.current = Date.now();

      // Set timeout warning
      timeoutRef.current = window.setTimeout(() => {
        setShowTimeoutWarning(true);
      }, PTT_TIMEOUT_MS);
    },
    [voiceMode, pttKey, setMuted, setSpeaking, userId]
  );

  // Handle key up
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (voiceMode !== 'ptt') return;
      if (e.code !== pttKey) return;

      // Use flushSync to ensure immediate visual feedback for ALL state updates
      flushSync(() => {
        setIsPTTActive(false);
        setShowTimeoutWarning(false);
        setMuted(true); // Mute immediately within the same sync flush
        // Mark local user as not speaking immediately
        if (userId) {
          setSpeaking(userId, false);
        }
      });
      pttStartTimeRef.current = null;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [voiceMode, pttKey, setMuted, setSpeaking, userId]
  );

  // Add event listeners
  useEffect(() => {
    if (voiceMode !== 'ptt') return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [voiceMode, handleKeyDown, handleKeyUp]);

  // Dismiss timeout warning
  const dismissTimeoutWarning = useCallback(() => {
    setShowTimeoutWarning(false);
  }, []);

  // Get PTT duration
  const getPTTDuration = useCallback(() => {
    if (!pttStartTimeRef.current) return 0;
    return Date.now() - pttStartTimeRef.current;
  }, []);

  return {
    isPTTActive,
    showTimeoutWarning,
    dismissTimeoutWarning,
    getPTTDuration,
    isEnabled: voiceMode === 'ptt',
  };
}
