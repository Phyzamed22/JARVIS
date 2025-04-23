import { NextRequest, NextResponse } from 'next/server';
import notionService from '@/lib/notion-service';

// Handler for GET requests - fetch tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let tasks;
    if (type === 'due') {
      tasks = await notionService.getDueTasks();
    } else if (type === 'pending') {
      tasks = await notionService.getPendingTasks();
    } else {
      // Default to pending tasks if no type specified
      tasks = await notionService.getPendingTasks();
    }

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    );
  }
}

// Handler for POST requests - create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Task name is required' },
        { status: 400 }
      );
    }

    // Create task with default status if not provided
    const task = {
      name: body.name,
      status: body.status || 'Pending',
      dueDate: body.dueDate,
      priority: body.priority,
      notes: body.notes
    };

    const response = await notionService.createTask(task);
    
    return NextResponse.json(
      { message: 'Task created successfully', task: response },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    );
  }
}

// Handler for PATCH requests - update a task's status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.taskId || !body.status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      );
    }

    const response = await notionService.updateTaskStatus(
      body.taskId,
      body.status
    );
    
    return NextResponse.json(
      { message: 'Task updated successfully', task: response },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error.message },
      { status: 500 }
    );
  }
}