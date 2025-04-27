import { type NextRequest, NextResponse } from "next/server"
import { getAgentService } from "@/lib/agent-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: "Task ID parameter is required" }, { status: 400 })
    }

    // Get the agent service
    const agentService = getAgentService()

    // Get the task status
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
  } catch (error) {
    console.error("Error in agent status API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get task status",
      },
      { status: 500 },
    )
  }
}