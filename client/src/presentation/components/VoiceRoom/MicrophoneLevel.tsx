import { useEffect, useState, useRef } from 'react';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { useRoomStore } from '@/application/stores/roomStore';
import { createAudioAnalyser, LocalAudioTrack, LocalTrackPublication, Track } from 'livekit-client';

export function MicrophoneLevel() {
  const { currentRoom } = useRoomStore();
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentRoom) {
      setAudioLevel(0);
      return;
    }

    const voiceService = getVoiceService();
    const room = (voiceService as any).room; // Access private room property
    
    if (!room) {
      setAudioLevel(0);
      return;
    }

    // Function to get audio track
    const getAudioTrack = (): LocalAudioTrack | null => {
      if (!room.localParticipant) {
        return null;
      }
      const audioTracks = Array.from(room.localParticipant.audioTrackPublications.values()) as LocalTrackPublication[];
      const audioTrack = audioTracks.find((pub: LocalTrackPublication) => 
        pub.track && pub.source === Track.Source.Microphone
      )?.track as LocalAudioTrack | undefined;
      
      if (!audioTrack || !(audioTrack instanceof LocalAudioTrack)) {
        return null;
      }
      return audioTrack;
    };

    // Function to start analyser
    const startAnalyser = (track: LocalAudioTrack) => {
      let analyserHelper: ReturnType<typeof createAudioAnalyser> | null = null;
      
      try {
        analyserHelper = createAudioAnalyser(track, {
          fftSize: 256,
          smoothingTimeConstant: 0.8,
        });
      } catch (error) {
        console.error('Failed to create audio analyser:', error);
        setAudioLevel(0);
        return () => {};
      }

      const analyser = analyserHelper.analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserHelper) {
          setAudioLevel(0);
          return;
        }

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize to 0-100 (values are 0-255)
        const normalizedLevel = Math.min(100, Math.max(0, (average / 255) * 100));
        
        setAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Cleanup analyser
        if (analyserHelper) {
          analyserHelper.cleanup().catch(console.error);
        }
      };
    };

    // Try to get audio track immediately
    let audioTrack = getAudioTrack();
    let cleanup: (() => void) | null = null;
    
    // If track available, start analyser
    if (audioTrack) {
      cleanup = startAnalyser(audioTrack);
    } else {
      // Listen for connection state changes and retry
      const handleConnectionChange = (connected: boolean) => {
        if (connected) {
          // Retry getting track after connection
          setTimeout(() => {
            const track = getAudioTrack();
            if (track && !cleanup) {
              cleanup = startAnalyser(track);
            }
          }, 100);
        }
      };
      
      const unsubscribe = (voiceService as any).onConnectionStateChange?.(handleConnectionChange);
      
      // Also retry periodically
      const retryInterval = setInterval(() => {
        const track = getAudioTrack();
        if (track && !cleanup) {
          cleanup = startAnalyser(track);
          clearInterval(retryInterval);
          if (unsubscribe) unsubscribe();
        }
      }, 200);
      
      return () => {
        clearInterval(retryInterval);
        if (unsubscribe) unsubscribe();
        if (cleanup) cleanup();
      };
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentRoom]);

  // Visual bar representation
  const barHeight = Math.max(2, (audioLevel / 100) * 20);

  return (
    <div className="microphone-level">
      <div className="level-label">Mic Level</div>
      <div className="level-bar-container">
        <div 
          className="level-bar" 
          style={{ height: `${barHeight}px` }}
        />
      </div>
      <style>{`
        .microphone-level {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 14px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius-lg);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .level-label {
          font-weight: 500;
        }

        .level-bar-container {
          width: 4px;
          height: 20px;
          background: var(--bg-hover);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .level-bar {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: var(--accent-primary);
          border-radius: 2px;
          transition: height 0.1s ease-out;
          min-height: 2px;
        }
      `}</style>
    </div>
  );
}
