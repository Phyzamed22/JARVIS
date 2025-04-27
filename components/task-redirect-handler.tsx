'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTasksWindowUrl } from '@/lib/crewai/task-wake-words';
import { detectTaskIntent, logTaskDetection, TaskDetectionResult } from '@/lib/task-detection-service';

interface TaskRedirectHandlerProps {
  transcription: string;
  onRedirectStart?: () => void;
}

/**
 * Component that listens to transcriptions and redirects to the tasks window
 * when a task-related command is detected using enhanced detection algorithms
 */
export function TaskRedirectHandler({ transcription, onRedirectStart }: TaskRedirectHandlerProps) {
  const router = useRouter();
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [lastDetectionResult, setLastDetectionResult] = useState<TaskDetectionResult | null>(null);
  
  useEffect(() => {
    // Skip if this is the same text we already processed
    if (!transcription || transcription === lastProcessedText) return;
    
    // Use the enhanced task detection service
    try {
      const detectionResult = detectTaskIntent(transcription);
      setLastDetectionResult(detectionResult);
      
      // Log detailed task detection information for debugging
      logTaskDetection(transcription, detectionResult);
      
      // Check if we should redirect based on the detection result
      if (detectionResult.isTaskRelated && detectionResult.shouldRedirect) {
        console.log(`Task command detected with ${detectionResult.confidence.toFixed(2)} confidence. Action: ${detectionResult.action || 'unknown'}`);
        
        // Call the optional callback if provided
        if (onRedirectStart) {
          onRedirectStart();
        }
        
        // Get the tasks window URL and redirect
        const tasksUrl = getTasksWindowUrl();
        router.push(tasksUrl);
      }
    } catch (error) {
      console.error('Error in task detection:', error);
    }
    
    // Update the last processed text
    setLastProcessedText(transcription);
  }, [transcription, router, lastProcessedText, onRedirectStart]);
  
  // This component doesn't render anything
  return null;
}