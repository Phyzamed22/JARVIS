/**
 * Task Handler for Voice Commands
 * 
 * This module handles voice commands related to task management using Notion API.
 * It supports task-specific wake words and redirects to the tasks window.
 */

import notionService from '@/lib/notion-service';
import { containsTaskWakeWord, extractTaskCommand, shouldRedirectToTasksWindow } from '../crewai/task-wake-words';
import crewAITaskManager from '../crewai/task-manager';
import { generateVoiceResponse } from '../elevenlabs';
import { getVoiceSettings } from '../voice-settings-service';

interface TaskCommandResult {
  executed: boolean;
  message?: string;
  error?: string;
  data?: any;
  shouldRedirect?: boolean;
}

/**
 * Extract task details from a voice command
 */
function extractTaskDetails(command: string) {
  let taskName = '';
  let dueDate = '';
  let priority = '';
  
  // Extract task name
  // Pattern: "add a task to [task name]"
  const taskNameMatch = command.match(/add (a task|task) (to|called|named|titled) ([\w\s\d,.'"!?-]+?)( due| with priority| $)/i);
  if (taskNameMatch) {
    taskName = taskNameMatch[3].trim();
  } else {
    // Fallback: take everything after "add a task"
    const fallbackMatch = command.match(/add (a task|task) ([\w\s\d,.'"!?-]+)/i);
    if (fallbackMatch) {
      taskName = fallbackMatch[2].trim();
    }
  }
  
  // Extract due date
  // Look for patterns like "due today", "due tomorrow", "due on Monday", "due on April 15th"
  const dueDateMatch = command.match(/due (today|tomorrow|on|by|next) ([\w\s\d,]+?)( with priority| $)/i);
  if (dueDateMatch) {
    const dueDateText = dueDateMatch[1] + ' ' + dueDateMatch[2];
    
    // Convert natural language date to ISO format
    const today = new Date();
    
    if (dueDateText.includes('today')) {
      dueDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (dueDateText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    } else {
      // For more complex dates, we'd need a more sophisticated date parser
      // This is a simplified version
      try {
        const parsedDate = new Date(dueDateText);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.log('Could not parse date:', dueDateText);
      }
    }
  }
  
  // Extract priority
  // Look for patterns like "with high priority", "priority low"
  const priorityMatch = command.match(/priority (high|medium|low)|with (high|medium|low) priority/i);
  if (priorityMatch) {
    priority = (priorityMatch[1] || priorityMatch[2]).toLowerCase();
    // Capitalize first letter
    priority = priority.charAt(0).toUpperCase() + priority.slice(1);
  }
  
  return {
    name: taskName,
    dueDate,
    priority: priority as 'High' | 'Medium' | 'Low' | '',
  };
}

/**
 * Handle task-related voice commands
 */
export async function handleTaskCommand(command: string): Promise<TaskCommandResult> {
  const lowerCommand = command.toLowerCase();
  
  // Check if this is a task-specific command using wake words
  const isTaskCommand = containsTaskWakeWord(command);
  const shouldRedirect = shouldRedirectToTasksWindow(command);
  
  try {
    // Command: Add a task
    if (lowerCommand.includes('add a task') || lowerCommand.includes('add task') || 
        lowerCommand.includes('create a task') || lowerCommand.includes('create task')) {
      const { name, dueDate, priority } = extractTaskDetails(command);
      
      if (!name) {
        return {
          executed: false,
          error: 'Could not understand the task name. Please try again.',
        };
      }
      
      const task = {
        name,
        status: 'Pending',
        ...(dueDate && { dueDate }),
        ...(priority && { priority }),
      };
      
      const response = await notionService.createTask(task);
      
      // Generate voice response if enabled
      const settings = getVoiceSettings();
      const responseMessage = `Task "${name}" has been added${dueDate ? ' with due date ' + new Date(dueDate).toLocaleDateString() : ''}.`;
      
      if (settings.synthesisEnabled) {
        try {
          await generateVoiceResponse(responseMessage, settings.elevenLabsVoiceId);
        } catch (error) {
          console.error('Error generating voice response:', error);
        }
      }
      
      return {
        executed: true,
        message: responseMessage,
        data: response,
        shouldRedirect: shouldRedirect
      };
    }
    
    // Command: Show pending tasks
    else if (lowerCommand.includes('show pending tasks') || 
             lowerCommand.includes('show my tasks') || 
             lowerCommand.includes('what are my tasks') || 
             lowerCommand.includes('list my tasks')) {
      const tasks = await notionService.getPendingTasks();
      
      if (tasks.length === 0) {
        return {
          executed: true,
          message: 'You have no pending tasks.',
        };
      }
      
      const taskList = tasks.map(task => `- ${task.name}${task.dueDate ? ' (Due: ' + new Date(task.dueDate).toLocaleDateString() + ')' : ''}`).join('\n');
      
      return {
        executed: true,
        message: `Here are your pending tasks:\n${taskList}`,
        data: tasks,
      };
    }
    
    // Command: Show tasks due today
    else if (lowerCommand.includes('due today') || 
             lowerCommand.includes('tasks for today') || 
             lowerCommand.includes('today\'s tasks')) {
      const tasks = await notionService.getDueTasks();
      
      if (tasks.length === 0) {
        return {
          executed: true,
          message: 'You have no tasks due today.',
        };
      }
      
      const taskList = tasks.map(task => `- ${task.name}`).join('\n');
      
      return {
        executed: true,
        message: `Here are your tasks due today:\n${taskList}`,
        data: tasks,
      };
    }
    
    // Command: Mark task as completed
    else if (lowerCommand.includes('mark task') && lowerCommand.includes('complete') || 
             lowerCommand.includes('complete task')) {
      // Extract task name from command
      // This is a simplified version - in a real app, you'd need more sophisticated parsing
      const taskNameMatch = command.match(/mark task ([\w\s\d,.'"!?-]+?) (as |)complete|complete task ([\w\s\d,.'"!?-]+)/i);
      
      if (!taskNameMatch) {
        return {
          executed: false,
          error: 'Could not understand which task to mark as completed. Please try again.',
        };
      }
      
      const taskName = (taskNameMatch[1] || taskNameMatch[3]).trim();
      
      // Get all pending tasks
      const tasks = await notionService.getPendingTasks();
      
      // Find the task by name (case insensitive)
      const task = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
      
      if (!task || !task.id) {
        return {
          executed: false,
          error: `Could not find a pending task named "${taskName}".`,
        };
      }
      
      // Update the task status
      await notionService.updateTaskStatus(task.id, 'Completed');
      
      return {
        executed: true,
        message: `Task "${task.name}" has been marked as completed.`,
      };
    }
    
    // Not a task command
    return {
      executed: false,
    };
  } catch (error: any) {
    console.error('Error handling task command:', error);
    return {
      executed: false,
      error: `Error processing task command: ${error.message}`,
    };
  }
}