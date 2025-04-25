// LiveKit server integration for JARVIS
import { AccessToken } from 'livekit-server-sdk';
import { getVoiceSettings } from '../voice-settings-service';

/**
 * LiveKit server integration for handling JWT token generation and room management
 */
export class LiveKitServer {
  private apiKey: string;
  private apiSecret: string;
  private serverUrl: string;

  constructor() {
    // Get settings from voice settings service
    const settings = getVoiceSettings();
    this.apiKey = settings.livekitApiKey || 'devkey';
    this.apiSecret = settings.livekitApiSecret || 'devsecret';
    this.serverUrl = settings.livekitServerUrl || 'ws://localhost:7880';
  }

  /**
   * Generate a JWT token for LiveKit authentication
   * @param identity User identity (unique identifier)
   * @param roomName Name of the room to join
   * @param ttl Time to live in seconds (default: 1 hour)
   * @returns JWT token string
   */
  public generateToken(identity: string, roomName: string, ttl: number = 3600): string {
    try {
      // Create a new access token
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity,
        ttl,
      });

      // Add grants for the token
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      // Generate the JWT token
      return token.toJwt();
    } catch (error) {
      console.error('Error generating LiveKit token:', error);
      throw error;
    }
  }

  /**
   * Get the LiveKit server URL
   * @returns LiveKit server URL
   */
  public getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Check if the LiveKit server is configured
   * @returns True if the server is configured
   */
  public isConfigured(): boolean {
    return !!this.apiKey && !!this.apiSecret && !!this.serverUrl;
  }

  /**
   * Create a room name for a user session
   * @param userId User ID or identifier
   * @param sessionId Optional session ID
   * @returns Room name string
   */
  public createRoomName(userId: string, sessionId?: string): string {
    // Create a deterministic room name based on user ID and optional session ID
    if (sessionId) {
      return `jarvis-${userId}-${sessionId}`;
    }
    return `jarvis-${userId}-${Date.now()}`;
  }
}

// Singleton instance
let livekitServerInstance: LiveKitServer | null = null;

/**
 * Get the LiveKit server instance
 */
export function getLiveKitServer(): LiveKitServer {
  if (!livekitServerInstance) {
    livekitServerInstance = new LiveKitServer();
  }
  return livekitServerInstance;
}