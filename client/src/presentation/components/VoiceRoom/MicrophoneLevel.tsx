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
    
    if (!room || !room.localParticipant) {
      setAudioLevel(0);
      return;
    }

    // Get local audio track
    const audioTracks = Array.from(room.localParticipant.audioTrackPublications.values()) as LocalTrackPublication[];
    const audioTrack = audioTracks.find((pub: LocalTrackPublication) => 
      pub.track && pub.source === Track.Source.Microphone
    )?.track as LocalAudioTrack | undefined;
    
    if (!audioTrack || !(audioTrack instanceof LocalAudioTrack)) {
      setAudioLevel(0);
      return;
    }

    // Use LiveKit's createAudioAnalyser
    let analyserHelper: ReturnType<typeof createAudioAnalyser> | null = null;
    
    try {
      analyserHelper = createAudioAnalyser(audioTrack, {
        fftSize: 256,
        smoothingTimeConstant: 0.8,
      });
    } catch (error) {
      console.error('Failed to create audio analyser:', error);
      setAudioLevel(0);
      return;
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
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .level-label {
          font-weight: 500;
          min-width: 60px;
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
