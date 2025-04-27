"use client";

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, CheckCircle2, Circle, AlertCircle, Plus, Trash, Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { VoiceWaveform } from '@/components/voice-waveform';
import { getVoiceSettings } from '@/lib/voice-settings-service';

interface Task {
  id?: string;
  name: string;
  dueDate?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export function TasksModule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [newTask, setNewTask] = useState<Task>({
    name: '',
    status: 'Pending',
    priority: 'Medium',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setTranscript(transcript);
          setNewTask(prev => ({ ...prev, name: transcript }));
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        toast({
          title: 'Speech Recognition Not Supported',
          description: 'Your browser does not support speech recognition.',
          variant: 'destructive',
        });
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
    } else {
      setTranscript('');
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  // Fetch tasks based on active tab
  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const type = activeTab === 'due' ? 'due' : 'pending';
      const response = await fetch(`/api/tasks?type=${type}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch tasks');
      }
      
      const data = await response.json();
      console.log('Fetched tasks:', data);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks from Notion. Please check your Notion integration settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.name.trim()) {
        toast({
          title: 'Error',
          description: 'Task name is required',
          variant: 'destructive',
        });
        return;
      }

      // Map the task properties to match Notion's expected property names
      const notionTask = {
        name: newTask.name,
        status: newTask.status,
        dueDate: newTask.dueDate,
        priority: newTask.priority,
        notes: newTask.notes
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notionTask),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create task');
      }

      const result = await response.json();
      console.log('Task creation response:', result);

      // Reset form and close dialog
      setNewTask({
        name: '',
        status: 'Pending',
        priority: 'Medium',
      });
      setIsDialogOpen(false);
      
      // Refresh tasks
      fetchTasks();
      
      toast({
        title: 'Success',
        description: 'Task created successfully in Notion',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh tasks
      fetchTasks();
      
      toast({
        title: 'Success',
        description: `Task marked as ${status}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Helper function to render priority badge
  const renderPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="destructive">High</Badge>;
      case 'Medium':
        return <Badge variant="default">Medium</Badge>;
      case 'Low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full border-gray-800 bg-[#1e1e1e] shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800 pb-4">
        <CardTitle>Tasks</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1e1e1e] border border-gray-800 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Add New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="task-name" className="text-sm font-medium">Task Name</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className={`rounded-full ${isListening ? 'bg-red-500 text-white border-red-500' : 'border-gray-600'}`}
                    onClick={toggleListening}
                  >
                    <Mic className="h-4 w-4" />
                    {isListening && <span className="absolute top-0 right-0 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="task-name"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    placeholder="Enter task name or use voice input"
                    className="pr-10 border-gray-700 bg-gray-800 focus:border-blue-500"
                  />
                  {isListening && <div className="absolute bottom-0 left-0 w-full">
                    <VoiceWaveform className="h-1" />
                  </div>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date" className="text-sm font-medium">Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newTask.dueDate || ''}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="border-gray-700 bg-gray-800 focus:border-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value as 'Low' | 'Medium' | 'High' })}
                >
                  <SelectTrigger id="priority" className="border-gray-700 bg-gray-800 focus:border-blue-500">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newTask.notes || ''}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Add notes"
                  className="border-gray-700 bg-gray-800 focus:border-blue-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTask} className="bg-blue-600 hover:bg-blue-700 transition-colors">Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="due">Due Today</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending tasks. Add a new task to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateTaskStatus(task.id!, 'Completed')}
                          className="h-6 w-6"
                        >
                          <Circle className="h-5 w-5" />
                        </Button>
                        <span className="font-medium">{task.name}</span>
                        {renderPriorityBadge(task.priority)}
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      {task.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{task.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="due" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks due today.
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateTaskStatus(task.id!, 'Completed')}
                          className="h-6 w-6"
                        >
                          <Circle className="h-5 w-5" />
                        </Button>
                        <span className="font-medium">{task.name}</span>
                        {renderPriorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center mt-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        Due today
                      </div>
                      {task.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{task.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <span>Powered by Notion</span>
        <span>{tasks.length} tasks</span>
      </CardFooter>
    </Card>
  );
}