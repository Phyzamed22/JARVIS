import { getAIService } from "./ai-service"
import { groq } from "./groq"
import { generateText } from "./ai"
import { getSunaService } from "./suna-service"
import { createAgentTask, getAgentTask, updateAgentTask, AgentTaskDB } from "./db";

export interface AgentTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  query: string;
  result?: string | null; // Changed from result?: string
  error?: string | null;  // Changed from error?: string
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentResponse {
  text: string
  taskId?: string
  status?: string
  error?: string
}

// In-memory storage for agent tasks - REMOVED
// const agentTasks = new Map<string, AgentTask>()

export class AgentService {
  private apiKey: string | undefined
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  }

  // Check if the agent service is configured
  public isConfigured(): boolean {
    return !!this.apiKey
  }

  // Execute a task using Suna's agent capabilities
  public async executeTask(query: string): Promise<AgentResponse> {
    if (!query.trim()) {
      return {
        text: "Please provide a task description.",
        error: "Task description cannot be empty"
      }
    }

    try {
      // Generate a unique task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      
      // Create a new task object for the DB
      const dbTaskData = {
        id: taskId,
        status: 'pending' as const, // Use 'as const' for type safety
        query,
        // result and error are initially null/undefined
      };
      
      await createAgentTask(dbTaskData); // Store in DB
      
      // Start processing the task asynchronously
      this.processTask(taskId, query)
      
      return {
        text: `I've started working on your task: "${query}". You can check the status using the task ID: ${taskId}.`,
        taskId,
        status: 'pending'
      }
    } catch (error) {
      console.error("Error executing agent task:", error)
      return {
        text: `I encountered an error while processing your task: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Get the status of a task
  public async getTaskStatus(taskId: string): Promise<AgentTask | undefined> {
    const dbTask = await getAgentTask(taskId);
    if (!dbTask) {
      return undefined;
    }
    // Map AgentTaskDB to AgentTask
    return {
      id: dbTask.id,
      status: dbTask.status,
      query: dbTask.query,
      result: dbTask.result,
      error: dbTask.error,
      createdAt: dbTask.created_at, // Map field name
      updatedAt: dbTask.updated_at  // Map field name
    };
  }

  // Process the task using Suna's agent capabilities
  private async processTask(taskId: string, query: string): Promise<void> {
    try {
      // Update task status to running
      await updateAgentTask(taskId, { status: 'running' });
      
      // Determine if this is a web automation task
      const isWebTask = await this.isWebAutomationTask(query)
      
      let result: string
      
      if (isWebTask) {
        // Use Suna's browser automation capabilities
        result = await this.executeSunaTask(query)
      } else {
        // Use JARVIS's built-in capabilities for simpler tasks
        const aiService = getAIService()
        const aiResponse = await aiService.getResponse(query)
        result = aiResponse.text
      }
      
      // Update task with result
      await updateAgentTask(taskId, { status: 'completed', result });
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error)
      
      // Update task with error
      await updateAgentTask(taskId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // Determine if a task requires web automation
  private async isWebAutomationTask(query: string): Promise<boolean> {
    try {
      // Use GROQ to classify if this task requires web automation
      const response = await generateText({
        model: groq("llama3-70b-8192"),
        messages: [
          {
            role: "system",
            content: `You are a task classifier that determines if a user query requires web automation, browsing, or data extraction from websites. 
            Respond with only "true" if the task requires web browsing, automation, or data extraction from websites.
            Respond with only "false" if the task can be completed with general knowledge or simple computations.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.1,
        maxTokens: 10,
      })

      return response.text.toLowerCase().includes('true')
    } catch (error) {
      console.error("Error classifying task:", error)
      // Default to false if classification fails
      return false
    }
  }

  // Execute a task using Suna's agent capabilities
  private async executeSunaTask(query: string): Promise<string> {
    try {
      // Get the Suna service instance
      const sunaService = getSunaService()
      
      // Execute the task using Suna's agent capabilities
      const response = await sunaService.executeTask(query)
      
      // Return the response text
      return response.text
    } catch (error) {
      console.error("Error executing Suna task:", error)
      throw error
    }
  }
}

// Singleton instance
let agentServiceInstance: AgentService | null = null

// Get the agent service instance
export function getAgentService(): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService()
  }
  return agentServiceInstance
}