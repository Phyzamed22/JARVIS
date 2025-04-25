// LiveKit integration for JARVIS
// This file exports all LiveKit-related functionality

// Export client functionality
export { getLiveKitClient } from './client';

// Export server functionality
export { getLiveKitServer } from './server';

// Export Voice Activity Detection (VAD)
export { getVoiceActivityDetection } from './vad';

// Export Wake Word Detection
export { getWakeWordDetection } from './wakeword';

/**
 * Initialize LiveKit integration
 * @param userId User ID for LiveKit rooms
 * @returns True if initialization was successful
 */
export async function initializeLiveKit(userId: string = 'default-user'): Promise<boolean> {
  try {
    // Import all required modules
    const { getLiveKitServer } = await import('./server');
    const { getLiveKitClient } = await import('./client');
    const { getVoiceActivityDetection } = await import('./vad');
    const { getWakeWordDetection } = await import('./wakeword');
    
    // Get instances
    const server = getLiveKitServer();
    const client = getLiveKitClient();
    const vad = getVoiceActivityDetection();
    const wakeWord = getWakeWordDetection({ userId });
    
    // Check if server is configured
    if (!server.isConfigured()) {
      console.warn('LiveKit server is not properly configured. Check your environment variables.');
      return false;
    }
    
    console.log('LiveKit integration initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize LiveKit integration:', error);
    return false;
  }
}