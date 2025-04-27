import { Client } from '@notionhq/client';
import notionLogger from './notion-logger';

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
  private isConfigured: boolean = false;

  constructor() {
    // Initialize the Notion client with the API token from environment variables
    const token = process.env.NOTION_API_TOKEN;
    if (!token) {
      notionLogger.logError('initialization', 'NOTION_API_TOKEN not set in environment variables');
    }
    
    this.client = new Client({
      auth: token,
    });
    
    // Get database IDs from environment variables
    this.tasksDatabaseId = process.env.NOTION_TASKS_DATABASE_ID || '';
    this.notesDatabaseId = process.env.NOTION_NOTES_DATABASE_ID || '';
    
    if (!this.tasksDatabaseId) {
      notionLogger.logError('initialization', 'NOTION_TASKS_DATABASE_ID not set in environment variables');
    }
    
    // Check if the database ID is in URL format and extract the ID portion
    if (this.tasksDatabaseId && this.tasksDatabaseId.includes('notion.so')) {
      try {
        // Extract the ID from the URL format
        const idMatch = this.tasksDatabaseId.match(/([a-zA-Z0-9]+)(?:\?v=|$)/);
        if (idMatch && idMatch[1]) {
          this.tasksDatabaseId = idMatch[1];
          notionLogger.logSuccess('id extraction', { 
            message: 'Extracted Notion database ID from URL',
            extractedId: this.tasksDatabaseId 
          });
        }
      } catch (error) {
        notionLogger.logError('id extraction', error);
      }
    }
    
    // Check if configuration is valid
    this.isConfigured = !!token && !!this.tasksDatabaseId;
    
    // Log initialization status
    const initStatus = {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tasksDatabaseId: this.tasksDatabaseId,
      hasTasksDB: !!this.tasksDatabaseId,
      hasNotesDB: !!this.notesDatabaseId,
      isConfigured: this.isConfigured
    };
    
    if (this.isConfigured) {
      notionLogger.logSuccess('initialization', initStatus);
    } else {
      notionLogger.logError('initialization', { message: 'Incomplete configuration', details: initStatus });
    }
    
    // Test connection if configured
    if (this.isConfigured) {
      this.testConnection();
    }
  }
  
  /**
   * Test the connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a single task to verify connectivity
      await this.getPendingTasks(1);
      notionLogger.logSuccess('connection test', { message: 'Successfully connected to Notion API' });
      return true;
    } catch (error) {
      notionLogger.logError('connection test', error);
      return false;
    }
  }

  /**
   * Create a new task in the Notion database
   */
  async createTask(task: NotionTask): Promise<any> {
    try {
      if (!this.tasksDatabaseId) {
        const error = new Error('Tasks database ID not configured');
        notionLogger.logError('create task', error);
        throw error;
      }

      notionLogger.logSuccess('create task attempt', { taskName: task.name, dueDate: task.dueDate });
      
      const response = await this.client.pages.create({
        parent: { database_id: this.tasksDatabaseId },
        properties: {
          name: {
            title: [
              {
                text: {
                  content: task.name,
                },
              },
            ],
          },
          status: {
            select: {
              name: task.status,
            },
          },
          ...(task.dueDate && {
            'due date': {
              date: {
                start: task.dueDate,
              },
            },
          }),
          ...(task.priority && {
            priority: {
              select: {
                name: task.priority,
              },
            },
          }),
          ...(task.notes && {
            notes: {
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

      notionLogger.logSuccess('create task', { 
        taskName: task.name, 
        taskId: response.id,
        status: 'success'
      });
      
      return response;
    } catch (error) {
      notionLogger.logError('create task', error);
      throw error;
    }
  }

  /**
   * Get all pending tasks from the Notion database
   * @param limit Optional limit on the number of tasks to return
   */
  async getPendingTasks(limit?: number): Promise<NotionTask[]> {
    try {
      if (!this.tasksDatabaseId) {
        throw new Error('Tasks database ID not configured');
      }

      if (!this.client.auth) {
        throw new Error('Notion API token not configured or invalid');
      }

      console.log(`Attempting to query Notion database: ${this.tasksDatabaseId}`);
      
      const queryParams: any = {
        database_id: this.tasksDatabaseId,
        filter: {
          property: 'status',
          select: {
            equals: 'Pending',
          },
        },
      };
      
      // Add page_size if limit is specified
      if (limit && limit > 0) {
        queryParams.page_size = limit;
      }

      const response = await this.client.databases.query(queryParams);
      console.log(`Successfully retrieved ${response.results.length} pending tasks from Notion`);

      return this.formatTaskResults(response.results);
    } catch (error: any) {
      console.error('Error fetching pending tasks from Notion:', error);
      // Log more detailed error information
      if (error.code) {
        console.error(`Notion API Error Code: ${error.code}`);
      }
      if (error.status) {
        console.error(`HTTP Status: ${error.status}`);
      }
      if (error.message) {
        console.error(`Error Message: ${error.message}`);
      }
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
          property: 'due date',
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
          status: {
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
        name: properties.name.title[0]?.text.content || 'Untitled Task',
        status: properties.status?.select?.name || 'Pending',
        dueDate: properties['due date']?.date?.start,
        priority: properties.priority?.select?.name,
        notes: properties.notes?.rich_text[0]?.text.content,
      };
    });
  }
}

// Export a singleton instance
const notionService = new NotionService();
export default notionService;