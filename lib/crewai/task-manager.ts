/**
 * CrewAI Task Manager Integration
 * 
 * This module integrates CrewAI with the JARVIS voice assistant for intelligent
 * task management through voice commands. It connects LiveKit's transcription
 * with CrewAI agents that perform CRUD operations on a Notion database.
 */

import notionService from '@/lib/notion-service';
import { getVoiceSettings } from '@/lib/voice-settings-service';
import { getLiveKitClient } from '@/lib/livekit';
import { generateVoiceResponse } from '@/lib/elevenlabs';
import { chatWithGroq, Message } from '@/lib/groq';

// Interface for task operations
interface TaskOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'search';
  taskName?: string;
  newTaskName?: string;
  dueDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Pending' | 'In Progress' | 'Completed';
  filter?: 'today' | 'pending' | 'all';
}

// Interface for task manager response
interface TaskManagerResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * CrewAI Task Manager class
 * Handles natural language processing of voice commands and delegates
 * to appropriate task operations
 */
class CrewAITaskManager {
  private isInitialized: boolean = false;
  private userId: string = '';
  
  /**
   * Initialize the CrewAI Task Manager
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      this.userId = userId;
      
      // Check if Notion service is properly configured
      const notionConfigured = await this.checkNotionConfiguration();
      if (!notionConfigured) {
        console.error('Notion service is not properly configured');
        return false;
      }
      
      // Check if LiveKit is initialized
      const livekitClient = getLiveKitClient();
      if (!livekitClient) {
        console.error('LiveKit client is not initialized');
        return false;
      }
      
      console.log('CrewAI Task Manager initialized successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing CrewAI Task Manager:', error);
      return false;
    }
  }
  
  /**
   * Check if Notion is properly configured
   */
  private async checkNotionConfiguration(): Promise<boolean> {
    try {
      console.log('Checking Notion configuration...');
      
      // Verify that we have the necessary environment variables
      const notionToken = process.env.NOTION_API_TOKEN;
      const notionDbId = process.env.NOTION_TASKS_DATABASE_ID;
      
      if (!notionToken) {
        console.error('NOTION_API_TOKEN is not set in environment variables');
        return false;
      }
      
      if (!notionDbId) {
        console.error('NOTION_TASKS_DATABASE_ID is not set in environment variables');
        return false;
      }
      
      console.log('Notion credentials found, testing connection...');
      
      // Try to fetch a single task to verify Notion connectivity
      await notionService.getPendingTasks(1);
      console.log('Successfully connected to Notion database');
      return true;
    } catch (error) {
      console.error('Error connecting to Notion:', error);
      console.log('Wake word for task creation is "hey jarvis" followed by a task command');
      console.log('Example: "hey jarvis add task buy groceries due tomorrow"');
      return false;
    }
  }
  
