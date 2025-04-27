/**
 * Task Detection Service
 * 
 * This service provides enhanced detection of task-related commands and wake words,
 * allowing for more accurate recognition of task intents and improved redirection
 * to the tasks module.
 */

import { getVoiceSettings } from '@/lib/voice-settings-service';
import notionService from '@/lib/notion-service';
import { TASK_WAKE_WORDS, TASK_ACTION_KEYWORDS } from '@/lib/crewai/task-wake-words';

// Interface for task detection result
export interface TaskDetectionResult {
  isTaskRelated: boolean;
  confidence: number;
  action?: 'create' | 'view' | 'update' | 'delete' | 'search';
  taskName?: string;
  shouldRedirect: boolean;
  debugInfo?: {
    matchedKeywords: string[];
    matchedPatterns: string[];
  };
}

/**
 * Analyzes text to determine if it contains task-related commands
 * Uses a multi-layered approach with keyword matching, pattern recognition,
 * and context analysis for higher accuracy
 */
export function detectTaskIntent(text: string): TaskDetectionResult {
  const lowerText = text.toLowerCase().trim();
  const result: TaskDetectionResult = {
    isTaskRelated: false,
    confidence: 0,
    shouldRedirect: false,
    debugInfo: {
      matchedKeywords: [],
      matchedPatterns: []
    }
  };

  // Layer 1: Check for task wake words (highest confidence)
  const matchedWakeWords = TASK_WAKE_WORDS.filter(word => lowerText.includes(word));
  if (matchedWakeWords.length > 0) {
    result.isTaskRelated = true;
    result.confidence += 0.5; // Base confidence for wake word match
    result.debugInfo!.matchedKeywords = matchedWakeWords;
  }

  // Layer 2: Check for task action keywords
  const matchedActions = TASK_ACTION_KEYWORDS.filter(action => {
    return action.keywords.some(keyword => lowerText.includes(keyword));
  });

  if (matchedActions.length > 0) {
    result.isTaskRelated = true;
    result.confidence += 0.3; // Additional confidence for action match
    result.action = matchedActions[0].type as any;
    result.debugInfo!.matchedKeywords.push(...matchedActions[0].keywords.filter(k => lowerText.includes(k)));
  }

  // Layer 3: Pattern matching for task creation
  const createTaskPatterns = [
    /add(?:\sa)?\stask\s(?:to|called|named|titled)?\s([\w\s\d,.'"-]+?)(?:\sdue|\swith|\s$|$)/i,
    /create(?:\sa)?\stask\s(?:to|called|named|titled)?\s([\w\s\d,.'"-]+?)(?:\sdue|\swith|\s$|$)/i,
    /new\stask\s(?:to|called|named|titled)?\s([\w\s\d,.'"-]+?)(?:\sdue|\swith|\s$|$)/i,
    /remind\sme\sto\s([\w\s\d,.'"-]+?)(?:\sdue|\swith|\s$|$)/i
  ];

  for (const pattern of createTaskPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      result.isTaskRelated = true;
      result.confidence += 0.2; // Additional confidence for pattern match
      result.action = 'create';
      result.taskName = match[1].trim();
      result.debugInfo!.matchedPatterns.push(pattern.toString());
      break;
    }
  }

  // Layer 4: Pattern matching for viewing tasks
  const viewTaskPatterns = [
    /show(?:\sme)?(?:\smy)?\stasks/i,
    /list(?:\smy)?\stasks/i,
    /view(?:\smy)?\stasks/i,
    /what(?:\sare)?(?:\smy)?\stasks/i,
    /pending\stasks/i,
    /tasks\sdue(?:\stoday)?/i,
    /due\stoday/i
  ];

  for (const pattern of viewTaskPatterns) {
    if (pattern.test(lowerText)) {
      result.isTaskRelated = true;
      result.confidence += 0.2; // Additional confidence for pattern match
      result.action = 'view';
      result.debugInfo!.matchedPatterns.push(pattern.toString());
      break;
    }
  }

  // Determine if we should redirect based on confidence and action
  if (result.isTaskRelated && result.confidence >= 0.5) {
    result.shouldRedirect = true;
    
    // If it's just a view action with low confidence, we might not need to redirect
    // as we could just display the tasks in the current interface
    if (result.action === 'view' && result.confidence < 0.7) {
      // For view actions, we might want to check if Notion is properly configured
      // before deciding to redirect
      const settings = getVoiceSettings();
      if (!settings.notionEnabled) {
        result.shouldRedirect = false;
      }
    }
  }

  return result;
}

/**
 * Logs detailed information about task detection for debugging
 */
export function logTaskDetection(text: string, result: TaskDetectionResult): void {
  console.log('Task Detection Analysis:');
  console.log(`Input: "${text}"`);
  console.log(`Is Task Related: ${result.isTaskRelated}`);
  console.log(`Confidence: ${result.confidence.toFixed(2)}`);
  console.log(`Action: ${result.action || 'None'}`);
  console.log(`Task Name: ${result.taskName || 'None'}`);
  console.log(`Should Redirect: ${result.shouldRedirect}`);
  
  if (result.debugInfo) {
    console.log('Matched Keywords:', result.debugInfo.matchedKeywords.join(', '));
    console.log('Matched Patterns:', result.debugInfo.matchedPatterns.length);
  }
}

/**
 * Checks if Notion is properly configured for task management
 */
export async function checkNotionConfiguration(): Promise<boolean> {
  try {
    // Check environment variables
    const notionToken = process.env.NOTION_API_TOKEN;
    const notionDbId = process.env.NOTION_TASKS_DATABASE_ID;
    
    if (!notionToken || !notionDbId) {
      console.error('Notion configuration missing: API token or database ID not set');
      return false;
    }
    
    // Test connection to Notion
    try {
      await notionService.getPendingTasks(1);
      return true;
    } catch (error) {
      console.error('Failed to connect to Notion:', error);
      return false;
    }
  } catch (error) {
    console.error('Error checking Notion configuration:', error);
    return false;
  }
}