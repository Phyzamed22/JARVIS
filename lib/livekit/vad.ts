// Voice Activity Detection (VAD) integration with LiveKit
import { RemoteParticipant, LocalParticipant } from 'livekit-client';
import { getLiveKitClient } from './client';

/**
 * Voice Activity Detection (VAD) class for handling speaking detection
 * and interruption handling with LiveKit
 */
export class VoiceActivityDetection {
  private speakingThreshold: number = 0.08; // Reduced threshold for better sensitivity
  private silenceTimeout: number = 800; // Reduced time to detect silence faster
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeaking: boolean = false;
  private consecutiveVolumeReadings: number = 0; // Track consecutive readings above threshold
  private minConsecutiveReadings: number = 2; // Minimum consecutive readings to trigger speaking
  private onSpeakingStartCallbacks: ((participant: RemoteParticipant | LocalParticipant) => void)[] = [];
  private onSpeakingStopCallbacks: ((participant: RemoteParticipant | LocalParticipant) => void)[] = [];
  private onSilenceCallbacks: (() => void)[] = [];
  private onInterruptionCallbacks: ((participant: RemoteParticipant) => void)[] = [];
  private livekitClient = getLiveKitClient();
  private assistantIsSpeaking: boolean = false;
  private noiseFloor: number = 0.03; // Baseline noise level to adapt to environment
  private adaptiveThreshold: number = 0.08; // Starting threshold that will adapt

  constructor(options?: {
    speakingThreshold?: number;
    silenceTimeout?: number;
    minConsecutiveReadings?: number;
  }) {
    if (options?.speakingThreshold) {
      this.speakingThreshold = options.speakingThreshold;
      this.adaptiveThreshold = options.speakingThreshold;
    }
    if (options?.silenceTimeout) {
      this.silenceTimeout = options.silenceTimeout;
    }
    if (options?.minConsecutiveReadings) {
      this.minConsecutiveReadings = options.minConsecutiveReadings;
    }

    // Set up LiveKit event listeners
    this.setupLiveKitListeners();
  }

  /**
   * Set up LiveKit event listeners for speaking detection
   */
  private setupLiveKitListeners(): void {
    // Listen for speaking changes
    this.livekitClient.onSpeakingChanged((participant, speaking) => {
      // Check if this is a remote participant (user) or local participant (assistant)
      const isLocalParticipant = participant === this.livekitClient.getLocalParticipant();
      
      if (isLocalParticipant) {
        // Track when the assistant is speaking
        this.assistantIsSpeaking = speaking;
      } else {
        // Handle user speaking
        if (speaking) {
          this.handleSpeakingStart(participant);
          
          // Check for interruption
          if (this.assistantIsSpeaking) {
            this.handleInterruption(participant as RemoteParticipant);
          }
        } else {
          this.handleSpeakingStop(participant);
        }
      }
    });

    // Listen for volume changes to detect low-volume speech
    this.livekitClient.onVolumeChanged((participant, volume) => {
      const isLocalParticipant = participant === this.livekitClient.getLocalParticipant();
      
      if (!isLocalParticipant && volume > this.speakingThreshold) {
        // Volume above threshold but not marked as speaking
        if (!participant.isSpeaking) {
          this.handleSpeakingStart(participant);
          
          // Check for interruption
          if (this.assistantIsSpeaking) {
            this.handleInterruption(participant as RemoteParticipant);
          }
        }
      }
    });
  }

