import { searchGoogle } from "../search-google"

/**
 * Handles voice commands related to Google search functionality.
 * Extracts search query from voice input and triggers browser search.
 */
export async function handleSearchCommand(text: string): Promise<boolean> {
  // Check if the command is a search request
  const searchTriggers = [
    "search for",
    "google",
    "look up",
    "find information about",
    "search"
  ]

  const lowerText = text.toLowerCase()
  const trigger = searchTriggers.find(t => lowerText.startsWith(t))

  if (!trigger) {
    return false
  }

  // Extract the search query by removing the trigger phrase
  const query = text.slice(trigger.length).trim()
  
  if (!query) {
    console.log("[Jarvis] No search query provided")
    return false
  }

  try {
    // Execute the search
    await searchGoogle(query)
    return true
  } catch (error) {
    console.error("[Jarvis] Error executing search:", error)
    return false
  }
}