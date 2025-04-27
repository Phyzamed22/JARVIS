/**
 * Task-specific Wake Word Detection
 * 
 * This module provides specialized wake word detection for task-related commands,
 * allowing users to create tasks with specific wake phrases like "task" or "reminder"
 * instead of the general "hey jarvis" wake word.
 */

import { getVoiceSettings } from '@/lib/voice-settings-service';

// Task-specific wake words that will trigger task creation
export const TASK_WAKE_WORDS = [
  'task',
  'reminder',
  'todo',
  'schedule',
  'add task',
  'create task',
  'new task',
  'set reminder',
];

// Task action keywords categorized by type
export const TASK_ACTION_KEYWORDS = [
  {
    type: 'create',
    keywords: ['add task', 'create task', 'new task', 'set reminder', 'remind me to']
  },
  {
    type: 'view',
    keywords: ['show tasks', 'list tasks', 'view tasks', 'my tasks', 'pending tasks', 'tasks due', 'due today']
  },
  {
    type: 'update',
    keywords: ['update task', 'change task', 'modify task', 'edit task', 'rename task', 'mark task', 'complete task']
  },
  {
    type: 'delete',
    keywords: ['delete task', 'remove task', 'cancel task']
  },
  {
    type: 'search',
    keywords: ['search for task', 'find task', 'look for task']
  }
];


/**
 * Checks if the transcribed text contains a task-specific wake word
 */
export function containsTaskWakeWord(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Check for any task-specific wake words
  return TASK_WAKE_WORDS.some(wakeWord => lowerText.includes(wakeWord));
}

/**
 * Extracts the task command from text containing a task wake word
 * Returns the full text if no specific extraction is needed
 */
export function extractTaskCommand(text: string): string {
  const lowerText = text.toLowerCase().trim();
  
  // Try to find which wake word was used
  const matchedWakeWord = TASK_WAKE_WORDS.find(wakeWord => lowerText.includes(wakeWord));
  
  if (!matchedWakeWord) {
    return text; // No wake word found, return original text
  }
  
  // For simple wake words like "task" that might be part of the command itself,
  // we don't want to remove them as they provide context
  if (['task', 'reminder', 'todo'].includes(matchedWakeWord)) {
    return text;
  }
  
  // For compound wake words like "add task", extract everything after the wake word
  const parts = text.toLowerCase().split(matchedWakeWord);
  if (parts.length > 1) {
    return parts[1].trim();
  }
  
  return text;
}

/**
 * Determines if the command should redirect to the tasks window
 */
export function shouldRedirectToTasksWindow(text: string): boolean {
  // If it contains a task wake word, we should redirect
  return containsTaskWakeWord(text);
}

/**
 * Gets the URL for the tasks window
 */
export function getTasksWindowUrl(): string {
  return '/tasks';
}