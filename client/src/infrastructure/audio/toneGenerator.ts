import quietFieldsAudio from '@/assets/quiet-fields.mp3';

/**
 * Plays background audio when user is alone in a room
 */
export class ToneGenerator {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private audioUrl: string = '';
  private audioContext: AudioContext | null = null;

  constructor() {
    // Load the audio file
    this.audioUrl = quietFieldsAudio;
  }

  /**
   * Unlock AudioContext without playing music (for browsers that require user interaction)
   */
  async unlock(): Promise<void> {
    try {
      // Create AudioContext if it doesn't exist
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume if suspended (required after user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('✅ AudioContext unlocked, state:', this.audioContext.state);
    } catch (error) {
      console.warn('⚠️ AudioContext unlock failed:', error);
    }
  }

  /**
   * Start playing the background audio
   * @param _frequency Not used (kept for compatibility)
   * @param _duration Not used - audio loops continuously
   * @param volume Volume from 0 to 1 (default: 0.3 for background music)
   */
  async start(_frequency: number = 440, _duration?: number, volume: number = 0.3): Promise<void> {
    // If already playing, don't restart
    if (this.isPlaying && this.audioElement && !this.audioElement.paused) {
      console.log('Background audio already playing, skipping start');
      return;
    }

    // Stop any existing audio
    this.stop();

    try {
      // Create audio element if it doesn't exist
      if (!this.audioElement) {
        this.audioElement = new Audio(this.audioUrl);
        this.audioElement.loop = true; // Loop the audio continuously
        this.audioElement.preload = 'auto';
        
        // Handle errors
        this.audioElement.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          this.isPlaying = false;
        });
      }

      // Set volume
      this.audioElement.volume = Math.max(0, Math.min(1, volume));

      // Play the audio
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        console.log(`✅ Background audio playing: volume: ${volume}, looping: true`);
      } catch (err: any) {
        // Browser autoplay policy - user interaction required
        console.warn('⚠️ Audio play failed (user interaction may be required):', err.message || err);
        throw new Error('Audio cannot be played - user interaction required');
      }
    } catch (error: any) {
      console.error('Failed to start background audio:', error);
      throw error;
    }
  }

  /**
   * Stop playing the background audio
   */
  stop(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0; // Reset to beginning
        // Remove the audio element completely to ensure cleanup
        this.audioElement.src = '';
        this.audioElement = null;
      }
      this.isPlaying = false;
      console.log('Background audio stopped');
    } catch (error) {
      console.error('Failed to stop background audio:', error);
      // Force cleanup even on error
      this.audioElement = null;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying && this.audioElement !== null && !this.audioElement.paused;
  }
}

// Singleton instance
let instance: ToneGenerator | null = null;

export function getToneGenerator(): ToneGenerator {
  if (!instance) {
    instance = new ToneGenerator();
  }
  return instance;
}
