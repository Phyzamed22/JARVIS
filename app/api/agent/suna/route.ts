import { type NextRequest, NextResponse } from "next/server";
import { getSunaService } from "@/lib/suna-service";

/**
 * API endpoint for executing Suna agent tasks
 * This provides a dedicated interface for Suna's advanced capabilities
 */
export async function POST(request: NextRequest) {
  try {
    const { query, taskId } = await request.json();

    // Get the Suna service
    const sunaService = getSunaService();

    // If a taskId is provided, get the status of that task
    if (taskId) {
      const task = sunaService.getTaskStatus(taskId);
      
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      
      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        query: task.query,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
    }

    // If no taskId but a query is provided, execute a new task
    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    // Execute the task using Suna's agent capabilities
    const response = await sunaService.executeTask(query);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in Suna agent API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process Suna agent request",
        query: request.body ? (await request.json()).query : "",
      },
      { status: 500 },
    );
  }
}

/**
 * API endpoint for getting the status of a Suna agent task
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: "Task ID parameter is required" }, { status: 400 });
    }

    // Get the Suna service
    const sunaService = getSunaService();

    // Get the task status
    const task = sunaService.getTaskStatus(taskId);
    
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      query: task.query,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
  } catch (error) {
    console.error("Error in Suna agent status API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get Suna task status",
      },
      { status: 500 },
    );
  }
}