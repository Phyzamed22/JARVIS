// Maximum number of searches to store in history
const MAX_HISTORY_ITEMS = 10

export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: string
}

export class SearchHistoryService {
  private storageKey = "jarvis_search_history"

  // Get search history from localStorage
  public getSearchHistory(): SearchHistoryItem[] {
    if (typeof window === "undefined") {
      return []
    }

    try {
      const historyJson = localStorage.getItem(this.storageKey)
      if (!historyJson) {
        return []
      }

      return JSON.parse(historyJson)
    } catch (error) {
      console.error("Error retrieving search history:", error)
      return []
    }
  }

  // Add a search to history
  public addToHistory(query: string): SearchHistoryItem[] {
    if (typeof window === "undefined" || !query.trim()) {
      return []
    }

    try {
      const history = this.getSearchHistory()

      // Check if this query already exists in history
      const existingIndex = history.findIndex((item) => item.query.toLowerCase() === query.toLowerCase())

      // If it exists, remove it (we'll add it back at the top)
      if (existingIndex !== -1) {
        history.splice(existingIndex, 1)
      }

      // Create new history item
      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
      }

      // Add to the beginning of the array
      const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)

      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(updatedHistory))

      return updatedHistory
    } catch (error) {
      console.error("Error adding to search history:", error)
      return this.getSearchHistory()
    }
  }

  // Clear search history
  public clearHistory(): void {
    if (typeof window === "undefined") {
      return
    }

    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error("Error clearing search history:", error)
    }
  }

  // Remove a specific search from history
  public removeFromHistory(id: string): SearchHistoryItem[] {
    if (typeof window === "undefined") {
      return []
    }

    try {
      const history = this.getSearchHistory()
      const updatedHistory = history.filter((item) => item.id !== id)
      localStorage.setItem(this.storageKey, JSON.stringify(updatedHistory))
      return updatedHistory
    } catch (error) {
      console.error("Error removing from search history:", error)
      return this.getSearchHistory()
    }
  }
}

// Create a singleton instance
let searchHistoryServiceInstance: SearchHistoryService | null = null

// Get the search history service instance
export function getSearchHistoryService(): SearchHistoryService {
  if (!searchHistoryServiceInstance) {
    searchHistoryServiceInstance = new SearchHistoryService()
  }
  return searchHistoryServiceInstance
}
