import { Client } from '@notionhq/client';

interface NotionTask {
  id?: string;
  name: string;
  dueDate?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

class NotionService {
  private client: Client;
  private tasksDatabaseId: string;
  private notesDatabaseId: string;

  constructor() {
    // Initialize the Notion client with the API token from environment variables
    const token = process.env.NOTION_API_TOKEN;
    if (!token) {
      console.error('NOTION_API_TOKEN not set in environment variables');
    }
    
    this.client = new Client({
      auth: token,
    });
    
    // Get database IDs from environment variables
    this.tasksDatabaseId = process.env.NOTION_TASKS_DATABASE_ID || '';
    this.notesDatabaseId = process.env.NOTION_NOTES_DATABASE_ID || '';
    
    if (!this.tasksDatabaseId) {
      console.error('NOTION_TASKS_DATABASE_ID not set in environment variables');
    }
    
    console.log('Notion Service initialized with:', {
      hasToken: !!token,
      hasTasksDB: !!this.tasksDatabaseId,
      hasNotesDB: !!this.notesDatabaseId
    });
  }

  /**
   * Create a new task in the Notion database
   */
  async createTask(task: NotionTask): Promise<any> {
    try {
      if (!this.tasksDatabaseId) {
        throw new Error('Tasks database ID not configured');
      }

      const response = await this.client.pages.create({
        parent: { database_id: this.tasksDatabaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: task.name,
                },
              },
            ],
          },
          Status: {
            select: {
              name: task.status,
            },
          },
          ...(task.dueDate && {
            'Due Date': {
              date: {
                start: task.dueDate,
              },
            },
          }),
          ...(task.priority && {
            Priority: {
              select: {
                name: task.priority,
              },
            },
          }),
          ...(task.notes && {
            Notes: {
              rich_text: [
                {
                  text: {
                    content: task.notes,
                  },
                },
              ],
            },
          }),
        },
      });

      return response;
    } catch (error) {
      console.error('Error creating task in Notion:', error);
      throw error;
    }
  }

  /**
   * Get all pending tasks from the Notion database
   */
  async getPendingTasks(): Promise<NotionTask[]> {
    try {
      if (!this.tasksDatabaseId) {
        throw new Error('Tasks database ID not configured');
      }

      const response = await this.client.databases.query({
        database_id: this.tasksDatabaseId,
        filter: {
          property: 'Status',
          select: {
            equals: 'Pending',
          },
        },
      });

      return this.formatTaskResults(response.results);
    } catch (error) {
      console.error('Error fetching pending tasks from Notion:', error);
      throw error;
    }
  }

  /**
   * Get tasks due today from the Notion database
   */
  async getDueTasks(): Promise<NotionTask[]> {
    try {
      if (!this.tasksDatabaseId) {
        throw new Error('Tasks database ID not configured');
      }

      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const response = await this.client.databases.query({
        database_id: this.tasksDatabaseId,
        filter: {
          property: 'Due Date',
          date: {
            equals: today,
          },
        },
      });

      return this.formatTaskResults(response.results);
    } catch (error) {
      console.error('Error fetching due tasks from Notion:', error);
      throw error;
    }
  }

  /**
   * Update a task's status in the Notion database
   */
  async updateTaskStatus(taskId: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<any> {
    try {
      const response = await this.client.pages.update({
        page_id: taskId,
        properties: {
          Status: {
            select: {
              name: status,
            },
          },
        },
      });

      return response;
    } catch (error) {
      console.error('Error updating task status in Notion:', error);
      throw error;
    }
  }

  /**
   * Helper method to format task results from Notion API
   */
  private formatTaskResults(results: any[]): NotionTask[] {
    return results.map((page) => {
      const properties = page.properties;
      
      return {
        id: page.id,
        name: properties.Name.title[0]?.text.content || 'Untitled Task',
        status: properties.Status?.select?.name || 'Pending',
        dueDate: properties['Due Date']?.date?.start,
        priority: properties.Priority?.select?.name,
        notes: properties.Notes?.rich_text[0]?.text.content,
      };
    });
  }
}

// Export a singleton instance
const notionService = new NotionService();
export default notionService;