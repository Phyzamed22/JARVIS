// Voice Activity Detection (VAD) integration with LiveKit
import { RemoteParticipant, LocalParticipant } from 'livekit-client';
import { getLiveKitClient } from './client';

/**
 * Voice Activity Detection (VAD) class for handling speaking detection
 * and interruption handling with LiveKit
 */
export class VoiceActivityDetection {
  private speakingThreshold: number = 0.08; // Reduced threshold for better sensitivity
  private silenceTimeout: number = 600; // Further reduced time to detect silence faster (was 800ms)
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
  private selfVoiceDetection: boolean = true; // Enable detection of assistant's own voice
  private recentAudioBuffer: Float32Array[] = []; // Buffer to store recent audio for echo detection
  private bufferSize: number = 5; // Number of audio frames to keep in buffer

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
   * Process audio data to detect voice activity with echo cancellation
   * @param audioData Float32Array of audio samples
   * @returns True if voice activity is detected
   */
  public processAudioData(audioData: Float32Array): boolean {
    // Store audio in buffer for echo detection
    this.updateAudioBuffer(audioData);
    
    // If assistant is speaking and self-voice detection is enabled,
    // check if this audio might be echo from the assistant's own voice
    if (this.assistantIsSpeaking && this.selfVoiceDetection) {
      if (this.detectEcho(audioData)) {
        // This is likely echo from the assistant's own voice, ignore it
        return false;
      }
    }
    
    // Calculate energy level (volume) of the audio data with optimized algorithm
    let sum = 0;
    // Process only a subset of samples for efficiency
    const stride = 2; // Skip every other sample
    for (let i = 0; i < audioData.length; i += stride) {
      sum += audioData[i] * audioData[i];
    }
    const samplesProcessed = Math.ceil(audioData.length / stride);
    const rms = Math.sqrt(sum / samplesProcessed);
    
    // Adapt threshold based on environment noise
    this.adaptNoiseFloor(rms);
    
    // Check if volume is above threshold
    if (rms > this.adaptiveThreshold) {
      this.consecutiveVolumeReadings++;
      
      // Only trigger speaking after consecutive readings above threshold
      if (this.consecutiveVolumeReadings >= this.minConsecutiveReadings) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          // Trigger speaking start callbacks
          const localParticipant = this.livekitClient.getLocalParticipant();
          if (localParticipant) {
            this.onSpeakingStartCallbacks.forEach(callback => callback(localParticipant));
          }
        }
        
        // Clear any existing silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      }
    } else {
      // Reset consecutive readings counter
      this.consecutiveVolumeReadings = 0;
      
      // If we were speaking, start silence timer
      if (this.isSpeaking && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this.isSpeaking = false;
          // Trigger speaking stop callbacks
          const localParticipant = this.livekitClient.getLocalParticipant();
          if (localParticipant) {
            this.onSpeakingStopCallbacks.forEach(callback => callback(localParticipant));
          }
          // Trigger silence callbacks
          this.onSilenceCallbacks.forEach(callback => callback());
          this.silenceTimer = null;
        }, this.silenceTimeout);
      }
    }
    
    return this.isSpeaking;
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
  
  /**
   * Adapt noise floor based on ambient noise level
   * @param currentLevel Current audio level
   */
  private adaptNoiseFloor(currentLevel: number): void {
    // If current level is below threshold and not too low (to avoid silence)
    if (currentLevel < this.adaptiveThreshold && currentLevel > 0.01) {
      // Slowly adapt noise floor towards current level
      this.noiseFloor = this.noiseFloor * 0.95 + currentLevel * 0.05;
      
      // Update adaptive threshold based on noise floor
      this.adaptiveThreshold = this.noiseFloor * 2.5;
      
      // Ensure threshold doesn't go below minimum
      if (this.adaptiveThreshold < this.speakingThreshold) {
        this.adaptiveThreshold = this.speakingThreshold;
      }
    }
  }
  
  /**
   * Adjust the VAD threshold dynamically (used during audio ducking)
   * @param newThreshold New threshold value
   */
  public adjustThreshold(newThreshold: number): void {
    this.speakingThreshold = newThreshold;
    // Also update adaptive threshold if it's lower than the new threshold
    if (this.adaptiveThreshold < newThreshold) {
      this.adaptiveThreshold = newThreshold;
    }
  }
  
  /**
   * Update the audio buffer with new audio data
   * @param audioData New audio data
   */
  private updateAudioBuffer(audioData: Float32Array): void {
    // Remove oldest audio frame
    this.recentAudioBuffer.shift();
    // Add new audio frame
    this.recentAudioBuffer.push(audioData);
  }
  
  /**
   * Detect if current audio is echo from assistant's own voice
   * @param currentAudio Current audio frame
   * @returns True if echo is detected
   */
  private detectEcho(currentAudio: Float32Array): boolean {
    // Simple echo detection based on energy level and pattern matching
    if (!this.assistantIsSpeaking) return false;
    
    // Calculate energy of current frame
    let currentEnergy = 0;
    for (let i = 0; i < currentAudio.length; i++) {
      currentEnergy += currentAudio[i] * currentAudio[i];
    }
    currentEnergy = Math.sqrt(currentEnergy / currentAudio.length);
    
    // If energy is very high during assistant speech, likely an echo
    const echoThreshold = this.adaptiveThreshold * 1.5;
    if (currentEnergy > echoThreshold) {
      // Check for pattern similarity with recent frames
      // This is a simplified approach - a real implementation would use more sophisticated
      // signal processing techniques like cross-correlation
      let similarityCount = 0;
      
      for (let i = 0; i < this.recentAudioBuffer.length - 1; i++) {
        const prevFrame = this.recentAudioBuffer[i];
        if (prevFrame.length === 0) continue;
        
        // Calculate similarity between frames
        const similarity = this.calculateFrameSimilarity(prevFrame, currentAudio);
        if (similarity > 0.7) { // High similarity threshold
          similarityCount++;
        }
      }
      
      // If we have multiple similar frames, likely an echo
      return similarityCount >= 2;
    }
    
    return false;
  }
  
  /**
   * Calculate similarity between two audio frames
   * @param frame1 First audio frame
   * @param frame2 Second audio frame
   * @returns Similarity score (0-1)
   */
  private calculateFrameSimilarity(frame1: Float32Array, frame2: Float32Array): number {
    // Use a simplified correlation calculation
    const minLength = Math.min(frame1.length, frame2.length);
    if (minLength === 0) return 0;
    
    // Sample only a portion of the frames for efficiency
    const sampleSize = Math.min(minLength, 128);
    const stride = Math.floor(minLength / sampleSize);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = i * stride;
      dotProduct += frame1[idx] * frame2[idx];
      magnitude1 += frame1[idx] * frame1[idx];
      magnitude2 += frame2[idx] * frame2[idx];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    // Return cosine similarity
    return Math.abs(dotProduct / (magnitude1 * magnitude2));
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