export interface CommandHistory {
  id: string
  user_id: string
  command_text: string
  executed_task: string
  timestamp: Date
  response_summary?: string
  tags?: string[]
}

export interface CustomCommand {
  id: string
  user_id: string
  trigger_phrase: string
  action_type: string
  code_snippet: string
  description: string
  is_enabled: boolean
  created_at: Date
}

export type DatabaseStatus = "connecting" | "connected" | "disconnected" | "error"

export interface UserProfile {
  id?: number
  name?: string
  tone?: string
  likes?: string[]
  dislikes?: string[]
  projects?: Record<string, any>
  ongoing_tasks?: Record<string, any>
  caffeine_intake?: Record<string, any>
  last_interaction?: Date
  interaction_count?: number
  favorite_quotes?: Record<string, any>
  productivity_stats?: Record<string, any>
  preferences?: Record<string, any>
}

export interface UserInteraction {
  id?: number
  user_id: number
  interaction_type: string
  content: string
  timestamp?: Date
  metadata?: Record<string, any>
}

export async function executeSql(query: TemplateStringsArray, params: any[] = []) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable not set")
    }
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL)
    return await sql(query, ...params)
  } catch (error) {
    console.error("Database query failed:", error)
    throw error
  }
}

export function getDatabaseStatus(): { status: DatabaseStatus; error?: Error } {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL environment variable not set")
      return { status: "disconnected", error: new Error("DATABASE_URL not set") }
    }
    return { status: "connected" }
  } catch (error: any) {
    console.error("Database connection test failed:", error)
    return { status: "error", error: error as Error }
  }
}

export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    await executeSql`
      CREATE TABLE IF NOT EXISTS user_profile (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        tone VARCHAR(50),
        likes TEXT[],
        dislikes TEXT[],
        projects JSONB,
        ongoing_tasks JSONB,
        caffeine_intake JSONB,
        last_interaction TIMESTAMP,
        interaction_count INTEGER DEFAULT 0,
        favorite_quotes JSONB,
        productivity_stats JSONB,
        preferences JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      );
    `

    await executeSql`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES user_profile(id),
        interaction_type VARCHAR(50),
        content TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      );
    `

    await executeSql`
      CREATE TABLE IF NOT EXISTS command_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        command_text TEXT,
        executed_task TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        response_summary TEXT,
        tags TEXT[]
      );
    `

    await executeSql`
      CREATE TABLE IF NOT EXISTS custom_commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        trigger_phrase VARCHAR(255),
        action_type VARCHAR(50),
        code_snippet TEXT,
        description TEXT,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    await executeSql`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at TIMESTAMP DEFAULT NOW()
      );
    `

    await executeSql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id),
        role VARCHAR(50),
        content TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        audio_url TEXT
      );
    `

    return { success: true }
  } catch (error: any) {
    console.error("Database initialization failed:", error)
    return { success: false, error: error.message }
  }
}

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL environment variable not set")
      return false
    }
    await executeSql`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}

export async function saveMessage(message: {
  conversationId: string
  role: string
  content: string
  audioUrl?: string
}) {
  try {
    const result = await executeSql`
      INSERT INTO messages (conversation_id, role, content, audio_url)
      VALUES (${message.conversationId}, ${message.role}, ${message.content}, ${message.audioUrl || null})
      RETURNING *
    `
    return result.rows[0]
  } catch (error) {
    console.error("Failed to save message:", error)
    throw error
  }
}

export async function createConversation(): Promise<{ id: string }> {
  try {
    const result = await executeSql`
      INSERT INTO conversations DEFAULT VALUES
      RETURNING id
    `
    return { id: result.rows[0].id }
  } catch (error) {
    console.error("Failed to create conversation:", error)
    throw error
  }
}

export async function getConversationMessages(conversationId: string, limit = 50): Promise<any[]> {
  try {
    const result = await executeSql`
      SELECT * FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY timestamp ASC
      LIMIT ${limit}
    `
    return result.rows
  } catch (error) {
    console.error("Failed to fetch conversation messages:", error)
    return []
  }
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  try {
    const result = await executeSql`
      SELECT * FROM user_profile
      WHERE id = ${userId}
    `
    return result.rows[0] || null
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return null
  }
}

export async function getUserInteractions(userId: number): Promise<UserInteraction[]> {
  try {
    const result = await executeSql`
      SELECT * FROM user_interactions
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
    `
    return result.rows || []
  } catch (error) {
    console.error("Failed to fetch user interactions:", error)
    return []
  }
}

export async function getCommandHistory(userId: number): Promise<CommandHistory[]> {
  try {
    const result = await executeSql`
      SELECT * FROM command_history
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
    `
    return result.rows || []
  } catch (error) {
    console.error("Failed to fetch command history:", error)
    return []
  }
}

export async function getCustomCommands(userId: number): Promise<CustomCommand[]> {
  try {
    const result = await executeSql`
      SELECT * FROM custom_commands
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    return result.rows || []
  } catch (error) {
    console.error("Failed to fetch custom commands:", error)
    return []
  }
}

export async function getConversations(limit = 50): Promise<any[]> {
  try {
    const result = await executeSql`
        SELECT * FROM conversations
        ORDER BY started_at DESC
        LIMIT ${limit}
      `
    return result.rows
  } catch (error) {
    console.error("Failed to fetch conversations:", error)
    return []
  }
}
