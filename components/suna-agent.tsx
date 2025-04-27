'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface SunaTask {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  query: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SunaAgent() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<SunaTask | null>(null);
  const [error, setError] = useState('');

  // Function to submit a new task to Suna agent
  const submitTask = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/agent/suna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit task');
      }
      
      if (data.taskId) {
        // Start polling for task status
        setCurrentTask({
          taskId: data.taskId,
          status: data.status || 'pending',
          query,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check task status
  const checkTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/agent/suna?taskId=${taskId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check task status');
      }
      
      setCurrentTask({
        taskId: data.taskId,
        status: data.status,
        query: data.query,
        result: data.result,
        error: data.error,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      
      return data.status;
    } catch (err) {
      console.error('Error checking task status:', err);
      return 'failed';
    }
  };

  // Poll for task status updates
  useEffect(() => {
    if (!currentTask || currentTask.status === 'completed' || currentTask.status === 'failed') {
      return;
    }
    
    const intervalId = setInterval(async () => {
      const status = await checkTaskStatus(currentTask.taskId);
      if (status === 'completed' || status === 'failed') {
        clearInterval(intervalId);
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [currentTask]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Suna Agent</CardTitle>
        <CardDescription>
          Leverage Suna's powerful agent capabilities for complex tasks, web automation, and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium mb-1">
              Task Description
            </label>
            <div className="flex gap-2">
              <Input
                id="query"
                placeholder="Describe your task in detail..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading || (currentTask && ['pending', 'running'].includes(currentTask.status))}
              />
              <Button 
                onClick={submitTask} 
                disabled={isLoading || !query.trim() || (currentTask && ['pending', 'running'].includes(currentTask.status))}
              >
                {isLoading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          {currentTask && (
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Task Status</h3>
                <Badge className={getStatusColor(currentTask.status)}>
                  {currentTask.status.charAt(0).toUpperCase() + currentTask.status.slice(1)}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Task ID</p>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">{currentTask.taskId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Query</p>
                <p className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">{currentTask.query}</p>
              </div>
              
              {currentTask.result && (
                <div>
                  <p className="text-sm font-medium mb-1">Result</p>
                  <Textarea 
                    className="w-full h-40 font-mono text-sm" 
                    readOnly 
                    value={currentTask.result} 
                  />
                </div>
              )}
              
              {currentTask.error && (
                <div>
                  <p className="text-sm font-medium mb-1">Error</p>
                  <p className="text-sm text-red-500">{currentTask.error}</p>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Created: {new Date(currentTask.createdAt).toLocaleString()}
                {' | '}
                Last Updated: {new Date(currentTask.updatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-gray-500">
          Powered by Suna's agent capabilities
        </p>
        {currentTask && ['completed', 'failed'].includes(currentTask.status) && (
          <Button variant="outline" onClick={() => setCurrentTask(null)}>New Task</Button>
        )}
      </CardFooter>
    </Card>
  );
}