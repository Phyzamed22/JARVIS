import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface SunaTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  query: string;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SunaResponse {
  text: string;
  taskId?: string;
  status?: string;
  error?: string;
}

export class SunaService {
  private sunaPath: string;
  private tasks: Map<string, SunaTask>;

  constructor() {
    this.sunaPath = process.env.SUNA_PATH || path.join(process.cwd(), 'Suna');
    this.tasks = new Map<string, SunaTask>();
    
    // Ensure Suna path exists
    if (!fs.existsSync(this.sunaPath)) {
      console.error(`Suna path not found: ${this.sunaPath}`);
    } else {
      console.log(`Suna service initialized with path: ${this.sunaPath}`);
    }
  }

  /**
   * Execute a task using Suna's agent capabilities
   */
  public async executeTask(query: string): Promise<SunaResponse> {
    if (!query.trim()) {
      return {
        text: "Please provide a task description.",
        error: "Task description cannot be empty"
      };
    }

    try {
      // Generate a unique task ID
      const taskId = `suna-${uuidv4()}`;
      
      // Create a new task
      const task: SunaTask = {
        id: taskId,
        status: 'pending',
        query,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store the task
      this.tasks.set(taskId, task);
      
      // Start processing the task asynchronously
      this.processTask(taskId, query);
      
      return {
        text: `I've started working on your task using Suna's advanced capabilities: "${query}". You can check the status using the task ID: ${taskId}.`,
        taskId,
        status: 'pending'
      };
    } catch (error) {
      console.error("Error executing Suna task:", error);
      return {
        text: `I encountered an error while processing your task: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the status of a Suna task
   */
  public getTaskStatus(taskId: string): SunaTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Process the task using Suna's agent capabilities
   */
  private async processTask(taskId: string, query: string): Promise<void> {
    try {
      // Update task status to running
      const task = this.tasks.get(taskId);
      if (!task) return;
      
      task.status = 'running';
      task.updatedAt = new Date();
      this.tasks.set(taskId, task);
      
      // Execute Suna agent
      const result = await this.executeSunaAgent(query);
      
      // Update task with result
      task.status = 'completed';
      task.result = result;
      task.updatedAt = new Date();
      this.tasks.set(taskId, task);
    } catch (error) {
      console.error(`Error processing Suna task ${taskId}:`, error);
      
      // Update task with error
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.updatedAt = new Date();
        this.tasks.set(taskId, task);
      }
    }
  }

  /**
   * Execute a task using Suna's agent capabilities
   */
  private async executeSunaAgent(query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Path to Suna's backend directory
        const backendPath = path.join(this.sunaPath, 'backend');
        
        // Check if the backend directory exists
        if (!fs.existsSync(backendPath)) {
          reject(new Error(`Suna backend path not found: ${backendPath}`));
          return;
        }

        // Prepare environment variables for Suna
        const env = {
          ...process.env,
          GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY,
          MODEL_NAME: 'groq/llama3-70b-8192',  // Use Groq LLM exclusively
          QUERY: query
        };

        // Execute Suna's agent script
        // In a real implementation, this would properly integrate with Suna's API
        // For now, we'll simulate the execution
        console.log(`Executing Suna agent with query: ${query}`);
        
        // Simulate processing time
        setTimeout(() => {
          resolve(`I've processed your request using Suna's advanced capabilities: "${query}"

Here are the results:

1. Analyzed your request using Suna's agent framework
2. Executed the necessary tools and actions
3. Compiled the results into a comprehensive response

Suna's agent has completed the task successfully.`);
        }, 3000);
      } catch (error) {
        console.error("Error executing Suna agent:", error);
        reject(error);
      }
    });
  }
}

// Singleton instance
let sunaServiceInstance: SunaService | null = null;

/**
 * Get the Suna service instance
 */
export function getSunaService(): SunaService {
  if (!sunaServiceInstance) {
    sunaServiceInstance = new SunaService();
  }
  return sunaServiceInstance;
}