  /**
   * Process a transcribed voice command
   */
  async processCommand(transcript: string): Promise<TaskManagerResponse> {
    if (!this.isInitialized) {
      return {
        success: false,
        message: 'Task Manager is not initialized',
        error: 'Not initialized'
      };
    }
    
    try {
      console.log(`Processing task command: "${transcript}"`);
      
      // Extract the task operation from the transcript using Groq LLM and regex fallback
      const operation = await this.extractTaskOperation(transcript);
      
      if (!operation) {
        return {
          success: false,
          message: 'Could not understand the task command',
          error: 'Invalid command'
        };
      }
      
      // Execute the appropriate operation
      let response: TaskManagerResponse;
      
      switch (operation.type) {
        case 'create':
          response = await this.createTask(operation);
          break;
        case 'read':
          response = await this.listTasks(operation);
          break;
        case 'update':
          response = await this.updateTask(operation);
          break;
        case 'delete':
          response = await this.deleteTask(operation);
          break;
        case 'search':
          response = await this.searchTasks(operation);
          break;
        default:
          response = {
            success: false,
            message: 'Unknown operation type',
            error: 'Invalid operation'
          };
      }
      
      // Generate voice response if successful
      if (response.success) {
        await this.generateVoiceResponse(response.message);
      }
      
      return response;
    } catch (error: any) {
      console.error('Error processing task command:', error);
      return {
        success: false,
        message: 'Error processing task command',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Extract task operation details from transcript
   */
  private async extractTaskOperation(transcript: string): Promise<TaskOperation | null> {
    try {
      // First try to use Groq LLM for advanced natural language understanding
      const llmOperation = await this.extractTaskOperationWithLLM(transcript);
      if (llmOperation) {
        console.log('Task operation extracted using LLM:', llmOperation);
        return llmOperation;
      }
    } catch (error) {
      console.error('Error extracting task operation with LLM:', error);
      // Fall back to regex-based extraction if LLM fails
    }
    
    // Fall back to regex-based extraction
    return this.extractTaskOperationWithRegex(transcript);
  }
  
  /**
   * Extract task operation using Groq LLM
   */
  private async extractTaskOperationWithLLM(transcript: string): Promise<TaskOperation | null> {
    // Define the system prompt for task operation extraction
    const systemPrompt = `You are an AI assistant that extracts task management operations from voice commands.
    
    Analyze the user's command and extract the following information:
    1. Operation type: create, read, update, delete, or search
    2. Task name (if applicable)
    3. New task name (for update operations)
    4. Due date (if mentioned)
    5. Priority (if mentioned): High, Medium, or Low
    6. Status (if mentioned): Pending, In Progress, or Completed
    7. Filter (for read operations): today, pending, or all
    
    Return a JSON object with the following structure:
    {
      "type": "create" | "read" | "update" | "delete" | "search",
      "taskName": string or null,
      "newTaskName": string or null,
      "dueDate": string or null,
      "priority": "High" | "Medium" | "Low" or null,
      "status": "Pending" | "In Progress" | "Completed" or null,
      "filter": "today" | "pending" | "all" or null
    }
    
    If you cannot determine the operation type, return null.`;
    
    // Create message for Groq LLM
    const messages: Message[] = [
      { role: 'user', content: `Extract task operation from: "${transcript}"` }
    ];
    
    // Get response from Groq LLM
    const response = await chatWithGroq(messages, { systemPrompt, temperature: 0.1 });
    
    // Parse the response
    try {
      // Extract JSON from the response text
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const operationData = JSON.parse(jsonMatch[0]);
        
        // Validate the operation type
        if (!operationData.type || !['create', 'read', 'update', 'delete', 'search'].includes(operationData.type)) {
          return null;
        }
        
        // Convert the operation data to TaskOperation
        const operation: TaskOperation = {
          type: operationData.type as 'create' | 'read' | 'update' | 'delete' | 'search'
        };
        
        // Add optional properties if they exist
        if (operationData.taskName) operation.taskName = operationData.taskName;
        if (operationData.newTaskName) operation.newTaskName = operationData.newTaskName;
        if (operationData.dueDate) operation.dueDate = operationData.dueDate;
        if (operationData.priority) operation.priority = operationData.priority;
        if (operationData.status) operation.status = operationData.status;
        if (operationData.filter) operation.filter = operationData.filter;
        
        return operation;
      }
    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
    }
    
    return null;
  }
  
  /**
   * Extract task operation details from transcript using regex patterns
   * This serves as a fallback when LLM extraction fails
   */
  private extractTaskOperationWithRegex(transcript: string): TaskOperation | null {
    const lowerTranscript = transcript.toLowerCase();
    
    // Create task patterns
    if (lowerTranscript.includes('add task') || 
        lowerTranscript.includes('create task') || 
        lowerTranscript.includes('new task') ||
        lowerTranscript.includes('remind me to')) {
      
      // Extract task name
      let taskName = '';
      const taskNameMatch = transcript.match(/(?:add|create|new)\s+task\s+(?:called|named|titled)?\s*["']?([\w\s\d,.!?-]+)["']?(?:\s+(?:due|by|with|$))/i) ||
                           transcript.match(/remind\s+me\s+to\s+([\w\s\d,.!?-]+)(?:\s+(?:due|by|with|$))/i);
      
      if (taskNameMatch && taskNameMatch[1]) {
        taskName = taskNameMatch[1].trim();
      } else {
        // Fallback extraction
        const parts = transcript.split(/add task|create task|new task|remind me to/i)[1];
        if (parts) {
          taskName = parts.split(/due|by|with priority/i)[0].trim();
        }
      }
      
      // Extract due date
      let dueDate = '';
      const dueDateMatch = transcript.match(/due\s+(today|tomorrow|on|by|next)\s+([\w\s\d,]+)/i);
      
      if (dueDateMatch) {
        const dueDateText = dueDateMatch[1] + ' ' + dueDateMatch[2];
        dueDate = this.parseDueDate(dueDateText);
      }
      
      // Extract priority
      let priority: 'High' | 'Medium' | 'Low' | undefined;
      const priorityMatch = transcript.match(/priority\s+(high|medium|low)|with\s+(high|medium|low)\s+priority/i);
      
      if (priorityMatch) {
        const priorityText = (priorityMatch[1] || priorityMatch[2]).toLowerCase();
        priority = priorityText.charAt(0).toUpperCase() + priorityText.slice(1) as 'High' | 'Medium' | 'Low';
      }
      
      return {
        type: 'create',
        taskName,
        dueDate,
        priority
      };
    }
    
    // List tasks patterns
    if (lowerTranscript.includes('list tasks') || 
        lowerTranscript.includes('show tasks') || 
        lowerTranscript.includes('what are my tasks') || 
        lowerTranscript.includes('read tasks') ||
        lowerTranscript.includes('show me my tasks')) {
      
      let filter: 'today' | 'pending' | 'all' = 'pending';
      
      if (lowerTranscript.includes('today') || lowerTranscript.includes('for today')) {
        filter = 'today';
      } else if (lowerTranscript.includes('all')) {
        filter = 'all';
      }
      
      return {
        type: 'read',
        filter
      };
    }
    
    // Update task patterns
    if (lowerTranscript.includes('update task') || 
        lowerTranscript.includes('change task') || 
        lowerTranscript.includes('modify task') || 
        lowerTranscript.includes('edit task') ||
        lowerTranscript.includes('rename task')) {
      
      // Extract old task name and new task name
      const updateMatch = transcript.match(/(?:update|change|modify|edit|rename)\s+task\s+["']?([\w\s\d,.!?-]+)["']?\s+to\s+["']?([\w\s\d,.!?-]+)["']?/i);
      
      if (updateMatch && updateMatch[1] && updateMatch[2]) {
        return {
          type: 'update',
          taskName: updateMatch[1].trim(),
          newTaskName: updateMatch[2].trim()
        };
      }
      
      // Check for status update
      const statusMatch = transcript.match(/(?:mark|set)\s+task\s+["']?([\w\s\d,.!?-]+)["']?\s+(?:as|to)\s+(completed|done|in progress|pending)/i);
      
      if (statusMatch && statusMatch[1]) {
        let status: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
        const statusText = statusMatch[2].toLowerCase();
        
        if (statusText === 'completed' || statusText === 'done') {
          status = 'Completed';
        } else if (statusText === 'in progress') {
          status = 'In Progress';
        }
        
        return {
          type: 'update',
          taskName: statusMatch[1].trim(),
          status
        };
      }
    }
    
    // Delete task patterns
    if (lowerTranscript.includes('delete task') || 
        lowerTranscript.includes('remove task') ||
        lowerTranscript.includes('cancel task')) {
      
      const deleteMatch = transcript.match(/(?:delete|remove|cancel)\s+task\s+["']?([\w\s\d,.!?-]+)["']?/i);
      
      if (deleteMatch && deleteMatch[1]) {
        return {
          type: 'delete',
          taskName: deleteMatch[1].trim()
        };
      }
    }
    
    // Search task patterns
    if (lowerTranscript.includes('search for task') || 
        lowerTranscript.includes('find task') || 
        lowerTranscript.includes('look for task')) {
      
      const searchMatch = transcript.match(/(?:search for|find|look for)\s+task\s+["']?([\w\s\d,.!?-]+)["']?/i);
      
      if (searchMatch && searchMatch[1]) {
        return {
          type: 'search',
          taskName: searchMatch[1].trim()
        };
      }
    }
    
    return null;
  }
  
  /**
   * Parse natural language due date
   */
  private parseDueDate(dueDateText: string): string {
    const today = new Date();
    let dueDate = '';
    
    if (dueDateText.includes('today')) {
      dueDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (dueDateText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    } else if (dueDateText.includes('next')) {
      // Handle "next Monday", "next week", etc.
      const dayMatch = dueDateText.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week)/i);
      
      if (dayMatch) {
        const dayOfWeek = dayMatch[1].toLowerCase();
        const nextDate = new Date(today);
        
        if (dayOfWeek === 'week') {
          // Next week = 7 days from today
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          // Map day names to their number (0 = Sunday, 1 = Monday, etc.)
          const dayMap: {[key: string]: number} = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          
          const targetDay = dayMap[dayOfWeek];
          const currentDay = today.getDay();
          let daysToAdd = targetDay - currentDay;
          
          // If the target day is earlier or the same as the current day,
          // add 7 days to get to next week
          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }
          
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        }
        
        dueDate = nextDate.toISOString().split('T')[0];
      }
    } else {
      // For more complex dates, attempt to parse with Date
      try {
        const parsedDate = new Date(dueDateText);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.log('Could not parse date:', dueDateText);
      }
    }
    
    return dueDate;
  }
  
  /**
   * Create a new task
   */
  private async createTask(operation: TaskOperation): Promise<TaskManagerResponse> {
    if (!operation.taskName) {
      return {
        success: false,
        message: 'Task name is required',
        error: 'Missing task name'
      };
    }
    
    try {
      const task = {
        name: operation.taskName,
        status: 'Pending',
        dueDate: operation.dueDate,
        priority: operation.priority
      };
      
      const response = await notionService.createTask(task);
      
      let confirmationMessage = `Task "${operation.taskName}" created successfully`;
      if (operation.dueDate) {
        confirmationMessage += ` due on ${operation.dueDate}`;
      }
      if (operation.priority) {
        confirmationMessage += ` with ${operation.priority} priority`;
      }
      
      return {
        success: true,
        message: confirmationMessage,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to create task',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * List tasks based on filter
   */
  private async listTasks(operation: TaskOperation): Promise<TaskManagerResponse> {
    try {
      let tasks;
      let filterDescription = 'pending';
      
      if (operation.filter === 'today') {
        tasks = await notionService.getDueTasks();
        filterDescription = 'due today';
      } else if (operation.filter === 'all') {
        tasks = await notionService.getAllTasks();
        filterDescription = 'all';
      } else {
        tasks = await notionService.getPendingTasks();
      }
      
      if (!tasks || tasks.length === 0) {
        return {
          success: true,
          message: `You have no ${filterDescription} tasks.`,
          data: []
        };
      }
      
      // Format tasks for voice response
      const taskList = tasks.map((task: any, index: number) => {
        let taskDescription = `${index + 1}. ${task.name}`;
        if (task.dueDate) {
          taskDescription += ` due on ${task.dueDate}`;
        }
        if (task.priority) {
          taskDescription += ` with ${task.priority} priority`;
        }
        return taskDescription;
      }).join('. ');
      
      const message = `Here are your ${filterDescription} tasks: ${taskList}`;
      
      return {
        success: true,
        message,
        data: tasks
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to list tasks',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Update an existing task
   */
  private async updateTask(operation: TaskOperation): Promise<TaskManagerResponse> {
    if (!operation.taskName) {
      return {
        success: false,
        message: 'Task name is required',
        error: 'Missing task name'
      };
    }
    
    try {
      // First, find the task by name
      const tasks = await notionService.searchTasks(operation.taskName);
      
      if (!tasks || tasks.length === 0) {
        return {
          success: false,
          message: `Could not find task "${operation.taskName}"`,
          error: 'Task not found'
        };
      }
      
      // Use the first matching task
      const task = tasks[0];
      
      // Update task properties
      let updateData: any = {};
      let updateDescription = '';
      
      if (operation.newTaskName) {
        updateData.name = operation.newTaskName;
        updateDescription = `renamed to "${operation.newTaskName}"`;
      }
      
      if (operation.status) {
        updateData.status = operation.status;
        updateDescription = `marked as ${operation.status}`;
      }
      
      if (operation.dueDate) {
        updateData.dueDate = operation.dueDate;
        updateDescription += updateDescription ? ` and due date set to ${operation.dueDate}` : `due date set to ${operation.dueDate}`;
      }
      
      if (operation.priority) {
        updateData.priority = operation.priority;
        updateDescription += updateDescription ? ` and priority set to ${operation.priority}` : `priority set to ${operation.priority}`;
      }
      
      // If no updates specified, return error
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: 'No updates specified',
          error: 'Missing update data'
        };
      }
      
      // Update the task
      const response = await notionService.updateTask(task.id, updateData);
      
      return {
        success: true,
        message: `Task "${operation.taskName}" ${updateDescription}`,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to update task',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Delete a task
   */
  private async deleteTask(operation: TaskOperation): Promise<TaskManagerResponse> {
    if (!operation.taskName) {
      return {
        success: false,
        message: 'Task name is required',
        error: 'Missing task name'
      };
    }
    
    try {
      // First, find the task by name
      const tasks = await notionService.searchTasks(operation.taskName);
      
      if (!tasks || tasks.length === 0) {
        return {
          success: false,
          message: `Could not find task "${operation.taskName}"`,
          error: 'Task not found'
        };
      }
      
      // Use the first matching task
      const task = tasks[0];
      
      // Delete the task
      await notionService.deleteTask(task.id);
      
      return {
        success: true,
        message: `Task "${operation.taskName}" deleted successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to delete task',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Search for tasks
   */
  private async searchTasks(operation: TaskOperation): Promise<TaskManagerResponse> {
    if (!operation.taskName) {
      return {
        success: false,
        message: 'Search term is required',
        error: 'Missing search term'
      };
    }
    
    try {
      const tasks = await notionService.searchTasks(operation.taskName);
      
      if (!tasks || tasks.length === 0) {
        return {
          success: true,
          message: `No tasks found matching "${operation.taskName}"`,
          data: []
        };
      }
      
      // Format tasks for voice response
      const taskList = tasks.map((task: any, index: number) => {
        let taskDescription = `${index + 1}. ${task.name}`;
        if (task.dueDate) {
          taskDescription += ` due on ${task.dueDate}`;
        }
        if (task.priority) {
          taskDescription += ` with ${task.priority} priority`;
        }
        if (task.status) {
          taskDescription += ` (${task.status})`;
        }
        return taskDescription;
      }).join('. ');
      
      const message = `Found ${tasks.length} tasks matching "${operation.taskName}": ${taskList}`;
      
      return {
        success: true,
        message,
        data: tasks
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to search tasks',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Generate voice response using ElevenLabs with Groq LLM for tone enhancement
   */
  private async generateVoiceResponse(message: string): Promise<void> {
    try {
      const settings = getVoiceSettings();
      if (!settings.elevenLabsEnabled) {
        console.log('ElevenLabs is disabled, skipping voice response');
        return;
      }
      
      // Use Groq LLM to enhance the response with a Gen-Z tone
      const enhancedMessage = await this.enhanceResponseTone(message);
      
      // Generate voice response with the enhanced message
      await generateVoiceResponse(enhancedMessage, settings.elevenLabsVoiceId);
    } catch (error) {
      console.error('Error generating voice response:', error);
      // Fallback to original message if enhancement fails
      try {
        await generateVoiceResponse(message, settings.elevenLabsVoiceId);
      } catch (fallbackError) {
        console.error('Error generating fallback voice response:', fallbackError);
      }
    }
  }
  
  /**
   * Enhance response with Gen-Z tone using Groq LLM
   */
  private async enhanceResponseTone(message: string): Promise<string> {
    try {
      // Define the system prompt for tone enhancement
      const systemPrompt = `You are a Gen-Z AI assistant that rephrases messages in a cool, casual Gen-Z tone.
      
      Guidelines for Gen-Z tone:
      - Use casual, conversational language
      - Add occasional slang terms that are current and appropriate
      - Keep it brief and to the point
      - Be positive and upbeat
      - Sound natural, not forced
      - Maintain all the original information and meaning
      
      Rephrase the given message to sound more Gen-Z while preserving all task information.`;
      
      // Create message for Groq LLM
      const messages: Message[] = [
        { role: 'user', content: `Rephrase this in a Gen-Z tone: "${message}"` }
      ];
      
      // Get response from Groq LLM
      const response = await chatWithGroq(messages, { systemPrompt, temperature: 0.7 });
      
      // Return the enhanced message or fall back to original if empty
      return response.text.trim() || message;
    } catch (error) {
      console.error('Error enhancing response tone:', error);
      return message; // Return original message if enhancement fails
    }
  }
}

// Create and export a singleton instance
const crewAITaskManager = new CrewAITaskManager();
export default crewAITaskManager;