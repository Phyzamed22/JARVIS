"use server"

import { executeSql, initializeDatabase, isDatabaseAvailable } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Determine if we're in a preview environment
const isPreviewEnvironment = process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development"

// Initialize database before performing any operations
let dbInitialized = false
let dbAvailable = false

// Mock memory storage for when database is unavailable
// Using a global variable for server-side persistence during the session
let mockMemories: Map<string, { id: string; content: string; created_at: string }> = new Map()
let mockIdCounter = 1

// This function will be called on the server, so we need to ensure mockMemories is initialized
if (typeof mockMemories === "undefined") {
  mockMemories = new Map()
}

async function ensureDbInitialized() {
  // Skip database initialization in preview environments
  if (isPreviewEnvironment) {
    return {
      warning: "Using local storage in preview environment. Database features are disabled.",
      success: false,
    }
  }

  if (!dbInitialized) {
    // First check if database is available
    dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      return {
        error: "Database connection not available. Check your DATABASE_URL environment variable.",
        success: false,
      }
    }

    const result = await initializeDatabase()
    dbInitialized = result.success || false
    return result
  }
  return { success: dbInitialized }
}

export async function createMemory(content: string) {
  try {
    if (!content.trim()) {
      return { error: "Content cannot be empty" }
    }

    // In preview environments, always use mock storage
    if (isPreviewEnvironment) {
      const id = String(mockIdCounter++)
      mockMemories.set(id, {
        id,
        content,
        created_at: new Date().toISOString(),
      })

      revalidatePath("/")
      return {
        success: true,
        warning: "Using local storage in preview environment. Memories will not persist between sessions.",
      }
    }

    // For production, try to use the database
    const initResult = await ensureDbInitialized()

    if (!dbAvailable) {
      // Use mock storage if database is unavailable
      const id = String(mockIdCounter++)
      mockMemories.set(id, {
        id,
        content,
        created_at: new Date().toISOString(),
      })

      revalidatePath("/")
      return {
        success: true,
        warning: "Using local storage as database is unavailable. Memories will not persist between sessions.",
      }
    }

    if (initResult.error) {
      return { error: initResult.error }
    }

    await executeSql(
      `
      INSERT INTO memories (content, created_at)
      VALUES ($1, NOW())
    `,
      [content],
    )

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to create memory:", error)

    // Fallback to mock storage on error
    const id = String(mockIdCounter++)
    mockMemories.set(id, {
      id,
      content,
      created_at: new Date().toISOString(),
    })

    revalidatePath("/")
    return {
      success: true,
      warning: "Using local storage due to database error. Memories will not persist between sessions.",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function getMemories() {
  try {
    // In preview environments, always use mock storage
    if (isPreviewEnvironment) {
      const mockMemoriesArray = Array.from(mockMemories.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      return {
        memories: mockMemoriesArray,
        warning: "Using local storage in preview environment. Memories will not persist between sessions.",
      }
    }

    // For production, try to use the database
    dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return mock memories if database is unavailable
      const mockMemoriesArray = Array.from(mockMemories.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      return {
        memories: mockMemoriesArray,
        warning: "Using local storage as database is unavailable. Memories will not persist between sessions.",
      }
    }

    // Ensure database is initialized
    const initResult = await ensureDbInitialized()
    if (initResult.error) {
      return { error: initResult.error, memories: [] }
    }

    const result = await executeSql(`
      SELECT id, content, created_at
      FROM memories
      ORDER BY created_at DESC
    `)

    return { memories: result.rows }
  } catch (error) {
    console.error("Failed to fetch memories:", error)

    // Fallback to mock storage on error
    const mockMemoriesArray = Array.from(mockMemories.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return {
      warning: "Using local storage due to database error. Memories will not persist between sessions.",
      memories: mockMemoriesArray,
    }
  }
}

export async function deleteMemory(id: string) {
  try {
    // In preview environments, always use mock storage
    if (isPreviewEnvironment) {
      if (mockMemories.has(id)) {
        mockMemories.delete(id)
        revalidatePath("/")
        return {
          success: true,
          warning: "Using local storage in preview environment. Memories will not persist between sessions.",
        }
      }
      return { error: "Memory not found in local storage" }
    }

    // For production, try to use the database
    dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Delete from mock storage if database is unavailable
      if (mockMemories.has(id)) {
        mockMemories.delete(id)
        revalidatePath("/")
        return {
          success: true,
          warning: "Using local storage as database is unavailable. Memories will not persist between sessions.",
        }
      }
      return { error: "Memory not found in local storage" }
    }

    // Ensure database is initialized
    const initResult = await ensureDbInitialized()
    if (initResult.error) {
      return { error: initResult.error }
    }

    await executeSql(
      `
      DELETE FROM memories
      WHERE id = $1
    `,
      [id],
    )

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete memory:", error)
    return {
      error: "Failed to delete memory. Please check your database connection.",
    }
  }
}