  /**
   * Handle when a participant starts speaking
   */
  private handleSpeakingStart(participant: RemoteParticipant | LocalParticipant): void {
    // Clear any existing silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (!this.isSpeaking) {
      this.isSpeaking = true;
      this.onSpeakingStartCallbacks.forEach(callback => callback(participant));
    }
  }

  /**
   * Set whether the assistant is currently speaking
   * This is used to detect interruptions
   */
  public setAssistantSpeaking(speaking: boolean): void {
    this.assistantIsSpeaking = speaking;
  }

  /**
   * Handle when a participant stops speaking
   */
  private handleSpeakingStop(participant: RemoteParticipant | LocalParticipant): void {
    // Set a timer to detect silence after speaking stops
    if (!this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        this.isSpeaking = false;
        this.onSpeakingStopCallbacks.forEach(callback => callback(participant));
        this.onSilenceCallbacks.forEach(callback => callback());
        this.silenceTimer = null;
      }, this.silenceTimeout);
    }
  }

  /**
   * Handle interruption when user speaks while assistant is speaking
   */
  private handleInterruption(participant: RemoteParticipant): void {
    this.onInterruptionCallbacks.forEach(callback => callback(participant));
  }

  /**
   * Register a callback for when speaking starts
   */
  public onSpeakingStart(callback: (participant: RemoteParticipant | LocalParticipant) => void): void {
    this.onSpeakingStartCallbacks.push(callback);
  }

  /**
   * Register a callback for when speaking stops
   */
  public onSpeakingStop(callback: (participant: RemoteParticipant | LocalParticipant) => void): void {
    this.onSpeakingStopCallbacks.push(callback);
  }
  
  /**
   * Process audio data to detect speech with adaptive thresholds
   * @param audioData Float32Array of audio samples
   * @returns True if speech is detected
   */
  public processAudioData(audioData: Float32Array): boolean {
    // Calculate RMS volume with optimized processing
    let sum = 0;
    const stride = 2; // Process every other sample for efficiency
    for (let i = 0; i < audioData.length; i += stride) {
      sum += audioData[i] * audioData[i];
    }
    const samplesProcessed = Math.ceil(audioData.length / stride);
    const rms = Math.sqrt(sum / samplesProcessed);
    
    // Update noise floor with slow adaptation (low-pass filter)
    if (rms < this.adaptiveThreshold && rms > 0.01) {
      // Only update noise floor if current level is above minimum detectable level
      // but below our current threshold (likely background noise)
      this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
      
      // Dynamically adjust threshold based on noise floor
      this.adaptiveThreshold = Math.max(this.speakingThreshold, this.noiseFloor * 2.5);
    }
    
    // Check if volume is above adaptive threshold with consecutive readings
    if (rms > this.adaptiveThreshold) {
      this.consecutiveVolumeReadings++;
      
      // Only trigger speaking after multiple consecutive readings above threshold
      // This helps filter out brief noises
      if (this.consecutiveVolumeReadings >= this.minConsecutiveReadings) {
        this.handleSpeakingStart(this.livekitClient.getLocalParticipant());
        return true;
      }
    } else {
      // Reset consecutive readings counter if volume drops below threshold
      this.consecutiveVolumeReadings = 0;
    }
    
    return false;
  }

  /**
   * Register a callback for when silence is detected after speaking
   */
  public onSilence(callback: () => void): void {
    this.onSilenceCallbacks.push(callback);
  }

  /**
   * Register a callback for when user interrupts the assistant
   */
  public onInterruption(callback: (participant: RemoteParticipant) => void): void {
    this.onInterruptionCallbacks.push(callback);
  }

  /**
   * Check if someone is currently speaking
   */
  public isSomeOneSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if the assistant is currently speaking
   */
  public isAssistantSpeaking(): boolean {
    return this.assistantIsSpeaking;
  }

  /**
   * Set the speaking threshold
   */
  public setSpeakingThreshold(threshold: number): void {
    this.speakingThreshold = threshold;
  }

  /**
   * Set the silence timeout
   */
  public setSilenceTimeout(timeout: number): void {
    this.silenceTimeout = timeout;
  }
}

// Singleton instance
let vadInstance: VoiceActivityDetection | null = null;

/**
 * Get the Voice Activity Detection instance
 */
export function getVoiceActivityDetection(options?: {
  speakingThreshold?: number;
  silenceTimeout?: number;
}): VoiceActivityDetection {
  if (!vadInstance) {
    vadInstance = new VoiceActivityDetection(options);
  }
  return vadInstance;
}