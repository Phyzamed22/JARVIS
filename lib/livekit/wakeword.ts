// Wake Word Detection integration with LiveKit
import { getLiveKitClient } from './client';
import { getLiveKitServer } from './server';
import { getVoiceActivityDetection } from './vad';

/**
 * Wake Word Detection class for activating JARVIS via voice
 */
export class WakeWordDetection {
  private isListening: boolean = false;
  private wakeWords: string[] = ['jarvis', 'hey jarvis', 'ok jarvis', 'hello jarvis'];
  private confidenceThreshold: number = 0.7;
  private onWakeWordCallbacks: (() => void)[] = [];
  private livekitClient = getLiveKitClient();
  private livekitServer = getLiveKitServer();
  private vad = getVoiceActivityDetection();
  private userId: string = 'default-user';
  private roomName: string = '';
  private isConnected: boolean = false;

  constructor(options?: {
    wakeWords?: string[];
    confidenceThreshold?: number;
    userId?: string;
  }) {
    if (options?.wakeWords) {
      this.wakeWords = options.wakeWords;
    }
    if (options?.confidenceThreshold) {
      this.confidenceThreshold = options.confidenceThreshold;
    }
    if (options?.userId) {
      this.userId = options.userId;
    }

    // Create a room name for wake word detection
    this.roomName = this.livekitServer.createRoomName(this.userId, 'wakeword');
  }

  /**
   * Start listening for wake words
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    try {
      // If not already connected to LiveKit, connect
      if (!this.isConnected) {
        // Generate a token for the wake word room
        const token = this.livekitServer.generateToken(this.userId, this.roomName);

        // Connect to the LiveKit room
        const connected = await this.livekitClient.connect(token, this.roomName, {
          audio: true,
          video: false,
        });

        if (!connected) {
          console.error('Failed to connect to LiveKit room for wake word detection');
          return false;
        }

        this.isConnected = true;
      }

      // Enable microphone if not already enabled
      if (!this.livekitClient.isMicEnabled()) {
        await this.livekitClient.enableMicrophone();
      }

      // Set up speech recognition for wake word detection
      this.setupSpeechRecognition();

      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting wake word detection:', error);
      return false;
    }
  }

  /**
   * Stop listening for wake words
   */
  public stopListening(): void {
    if (!this.isListening) return;

    // Disconnect from LiveKit room
    if (this.isConnected) {
      this.livekitClient.disconnect();
      this.isConnected = false;
    }

    this.isListening = false;
  }

  /**
   * Set up speech recognition for wake word detection
   */
  private setupSpeechRecognition(): void {
    // Use the VAD to detect when someone is speaking
    this.vad.onSpeakingStart((participant) => {
      // Only process if it's not the local participant (assistant)
      if (participant !== this.livekitClient.getLocalParticipant()) {
        // In a real implementation, we would use a more sophisticated wake word detection
        // For now, we'll simulate it by checking if the participant is speaking
        // and assume they might be saying the wake word
        
        // In a production system, you would:
        // 1. Capture the audio
        // 2. Run it through a wake word detection model (like Porcupine)
        // 3. Only trigger if the wake word is detected with high confidence
        
        // For this implementation, we'll just trigger the wake word callback
        // This would be replaced with actual wake word detection logic
        setTimeout(() => {
          if (this.isListening) {
            this.triggerWakeWord();
          }
        }, 1000); // Simulate processing time
      }
    });
  }

  /**
   * Trigger wake word detection callbacks
   */
  private triggerWakeWord(): void {
    this.onWakeWordCallbacks.forEach(callback => callback());
  }

  /**
   * Register a callback for when a wake word is detected
   */
  public onWakeWord(callback: () => void): void {
    this.onWakeWordCallbacks.push(callback);
  }

  /**
   * Check if wake word detection is active
   */
  public isActive(): boolean {
    return this.isListening;
  }

  /**
   * Set the wake words to listen for
   */
  public setWakeWords(wakeWords: string[]): void {
    this.wakeWords = wakeWords;
  }

  /**
   * Set the confidence threshold for wake word detection
   */
  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }
}

// Singleton instance
let wakeWordInstance: WakeWordDetection | null = null;

/**
 * Get the Wake Word Detection instance
 */
export function getWakeWordDetection(options?: {
  wakeWords?: string[];
  confidenceThreshold?: number;
  userId?: string;
}): WakeWordDetection {
  if (!wakeWordInstance) {
    wakeWordInstance = new WakeWordDetection(options);
  }
  return wakeWordInstance;
}