import { executeSql, isDatabaseAvailable } from "./db"

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

// Default profile for new users
const DEFAULT_PROFILE: UserProfile = {
  name: "User",
  tone: "casual",
  likes: ["productivity", "technology"],
  dislikes: ["delays", "complexity"],
  projects: { default: "Getting to know JARVIS" },
  ongoing_tasks: {},
  caffeine_intake: { today: 0, history: [] },
  interaction_count: 0,
  favorite_quotes: {
    quotes: [
      "The best way to predict the future is to invent it.",
      "Time you enjoy wasting is not wasted time.",
      "Done is better than perfect.",
      "Life is what happens when you're busy making other plans.",
      "The only way to do great work is to love what you do.",
    ],
  },
  productivity_stats: { focus_time: 0, tasks_completed: 0 },
  preferences: { theme: "dark", notification_level: "medium" },
}

// Local storage fallback for preview environments
const LOCAL_STORAGE_KEY = "jarvis_user_profile"

class UserProfileService {
  private currentProfile: UserProfile | null = null
  private isDbAvailable = false

  constructor() {
    this.init()
  }

  async init() {
    this.isDbAvailable = await isDatabaseAvailable()

    if (!this.isDbAvailable) {
      console.log("Database not available, using local storage for user profile")
      this.loadFromLocalStorage()
    }
  }

