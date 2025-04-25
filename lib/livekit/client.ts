// LiveKit client integration for JARVIS
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrackPublication,
  LocalTrack,
  Track,
  AudioPresets,
  VideoPresets,
  ConnectionState,
  ConnectionQuality,
  DisconnectReason,
  ParticipantEvent,
  TrackPublication,
  LocalTrackPublication
} from 'livekit-client';

import { getVoiceSettings } from '../voice-settings-service';

class LiveKitClient {
  private room: Room | null = null;
  private localParticipant: LocalParticipant | null = null;
  private isConnected: boolean = false;
  private isMicrophoneEnabled: boolean = false;
  private onSpeakingCallbacks: ((participant: RemoteParticipant | LocalParticipant, speaking: boolean) => void)[] = [];
  private onVolumeChangeCallbacks: ((participant: RemoteParticipant | LocalParticipant, volume: number) => void)[] = [];
  private onConnectedCallbacks: (() => void)[] = [];
  private onDisconnectedCallbacks: ((reason?: DisconnectReason) => void)[] = [];
  private onErrorCallbacks: ((error: Error) => void)[] = [];
  private onParticipantJoinedCallbacks: ((participant: RemoteParticipant) => void)[] = [];
  private onParticipantLeftCallbacks: ((participant: RemoteParticipant) => void)[] = [];
  private roomName: string = '';
  private serverUrl: string = '';
  private token: string = '';

  constructor() {
    // Initialize with default settings
    const settings = getVoiceSettings();
    this.serverUrl = settings.livekitServerUrl || 'ws://localhost:7880';
  }

  /**
   * Connect to a LiveKit room with optimized connection handling
   * @param token JWT token for authentication
   * @param roomName Name of the room to join
   * @param options Connection options
   */
  public async connect(token: string, roomName: string, options: {
    audio?: boolean;
    video?: boolean;
    maxRetries?: number;
  } = { audio: true, video: false, maxRetries: 3 }): Promise<boolean> {
    try {
      this.token = token;
      this.roomName = roomName;
      const maxRetries = options.maxRetries || 3;
      let retryCount = 0;
      let connected = false;

      // Create a new room instance with optimized settings
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Add optimized audio settings
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        // Reduce connection timeout for faster error detection
        connectionTimeout: 10000, // 10 seconds instead of default 15s
      });

      // Set up event listeners
      this.setupRoomEventListeners();

