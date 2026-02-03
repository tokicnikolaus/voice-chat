import { useEffect, useCallback, useRef } from 'react';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { useRoomStore } from '@/application/stores/roomStore';
import { useSettingsStore } from '@/application/stores/settingsStore';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';

export function useVoiceRoom() {
  const voiceService = useRef(getVoiceService());
  const {
    currentRoom,
    isMuted,
    setMuted,
    setSpeaking,
    setConnectionQuality,
  } = useRoomStore();
  const { masterVolume, userVolumes, audioInputDeviceId, audioOutputDeviceId, speakerVolume, setSpeakerVolume, microphoneSensitivity, setMicrophoneSensitivity } = useSettingsStore();
  
  // Store previous room ID to detect actual room changes
  const previousRoomIdRef = useRef<string | null>(null);
  // Track if we're currently connecting to prevent duplicate attempts
  const isConnectingRef = useRef<boolean>(false);
  // Track the current connection promise to prevent duplicate calls
  const connectionPromiseRef = useRef<Promise<void> | null>(null);

  const normalizeLivekitUrl = useCallback((url: string) => {
    try {
      const u = new URL(url);
      // Route LiveKit connections through nginx proxy to avoid mixed content issues
      // (HTTPS page cannot connect to ws:// directly in many browsers)
      if (['livekit', 'livekit-server'].includes(u.hostname) || u.port === '7880') {
        // Use the same host/port as the current page, with /livekit path
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // includes port if non-standard
        return `${protocol}//${host}/livekit`;
      }
      return u.toString();
    } catch {
      return url;
    }
  }, []);

  // Connect to LiveKit when room is joined
  useEffect(() => {
    if (!currentRoom) {
      // Room left - disconnect if we were connected
      if (previousRoomIdRef.current !== null) {
        console.log('🔄 Room left, disconnecting LiveKit...');
        const service = voiceService.current;
        const toneGen = getToneGenerator();
        if (toneGen.getIsPlaying()) {
          toneGen.stop();
          console.log('🛑 Background audio stopped - left room');
        }
        isConnectingRef.current = false;
        connectionPromiseRef.current = null; // Clear connection promise
        service.disconnect().catch(console.error);
        previousRoomIdRef.current = null;
      }
      return;
    }

    // Check if this is the same room (token/URL change for same room shouldn't trigger reconnect)
    const currentRoomId = currentRoom.id;
    const service = voiceService.current;
    
    // If we're already connecting to the same room, wait for that connection
    if (previousRoomIdRef.current === currentRoomId && connectionPromiseRef.current) {
      console.log('🔄 Same room ID and connection already in progress, waiting for existing promise...');
      // Still set up event handlers in case they were cleared
      const unsubSpeaking = service.onParticipantSpeaking((participantId, speaking) => {
        setSpeaking(participantId, speaking);
      });
      const unsubQuality = service.onConnectionQualityChange((participantId, quality) => {
        setConnectionQuality(participantId, quality);
      });
      // Wait for the existing connection
      connectionPromiseRef.current.then(() => {
        isConnectingRef.current = false;
      }).catch(() => {
        isConnectingRef.current = false;
      });
      return () => {
        unsubSpeaking();
        unsubQuality();
      };
    }

    if (previousRoomIdRef.current === currentRoomId && isConnectingRef.current) {
      console.log('🔄 Same room ID and already connecting (legacy check), skipping duplicate connection attempt');
      // Still set up event handlers in case they were cleared
      const unsubSpeaking = service.onParticipantSpeaking((participantId, speaking) => {
        setSpeaking(participantId, speaking);
      });
      const unsubQuality = service.onConnectionQualityChange((participantId, quality) => {
        setConnectionQuality(participantId, quality);
      });
      return () => {
        unsubSpeaking();
        unsubQuality();
      };
    }

    // If same room but not connecting, we're already connected - just set up handlers
    if (previousRoomIdRef.current === currentRoomId && !isConnectingRef.current && !connectionPromiseRef.current) {
      console.log('🔄 Same room ID and already connected, setting up event handlers only');
      const unsubSpeaking = service.onParticipantSpeaking((participantId, speaking) => {
        setSpeaking(participantId, speaking);
      });
      const unsubQuality = service.onConnectionQualityChange((participantId, quality) => {
        setConnectionQuality(participantId, quality);
      });
      return () => {
        unsubSpeaking();
        unsubQuality();
      };
    }

    // New room or reconnection needed
    previousRoomIdRef.current = currentRoomId;
    isConnectingRef.current = true;
    const lkUrl = normalizeLivekitUrl(currentRoom.livekitUrl);
    let isMounted = true;

    console.log('🔄 Attempting to connect to LiveKit...');
    console.log('LiveKit URL:', lkUrl);
    console.log('Token length:', currentRoom.livekitToken?.length || 0);
    console.log('Room ID:', currentRoomId);

    // Handle speaking events
    const unsubSpeaking = service.onParticipantSpeaking((participantId, speaking) => {
      if (isMounted) {
        setSpeaking(participantId, speaking);
      }
    });

    // Handle quality events
    const unsubQuality = service.onConnectionQualityChange((participantId, quality) => {
      if (isMounted) {
        setConnectionQuality(participantId, quality);
      }
    });
    
    // Store the connection promise to prevent duplicate calls
    const connectPromise = service.connect(lkUrl, currentRoom.livekitToken);
    connectionPromiseRef.current = connectPromise;
    
    connectPromise
      .then(async () => {
        isConnectingRef.current = false;
        connectionPromiseRef.current = null;
        if (!isMounted) {
          console.log('⚠️ LiveKit connected but component unmounted, disconnecting...');
          await service.disconnect();
          return;
        }
        console.log('✅ LiveKit room connected successfully (promise resolved)');

        // Enable microphone immediately on join so the permission popup shows right when
        // entering the room, and open mic is active without needing to click mute/unmute.
        const wantUnmuted = !useRoomStore.getState().isMuted;
        try {
          await service.setMicrophoneEnabled(wantUnmuted);
          if (wantUnmuted) {
            useRoomStore.getState().setMuted(false);
          }
        } catch (error: any) {
          console.error('Failed to enable microphone on join:', error);
          useRoomStore.getState().setMuted(true);
          let msg = 'Microphone access is needed for voice.';
          if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
            msg = 'Microphone permission is required. Please allow access and rejoin or unmute.';
          } else if (error?.message) {
            msg = error.message;
          }
          alert(msg);
        }

        // Apply saved output device setting only (not input - that would enable mic)
        try {
          if (audioOutputDeviceId) {
            await service.setAudioOutputDevice(audioOutputDeviceId);
          }
        } catch (error) {
          console.error('Failed to apply output device settings:', error);
        }

        // Initialize volume settings in VoiceService
        const voiceServiceAny = service as any;
        if (voiceServiceAny.updateVolumeSettings) {
          const currentMasterVolume = useSettingsStore.getState().masterVolume;
          const currentUserVolumes = useSettingsStore.getState().userVolumes;
          voiceServiceAny.updateVolumeSettings(currentMasterVolume, currentUserVolumes);
        }
        if (voiceServiceAny.setSpeakerVolume) {
          const currentSpeakerVolume = useSettingsStore.getState().speakerVolume;
          voiceServiceAny.setSpeakerVolume(currentSpeakerVolume);
        }
        if (voiceServiceAny.setMicrophoneSensitivity) {
          const currentMicrophoneSensitivity = useSettingsStore.getState().microphoneSensitivity;
          voiceServiceAny.setMicrophoneSensitivity(currentMicrophoneSensitivity);
        }
      })
      .catch((error) => {
        isConnectingRef.current = false;
        connectionPromiseRef.current = null;
        if (!isMounted) return;
        console.error('❌ Failed to connect to LiveKit voice room:', error);
        console.error('LiveKit URL:', lkUrl);
        console.error('Error details:', error);
        console.error('Error message:', error?.message);
        console.error('Error name:', error?.name);
        console.error('Error stack:', error?.stack);
        // The error object from LiveKit might have room/participant info
        // Log it for debugging but don't show alert as WebSocket handles reconnection
      });

    return () => {
      console.log('🔄 useVoiceRoom cleanup called - isMounted set to false');
      console.log('  Current room ID:', previousRoomIdRef.current);
      console.log('  Is connecting:', isConnectingRef.current);
      console.log('  Has connection promise:', !!connectionPromiseRef.current);
      
      isMounted = false;
      
      // Only unsubscribe from events - don't disconnect here
      // Disconnect happens when currentRoom becomes null (handled above)
      // But if we're in the middle of connecting, don't interfere
      if (!connectionPromiseRef.current && !isConnectingRef.current) {
        unsubSpeaking();
        unsubQuality();
      } else {
        console.log('  Skipping event unsubscription - connection in progress');
      }
    };
  }, [currentRoom?.id, currentRoom?.livekitToken, currentRoom?.livekitUrl, audioInputDeviceId, audioOutputDeviceId, normalizeLivekitUrl]);

  // Note: Background tone is now triggered by server via WebSocket message
  // when alone in room, so we don't need to check here anymore

  // Sync mute state
  useEffect(() => {
    const service = voiceService.current;
    if (service.isConnected() && service.getLocalParticipant()) {
      // Only try to enable/disable if user is interacting (not on initial connect)
      const currentMicState = service.isMicrophoneEnabled();
      const desiredMicState = !isMuted;
      
      // Only change if state differs (avoid unnecessary calls)
      if (currentMicState !== desiredMicState) {
        service.setMicrophoneEnabled(desiredMicState).catch((error: any) => {
          console.error('Failed to toggle microphone:', error);
          
          // Show user-friendly error messages
          let errorMessage = 'Failed to access microphone.';
          
          if (error?.message?.includes('HTTPS')) {
            errorMessage = 'Microphone access requires HTTPS. Please access the application via HTTPS (https://192.168.1.154:3000) or use localhost.';
          } else if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
            errorMessage = 'Microphone permission is required. Please allow microphone access in your browser settings and try again.';
          } else if (error?.message?.includes('device') || error?.message?.includes('microphone')) {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          alert(errorMessage);
          // Keep muted state if microphone access fails
          setMuted(true);
        });
      }
    }
  }, [isMuted, setMuted]);

  // Apply volume changes (respect speaker volume)
  useEffect(() => {
    const service = voiceService.current;
    
    // Update VoiceService with current volume settings and speaker volume
    // This ensures new tracks that subscribe will also get the correct volume
    const voiceServiceAny = service as any;
    if (voiceServiceAny.updateVolumeSettings) {
      voiceServiceAny.updateVolumeSettings(masterVolume, userVolumes);
    }
    if (voiceServiceAny.setSpeakerVolume) {
      voiceServiceAny.setSpeakerVolume(speakerVolume);
    }

    // Apply volumes to all existing participants (VoiceService will handle speaker volume internally)
    const participants = service.getRemoteParticipants();
    participants.forEach((_, participantId) => {
      const userVolume = userVolumes[participantId] ?? 100;
      const finalVolume = (masterVolume / 100) * (userVolume / 100);
      // setParticipantVolume now applies speaker volume multiplier internally
      service.setParticipantVolume(participantId, finalVolume);
    });

    // Also control background music volume based on speaker volume
    const toneGen = getToneGenerator();
    // Apply speaker volume to background music (0.2 is base volume, multiply by speakerVolume/100)
    const backgroundMusicVolume = 0.2 * (speakerVolume / 100);
    if (toneGen.getIsPlaying()) {
      toneGen.setVolume(backgroundMusicVolume);
    }
  }, [masterVolume, userVolumes, speakerVolume]);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const mute = useCallback(() => {
    setMuted(true);
  }, [setMuted]);

  const unmute = useCallback(() => {
    setMuted(false);
  }, [setMuted]);

  // Apply microphone sensitivity changes
  useEffect(() => {
    const service = voiceService.current;
    if (service.isConnected() && service.isMicrophoneEnabled()) {
      const voiceServiceAny = service as any;
      if (voiceServiceAny.setMicrophoneSensitivity) {
        voiceServiceAny.setMicrophoneSensitivity(microphoneSensitivity).catch((error: any) => {
          console.error('Failed to set microphone sensitivity:', error);
        });
      }
    }
  }, [microphoneSensitivity]);

  return {
    isMuted,
    toggleMute,
    mute,
    unmute,
    speakerVolume,
    setSpeakerVolume,
    microphoneSensitivity,
    setMicrophoneSensitivity,
  };
}