  private loadFromLocalStorage() {
    if (typeof window === "undefined") return

    try {
      const savedProfile = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedProfile) {
        this.currentProfile = JSON.parse(savedProfile)
      }
    } catch (error) {
      console.error("Error loading profile from local storage:", error)
    }
  }

  private saveToLocalStorage(profile: UserProfile) {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile))
    } catch (error) {
      console.error("Error saving profile to local storage:", error)
    }
  }

  async getCurrentProfile(): Promise<UserProfile> {
    // If we already have a profile loaded, return it
    if (this.currentProfile) {
      return this.currentProfile
    }

    if (!this.isDbAvailable) {
      // Create a default profile if none exists in local storage
      this.currentProfile = DEFAULT_PROFILE
      this.saveToLocalStorage(this.currentProfile)
      return this.currentProfile
    }

    try {
      // Try to get the first profile from the database
      const result = await executeSql("SELECT * FROM user_profile ORDER BY id LIMIT 1")

      if (result.rows && result.rows.length > 0) {
        this.currentProfile = result.rows[0]
        return this.currentProfile
      } else {
        // No profile exists, create a default one
        return await this.createProfile(DEFAULT_PROFILE)
      }
    } catch (error) {
      console.error("Error getting current profile:", error)
      // Fallback to default profile
      this.currentProfile = DEFAULT_PROFILE
      return this.currentProfile
    }
  }

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    if (!this.isDbAvailable) {
      this.currentProfile = { ...DEFAULT_PROFILE, ...profile }
      this.saveToLocalStorage(this.currentProfile)
      return this.currentProfile
    }

    try {
      const result = await executeSql(
        `INSERT INTO user_profile 
        (name, tone, likes, dislikes, projects, ongoing_tasks, caffeine_intake, 
        favorite_quotes, productivity_stats, preferences) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          profile.name || DEFAULT_PROFILE.name,
          profile.tone || DEFAULT_PROFILE.tone,
          profile.likes || DEFAULT_PROFILE.likes,
          profile.dislikes || DEFAULT_PROFILE.dislikes,
          JSON.stringify(profile.projects || DEFAULT_PROFILE.projects),
          JSON.stringify(profile.ongoing_tasks || DEFAULT_PROFILE.ongoing_tasks),
          JSON.stringify(profile.caffeine_intake || DEFAULT_PROFILE.caffeine_intake),
          JSON.stringify(profile.favorite_quotes || DEFAULT_PROFILE.favorite_quotes),
          JSON.stringify(profile.productivity_stats || DEFAULT_PROFILE.productivity_stats),
          JSON.stringify(profile.preferences || DEFAULT_PROFILE.preferences),
        ],
      )

      if (result.rows && result.rows.length > 0) {
        this.currentProfile = result.rows[0]
        return this.currentProfile
      }

      throw new Error("Failed to create profile")
    } catch (error) {
      console.error("Error creating profile:", error)
      // Fallback to local storage
      this.currentProfile = { ...DEFAULT_PROFILE, ...profile }
      this.saveToLocalStorage(this.currentProfile)
      return this.currentProfile
    }
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    if (!this.isDbAvailable) {
      this.currentProfile = { ...this.currentProfile, ...profile }
      this.saveToLocalStorage(this.currentProfile)
      return this.currentProfile
    }

    try {
      // Only update fields that are provided
      const updateFields: string[] = []
      const values: any[] = []
      let paramIndex = 1

      for (const [key, value] of Object.entries(profile)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`)

          // Convert objects to JSON strings for JSONB fields
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            values.push(JSON.stringify(value))
          } else {
            values.push(value)
          }

          paramIndex++
        }
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = $${paramIndex}`)
      values.push(new Date())
      paramIndex++

      // Add profile ID
      values.push(this.currentProfile.id)

      const result = await executeSql(
        `UPDATE user_profile SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values,
      )

      if (result.rows && result.rows.length > 0) {
        this.currentProfile = result.rows[0]
        return this.currentProfile
      }

      throw new Error("Failed to update profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      // Fallback to local storage
      this.currentProfile = { ...this.currentProfile, ...profile }
      this.saveToLocalStorage(this.currentProfile)
      return this.currentProfile
    }
  }

  async recordInteraction(interaction: Omit<UserInteraction, "user_id">): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    if (!this.isDbAvailable) {
      // Just update the interaction count in local storage
      this.currentProfile.interaction_count = (this.currentProfile.interaction_count || 0) + 1
      this.currentProfile.last_interaction = new Date()
      this.saveToLocalStorage(this.currentProfile)
      return
    }

    try {
      // Update the user profile's interaction count and last interaction time
      await this.updateProfile({
        interaction_count: (this.currentProfile.interaction_count || 0) + 1,
        last_interaction: new Date(),
      })

      // Record the interaction in the interactions table
      await executeSql(
        `INSERT INTO user_interactions 
        (user_id, interaction_type, content, metadata) 
        VALUES ($1, $2, $3, $4)`,
        [
          this.currentProfile.id,
          interaction.interaction_type,
          interaction.content,
          JSON.stringify(interaction.metadata || {}),
        ],
      )
    } catch (error) {
      console.error("Error recording interaction:", error)
    }
  }

  async getRecentInteractions(limit = 10): Promise<UserInteraction[]> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    if (!this.isDbAvailable) {
      return []
    }

    try {
      const result = await executeSql(
        `SELECT * FROM user_interactions 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2`,
        [this.currentProfile.id, limit],
      )

      return result.rows || []
    } catch (error) {
      console.error("Error getting recent interactions:", error)
      return []
    }
  }

  async updateCaffeineIntake(cups: number): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const today = new Date().toISOString().split("T")[0]

    // Get current caffeine intake
    const caffeineIntake = this.currentProfile.caffeine_intake || { today: 0, history: [] }

    // Update today's count
    caffeineIntake.today = (caffeineIntake.today || 0) + cups

    // Add to history
    const historyEntry = caffeineIntake.history.find((entry: any) => entry.date === today)
    if (historyEntry) {
      historyEntry.cups += cups
    } else {
      caffeineIntake.history.push({ date: today, cups })
    }

    // Update profile
    await this.updateProfile({ caffeine_intake: caffeineIntake })
  }

  async addProject(name: string, description: string): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const projects = this.currentProfile.projects || {}
    projects[name] = { description, created_at: new Date().toISOString() }

    await this.updateProfile({ projects })
  }

  async addTask(task: string, project?: string): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const tasks = this.currentProfile.ongoing_tasks || {}
    const taskId = Date.now().toString()

    tasks[taskId] = {
      description: task,
      project: project || "default",
      created_at: new Date().toISOString(),
      completed: false,
    }

    await this.updateProfile({ ongoing_tasks: tasks })
  }

  async completeTask(taskId: string): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const tasks = this.currentProfile.ongoing_tasks || {}

    if (tasks[taskId]) {
      tasks[taskId].completed = true
      tasks[taskId].completed_at = new Date().toISOString()

      // Update productivity stats
      const stats = this.currentProfile.productivity_stats || { focus_time: 0, tasks_completed: 0 }
      stats.tasks_completed = (stats.tasks_completed || 0) + 1

      await this.updateProfile({
        ongoing_tasks: tasks,
        productivity_stats: stats,
      })
    }
  }

  async getRandomQuote(): Promise<string> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const quotes = this.currentProfile.favorite_quotes?.quotes || DEFAULT_PROFILE.favorite_quotes.quotes
    const randomIndex = Math.floor(Math.random() * quotes.length)
    return quotes[randomIndex]
  }

  async addQuote(quote: string): Promise<void> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    const favoriteQuotes = this.currentProfile.favorite_quotes || { quotes: [] }
    favoriteQuotes.quotes.push(quote)

    await this.updateProfile({ favorite_quotes: favoriteQuotes })
  }

  async getUserContext(): Promise<string> {
    if (!this.currentProfile) {
      await this.getCurrentProfile()
    }

    // Format the user context as a string for the AI
    const profile = this.currentProfile

    const context = `
USER PROFILE:
Name: ${profile.name || "User"}
Preferred tone: ${profile.tone || "casual"}
Likes: ${(profile.likes || []).join(", ")}
Dislikes: ${(profile.dislikes || []).join(", ")}

PROJECTS:
${Object.entries(profile.projects || {})
  .map(([name, details]: [string, any]) => `- ${name}: ${details.description || "No description"}`)
  .join("\n")}

ONGOING TASKS:
${
  Object.entries(profile.ongoing_tasks || {})
    .filter(([_, task]: [string, any]) => !task.completed)
    .map(([id, task]: [string, any]) => `- ${task.description} (Project: ${task.project})`)
    .join("\n") || "No active tasks"
}

PREFERENCES:
${Object.entries(profile.preferences || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

STATS:
- Caffeine today: ${profile.caffeine_intake?.today || 0} cups
- Tasks completed: ${profile.productivity_stats?.tasks_completed || 0}
- Interactions: ${profile.interaction_count || 0}
- Last interaction: ${profile.last_interaction ? new Date(profile.last_interaction).toLocaleString() : "Never"}
`

    return context.trim()
  }
}

// Create a singleton instance
let userProfileServiceInstance: UserProfileService | null = null

// Get the user profile service instance
export function getUserProfileService(): UserProfileService {
  if (!userProfileServiceInstance) {
    userProfileServiceInstance = new UserProfileService()
  }
  return userProfileServiceInstance
}