      // Connection retry loop
      while (!connected && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Retrying LiveKit connection (attempt ${retryCount} of ${maxRetries})...`);
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Connect to the room with optimized settings
          await this.room.connect(this.serverUrl, token, {
            autoSubscribe: true,
            rtcConfig: {
              // Use Google's public STUN servers for faster ICE negotiation
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
              // Reduce ICE candidate gathering time
              iceCandidatePoolSize: 10,
            }
          });

          connected = true;
        } catch (err) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw err; // Rethrow if we've exhausted retries
          }
        }
      }

      this.localParticipant = this.room.localParticipant;
      this.isConnected = true;

      // Enable microphone if requested - with faster timeout
      if (options.audio) {
        const micEnabled = await Promise.race([
          this.enableMicrophone(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000))
        ]);
        
        if (!micEnabled) {
          console.warn('Microphone enabling timed out, but continuing with connection');
        }
      }

      // Notify connected callbacks
      this.onConnectedCallbacks.forEach(callback => callback());

      return true;
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
      this.onErrorCallbacks.forEach(callback => callback(error as Error));
      return false;
    }
  }

  /**
   * Disconnect from the current room
   */
  public disconnect(): void {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
      this.localParticipant = null;
      this.isConnected = false;
      this.isMicrophoneEnabled = false;
    }
  }

  /**
   * Enable the microphone
   */
  public async enableMicrophone(): Promise<boolean> {
    if (!this.localParticipant) return false;

    try {
      await this.localParticipant.setMicrophoneEnabled(true);
      this.isMicrophoneEnabled = true;
      return true;
    } catch (error) {
      console.error('Error enabling microphone:', error);
      this.onErrorCallbacks.forEach(callback => callback(error as Error));
      return false;
    }
  }

  /**
   * Disable the microphone
   */
  public async disableMicrophone(): Promise<boolean> {
    if (!this.localParticipant) return false;

    try {
      await this.localParticipant.setMicrophoneEnabled(false);
      this.isMicrophoneEnabled = false;
      return true;
    } catch (error) {
      console.error('Error disabling microphone:', error);
      return false;
    }
  }

  /**
   * Check if the microphone is enabled
   */
  public isMicEnabled(): boolean {
    return this.isMicrophoneEnabled;
  }

  /**
   * Check if connected to a room
   */
  public isRoomConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current room name
   */
  public getRoomName(): string {
    return this.roomName;
  }

  /**
   * Get the local participant
   */
  public getLocalParticipant(): LocalParticipant | null {
    return this.localParticipant;
  }

  /**
   * Get all remote participants
   */
  public getRemoteParticipants(): RemoteParticipant[] {
    if (!this.room) return [];
    // Use the correct property to access participants
    return Array.from(this.room.getParticipants());
  }

  /**
   * Set up event listeners for the room
   */
  private setupRoomEventListeners(): void {
    if (!this.room) return;

    // Room connection events
    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      this.isConnected = false;
      this.onDisconnectedCallbacks.forEach(callback => callback(reason));
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.setupParticipantEventListeners(participant);
      this.onParticipantJoinedCallbacks.forEach(callback => callback(participant));
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.onParticipantLeftCallbacks.forEach(callback => callback(participant));
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
    });

    // Set up local participant events
    if (this.room.localParticipant) {
      this.setupParticipantEventListeners(this.room.localParticipant);
    }
  }

  /**
   * Set up event listeners for a participant
   */
  private setupParticipantEventListeners(participant: RemoteParticipant | LocalParticipant): void {
    // Speaking detection
    participant.on(ParticipantEvent.IsSpeakingChanged, () => {
      this.onSpeakingCallbacks.forEach(callback => 
        callback(participant, participant.isSpeaking));
    });

    // Audio level changes
    participant.on('audioLevelChanged', (level) => {
      this.onVolumeChangeCallbacks.forEach(callback => 
        callback(participant, level));
    });
  }

  /**
   * Register a callback for when a participant starts or stops speaking
   */
  public onSpeakingChanged(callback: (participant: RemoteParticipant | LocalParticipant, speaking: boolean) => void): void {
    this.onSpeakingCallbacks.push(callback);
  }

  /**
   * Register a callback for when a participant's audio volume changes
   */
  public onVolumeChanged(callback: (participant: RemoteParticipant | LocalParticipant, volume: number) => void): void {
    this.onVolumeChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for when connected to a room
   */
  public onConnected(callback: () => void): void {
    this.onConnectedCallbacks.push(callback);
  }

  /**
   * Register a callback for when disconnected from a room
   */
  public onDisconnected(callback: (reason?: DisconnectReason) => void): void {
    this.onDisconnectedCallbacks.push(callback);
  }

  /**
   * Register a callback for when an error occurs
   */
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallbacks.push(callback);
  }

  /**
   * Register a callback for when a participant joins the room
   */
  public onParticipantJoined(callback: (participant: RemoteParticipant) => void): void {
    this.onParticipantJoinedCallbacks.push(callback);
  }

  /**
   * Register a callback for when a participant leaves the room
   */
  public onParticipantLeft(callback: (participant: RemoteParticipant) => void): void {
    this.onParticipantLeftCallbacks.push(callback);
  }
}

// Singleton instance
let livekitClientInstance: LiveKitClient | null = null;

/**
 * Get the LiveKit client instance
 */
export function getLiveKitClient(): LiveKitClient {
  if (!livekitClientInstance) {
    livekitClientInstance = new LiveKitClient();
  }
  return livekitClientInstance;
}