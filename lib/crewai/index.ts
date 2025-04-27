/**
 * CrewAI Integration for JARVIS
 * 
 * This module integrates CrewAI with JARVIS to enable intelligent task management
 * through voice commands. It connects LiveKit's audio transcription with CrewAI agents
 * that perform CRUD operations on a Notion database and generate voice responses
 * through ElevenLabs. The system uses Groq LLM for natural language understanding
 * and intent detection to accurately interpret user commands.
 */

import { getLiveKitClient } from '@/lib/livekit';
import crewAITaskManager from './task-manager';
import transcriptionService from './transcription-service';

/**
 * Initialize the CrewAI integration
 * @param userId User ID for the current session
 * @returns True if initialization was successful
 */
export async function initializeCrewAI(userId: string): Promise<boolean> {
  try {
    console.log('Initializing CrewAI integration...');
    
    // Check if LiveKit is initialized
    const livekitClient = getLiveKitClient();
    if (!livekitClient) {
      console.error('LiveKit client is not initialized. Please initialize LiveKit first.');
      return false;
    }
    
    // Initialize the transcription service
    const transcriptionInitialized = await transcriptionService.initialize(userId);
    if (!transcriptionInitialized) {
      console.error('Failed to initialize transcription service');
      return false;
    }
    
    // Start listening for voice commands
    transcriptionService.startListening();
    
    console.log('CrewAI integration initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing CrewAI integration:', error);
    return false;
  }
}

/**
 * Stop the CrewAI integration
 * @returns True if successfully stopped
 */
export function stopCrewAI(): boolean {
  try {
    // Stop listening for voice commands
    transcriptionService.stopListening();
    
    console.log('CrewAI integration stopped');
    return true;
  } catch (error) {
    console.error('Error stopping CrewAI integration:', error);
    return false;
  }
}

// Export the task manager and transcription service
export { crewAITaskManager, transcriptionService };