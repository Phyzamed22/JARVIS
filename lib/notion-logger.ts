/**
 * Notion Logger
 * 
 * This utility provides enhanced logging for Notion API interactions,
 * helping to diagnose connectivity issues and track task operations.
 */

interface NotionLogEntry {
  timestamp: string;
  operation: string;
  status: 'success' | 'error';
  details?: any;
  errorMessage?: string;
}

class NotionLogger {
  private logs: NotionLogEntry[] = [];
  private maxLogEntries = 100;
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
    console.log('Notion Logger initialized with debug mode:', debugMode);
  }

  /**
   * Log a successful Notion operation
   */
  logSuccess(operation: string, details?: any): void {
    this.addLogEntry({
      timestamp: new Date().toISOString(),
      operation,
      status: 'success',
      details
    });

    if (this.debugMode) {
      console.log(`✅ Notion ${operation} successful:`, details || '');
    }
  }

  /**
   * Log a failed Notion operation
   */
  logError(operation: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.addLogEntry({
      timestamp: new Date().toISOString(),
      operation,
      status: 'error',
      errorMessage
    });

    // Always log errors to console regardless of debug mode
    console.error(`❌ Notion ${operation} failed:`, errorMessage);
    
    // If it's an API error with more details, log those too
    if (error.code && error.status) {
      console.error(`Notion API Error - Code: ${error.code}, Status: ${error.status}`);
    }
  }

  /**
   * Log a connection attempt to Notion
   */
  logConnectionAttempt(success: boolean, details?: any): void {
    if (success) {
      this.logSuccess('connection', details);
    } else {
      this.logError('connection', details || 'Connection failed');
    }
  }

  /**
   * Check if Notion is properly configured
   */
  checkConfiguration(): { isConfigured: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for required environment variables
    if (!process.env.NOTION_API_TOKEN) {
      issues.push('NOTION_API_TOKEN is not set in environment variables');
    }
    
    if (!process.env.NOTION_TASKS_DATABASE_ID) {
      issues.push('NOTION_TASKS_DATABASE_ID is not set in environment variables');
    }
    
    const isConfigured = issues.length === 0;
    
    // Log the configuration check
    if (isConfigured) {
      this.logSuccess('configuration check', { message: 'Notion properly configured' });
    } else {
      this.logError('configuration check', { message: 'Notion configuration issues', issues });
    }
    
    return { isConfigured, issues };
  }

  /**
   * Get recent logs for display
   */
  getRecentLogs(count = 10): NotionLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; byOperation: Record<string, number> } {
    const errors = this.logs.filter(log => log.status === 'error');
    const byOperation: Record<string, number> = {};
    
    errors.forEach(error => {
      byOperation[error.operation] = (byOperation[error.operation] || 0) + 1;
    });
    
    return {
      total: errors.length,
      byOperation
    };
  }

  /**
   * Add a log entry and maintain maximum log size
   */
  private addLogEntry(entry: NotionLogEntry): void {
    this.logs.push(entry);
    
    // Keep logs under the maximum size
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`Notion Logger debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create a singleton instance
const notionLogger = new NotionLogger(
  process.env.NODE_ENV === 'development' || process.env.DEBUG_NOTION === 'true'
);

export default notionLogger;