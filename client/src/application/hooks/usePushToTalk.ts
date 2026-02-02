import { useEffect, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRoomStore } from '@/application/stores/roomStore';
import { useSettingsStore } from '@/application/stores/settingsStore';

const PTT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * When user is muted, holding the PTT key (default Space) temporarily unmutes (push-to-talk).
 * When unmuted normally, the key has no effect.
 */
export function usePushToTalk() {
  const { isMuted, setMuted, setSpeaking, userId } = useRoomStore();
  const { pttKey } = useSettingsStore();

  const [isPTTActive, setIsPTTActive] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const pttStartTimeRef = useRef<number | null>(null);
  const pttSessionRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== pttKey) return;
      if (e.repeat) return;
      // Only act when muted: Space (or PTT key) = temporary unmute
      if (!isMuted) return;

      e.preventDefault();

      flushSync(() => {
        pttSessionRef.current = true;
        setIsPTTActive(true);
        setMuted(false);
        if (userId) {
          setSpeaking(userId, true);
        }
      });
      pttStartTimeRef.current = Date.now();

      timeoutRef.current = window.setTimeout(() => {
        setShowTimeoutWarning(true);
      }, PTT_TIMEOUT_MS);
    },
    [isMuted, pttKey, setMuted, setSpeaking, userId]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== pttKey) return;

      const wasPTTSession = pttSessionRef.current;
      pttSessionRef.current = false;
      flushSync(() => {
        setIsPTTActive(false);
        setShowTimeoutWarning(false);
        if (wasPTTSession) {
          setMuted(true);
          if (userId) {
            setSpeaking(userId, false);
          }
        }
      });
      pttStartTimeRef.current = null;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [pttKey, setMuted, setSpeaking, userId]
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
    /** True when muted and holding PTT key to talk */
    isEnabled: isMuted,
  };
}
