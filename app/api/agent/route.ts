import { type NextRequest, NextResponse } from "next/server"
import { getAgentService } from "@/lib/agent-service"

export async function POST(request: NextRequest) {
  try {
    const { query, taskId } = await request.json()

    // Get the agent service
    const agentService = getAgentService()

    // If a taskId is provided, get the status of that task
    if (taskId) {
      const task = agentService.getTaskStatus(taskId)
      
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 })
      }
      
      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        query: task.query,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      })
    }

    // If no taskId but a query is provided, execute a new task
    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // Check if the agent service is configured
    if (!agentService.isConfigured()) {
      return NextResponse.json(
        { error: "Agent service not configured. Please add a GROQ_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    // Execute the task
    const response = await agentService.executeTask(query)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in agent API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process agent request",
        query: request.body ? (await request.json()).query : "",
      },
      { status: 500 },
    )
  }
}