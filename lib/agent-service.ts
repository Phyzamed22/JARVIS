import { getAIService } from "./ai-service"
import { groq } from "./groq"
import { generateText } from "./ai"
import { getSunaService } from "./suna-service"

export interface AgentTask {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  query: string
  result?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface AgentResponse {
  text: string
  taskId?: string
  status?: string
  error?: string
}

// In-memory storage for agent tasks
const agentTasks = new Map<string, AgentTask>()

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
      
      // Create a new task
      const task: AgentTask = {
        id: taskId,
        status: 'pending',
        query,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Store the task
      agentTasks.set(taskId, task)
      
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
  public getTaskStatus(taskId: string): AgentTask | undefined {
    return agentTasks.get(taskId)
  }

  // Process the task using Suna's agent capabilities
  private async processTask(taskId: string, query: string): Promise<void> {
    try {
      // Update task status to running
      const task = agentTasks.get(taskId)
      if (!task) return
      
      task.status = 'running'
      task.updatedAt = new Date()
      agentTasks.set(taskId, task)
      
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
      task.status = 'completed'
      task.result = result
      task.updatedAt = new Date()
      agentTasks.set(taskId, task)
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error)
      
      // Update task with error
      const task = agentTasks.get(taskId)
      if (task) {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : String(error)
        task.updatedAt = new Date()
        agentTasks.set(taskId, task)
      }
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