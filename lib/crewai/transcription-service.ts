/**
 * CrewAI Transcription Service
 * 
 * This module connects LiveKit's audio transcription capabilities with the CrewAI
 * task manager to enable voice-driven task management. It uses Groq LLM for natural
 * language understanding and intent detection.
 */

import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client';
import { getLiveKitClient } from '@/lib/livekit';
import crewAITaskManager from './task-manager';
import { getVoiceSettings } from '@/lib/voice-settings-service';
import { chatWithGroq, Message } from '@/lib/groq';
import { generateVoiceResponse } from '@/lib/elevenlabs';
import { containsTaskWakeWord, extractTaskCommand, shouldRedirectToTasksWindow } from './task-wake-words';

class TranscriptionService {
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private livekitRoom: Room | null = null;
  private userId: string = '';
  private commandBuffer: string = '';
  private commandTimeoutId: NodeJS.Timeout | null = null;
  private processingCommand: boolean = false;
  
  /**
   * Initialize the transcription service
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      this.userId = userId;
      
      // Get LiveKit client
      const livekitClient = getLiveKitClient();
      if (!livekitClient) {
        console.error('LiveKit client is not initialized');
        return false;
      }
      
      this.livekitRoom = livekitClient;
      
      // Initialize CrewAI Task Manager
      const taskManagerInitialized = await crewAITaskManager.initialize(userId);
      if (!taskManagerInitialized) {
        console.error('Failed to initialize CrewAI Task Manager');
        return false;
      }
      
      // Set up event listeners for transcription
      this.setupTranscriptionListeners();
      
      console.log('Transcription service initialized successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing transcription service:', error);
      return false;
    }
  }
  
  /**
   * Start listening for voice commands
   */
  startListening(): boolean {
    if (!this.isInitialized || !this.livekitRoom) {
      console.error('Transcription service is not initialized');
      return false;
    }
    
    if (this.isListening) {
      console.log('Transcription service is already listening');
      return true;
    }
    
    console.log('Starting to listen for voice commands');
    this.isListening = true;
    return true;
  }
  
  /**
   * Stop listening for voice commands
   */
  stopListening(): boolean {
    if (!this.isInitialized) {
      console.error('Transcription service is not initialized');
      return false;
    }
    
    if (!this.isListening) {
      console.log('Transcription service is not listening');
      return true;
    }
    
    console.log('Stopping listening for voice commands');
    this.isListening = false;
    this.clearCommandBuffer();
    return true;
  }
  
  /**
   * Set up event listeners for transcription
   */
  private setupTranscriptionListeners(): void {
    if (!this.livekitRoom) return;
    
    // Listen for data messages that contain transcription
    this.livekitRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, kind?: string) => {
      if (!this.isListening) return;
      
      try {
        // Convert binary data to string
        const dataString = new TextDecoder().decode(payload);
        const data = JSON.parse(dataString);
        
        // Check if this is a transcription message
        if (data.type === 'transcription') {
          this.handleTranscription(data.text, data.isFinal || false);
        }
      } catch (error) {
        console.error('Error processing transcription data:', error);
      }
    });
    
    // Alternative: If using a custom track for transcription
    this.livekitRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication, participant: RemoteParticipant) => {
      if (track.kind === 'audio' && participant.identity.includes('transcriber')) {
        console.log('Subscribed to transcriber audio track');
        // Handle transcriber-specific logic if needed
      }
    });
  }
  
  /**
   * Handle transcription data
   */
  private handleTranscription(text: string, isFinal: boolean): void {
    if (!text || !this.isListening) return;
    
    // Add to command buffer
    this.commandBuffer += ' ' + text;
    this.commandBuffer = this.commandBuffer.trim();
    
    console.log(`Transcription ${isFinal ? '(final)' : '(interim)'}: ${text}`);
    
    // If this is a final transcription, process after a short delay
    if (isFinal) {
      // Clear any existing timeout
      if (this.commandTimeoutId) {
        clearTimeout(this.commandTimeoutId);
      }
      
      // Set a timeout to process the command
      this.commandTimeoutId = setTimeout(() => {
        this.processCommandBuffer();
      }, 1000); // 1 second delay to allow for additional transcription segments
    }
  }
  
  /**
   * Process the command buffer
   */
  private async processCommandBuffer(): Promise<void> {
    if (this.processingCommand || !this.commandBuffer) return;
    
    this.processingCommand = true;
    
    try {
      const command = this.commandBuffer;
      console.log(`Processing command: "${command}"`);
      
      // Check if the command contains a task-specific wake word
      if (containsTaskWakeWord(command)) {
        console.log(`Detected task-specific wake word in: "${command}"`);
        const taskCommand = extractTaskCommand(command);
        
        // Process the task command directly
        console.log(`Processing task command: "${taskCommand}"`);
        const response = await crewAITaskManager.processCommand(taskCommand);
        
        // If task manager couldn't handle it, provide feedback
        if (!response.success) {
          const errorMessage = `I couldn't process your task command: ${response.message}`;
          console.log(errorMessage);
          await generateVoiceResponse(errorMessage);
        } else {
          // Task was created successfully
          await generateVoiceResponse(response.message);
          
          // Redirect to tasks window will be handled by the UI
          console.log('Task created successfully, should redirect to tasks window');
        }
        
        // Command processed as task, no need to check general wake word
        return;
      }
      
      // Check if the command contains the general wake word
      const settings = getVoiceSettings();
      const wakeWord = settings.wakeWord.toLowerCase();
      
      if (command.toLowerCase().includes(wakeWord)) {
        // Extract the actual command after the wake word
        const commandParts = command.toLowerCase().split(wakeWord);
        if (commandParts.length > 1) {
          const actualCommand = commandParts[1].trim();
          
          // Use Groq LLM to understand the intent of the command
          const intent = await this.analyzeCommandIntent(actualCommand);
          
          if (intent.isTaskCommand) {
            console.log(`Detected task command: "${actualCommand}" with intent: ${intent.type}`);
            const response = await crewAITaskManager.processCommand(actualCommand);
            
            // If task manager couldn't handle it but we detected task intent, provide feedback
            if (!response.success) {
              const errorMessage = `I couldn't process your task command: ${response.message}`;
              console.log(errorMessage);
              await generateVoiceResponse(errorMessage);
            }
          } else {
            console.log(`Command not recognized as task-related: "${actualCommand}"`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing command buffer:', error);
      try {
        await generateVoiceResponse("I'm sorry, I encountered an error processing your command.");
      } catch (voiceError) {
        console.error('Error generating voice response:', voiceError);
      }
    } finally {
      // Clear the command buffer and reset processing flag
      this.clearCommandBuffer();
      this.processingCommand = false;
    }
  }
  
  /**
   * Analyze command intent using Groq LLM
   */
  private async analyzeCommandIntent(command: string): Promise<{ isTaskCommand: boolean; type?: string; confidence?: number }> {
    try {
      // Define the system prompt for intent detection
      const systemPrompt = `You are an AI assistant that analyzes voice commands to detect task management intents.
      
      Task management intents include:
      - create: Adding or creating a new task
      - read: Listing, showing, or retrieving tasks
      - update: Changing, modifying, or updating existing tasks
      - delete: Removing or deleting tasks
      - search: Finding or looking for specific tasks
      
      Analyze the user's command and determine if it's related to task management.
      Return a JSON object with the following structure:
      {
        "isTaskCommand": boolean,
        "type": "create" | "read" | "update" | "delete" | "search" | null,
        "confidence": number (0-1)
      }`;
      
      // Create message for Groq LLM
      const messages: Message[] = [
        { role: 'user', content: `Analyze this command: "${command}"` }
      ];
      
      // Get response from Groq LLM
      const response = await chatWithGroq(messages, { systemPrompt, temperature: 0.1 });
      
      // Parse the response
      try {
        // Extract JSON from the response text
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intentData = JSON.parse(jsonMatch[0]);
          return {
            isTaskCommand: intentData.isTaskCommand || false,
            type: intentData.type || undefined,
            confidence: intentData.confidence || 0
          };
        }
      } catch (parseError) {
        console.error('Error parsing intent response:', parseError);
      }
      
      // Fallback to keyword-based detection if LLM parsing fails
      return { isTaskCommand: this.isTaskCommand(command) };
    } catch (error) {
      console.error('Error analyzing command intent with Groq:', error);
      // Fallback to keyword-based detection
      return { isTaskCommand: this.isTaskCommand(command) };
    }
  }
  
  /**
   * Check if a command is task-related using keyword matching
   * This serves as a fallback when LLM analysis fails
   */
  private isTaskCommand(command: string): boolean {
    const lowerCommand = command.toLowerCase();
    
    // Check for task-related keywords
    const taskKeywords = [
      // Task-related terms
      'task', 'todo', 'to-do', 'to do', 'reminder', 'schedule',
      
      // Create operations
      'add', 'create', 'new', 'make', 'set up', 'start',
      
      // Read operations
      'list', 'show', 'get', 'what are my', 'tell me', 'read', 'view',
      
      // Update operations
      'update', 'change', 'modify', 'edit', 'revise', 'rename', 'reschedule',
      
      // Delete operations
      'delete', 'remove', 'cancel', 'clear', 'dismiss',
      
      // Search operations
      'search', 'find', 'look for', 'locate',
      
      // Task properties
      'due', 'deadline', 'by', 'priority', 'important', 'urgent',
      'status', 'complete', 'finished', 'done', 'pending'
    ];
    
    return taskKeywords.some(keyword => lowerCommand.includes(keyword));
  }
  
  /**
   * Clear the command buffer
   */
  private clearCommandBuffer(): void {
    this.commandBuffer = '';
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
  }
}

// Create and export a singleton instance
const transcriptionService = new TranscriptionService();
export default transcriptionService;