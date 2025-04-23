// Define the search result interface
import { getAIService } from "@/lib/ai-service"

export interface SearchResult {
  title: string
  link: string
  snippet: string
  position: number
  thumbnail?: string
  source?: string
  date?: string
  isVideo?: boolean
  isPdf?: boolean
  rating?: {
    value: number
    count: number
  }
  sitelinks?: {
    title: string
    link: string
  }[]
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  error?: string
}

export class SearchService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || process.env.NEXT_PUBLIC_SERPAPI_KEY
  }

  // Check if the search service is configured
  public isConfigured(): boolean {
    return !!this.apiKey
  }

  // Perform a search query
  public async search(query: string, numResults = 5): Promise<SearchResponse> {
    if (!query.trim()) {
      return {
        query,
        results: [],
        error: "Search query cannot be empty",
      }
    }

    try {
      // Instead of calling SerpAPI directly, use our own API endpoint
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, numResults }),
        // Add cache: 'no-store' to prevent caching issues
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Search API returned status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        return {
          query,
          results: [],
          error: data.error,
        }
      }

      return {
        query,
        results: data.results || [],
      }
    } catch (error) {
      console.error("Error performing search:", error)

      // If the search API fails, try to use AI to answer the query
      const aiService = getAIService()
      if (aiService.isConfigured()) {
        try {
          const aiResponse = await aiService.getResponse(
            `The user asked: "${query}". Please provide a helpful response based on your knowledge.`,
          )

          return {
            query,
            results: [
              {
                title: "AI-Generated Response",
                link: "",
                snippet: aiResponse.text,
                position: 1,
              },
            ],
          }
        } catch (aiError) {
          console.error("Error getting AI fallback response:", aiError)
        }
      }

      return {
        query,
        results: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Get a simplified answer from search results
  public async getAnswer(query: string): Promise<string> {
    try {
      if (!query.trim()) {
        return "Please provide a search query."
      }

      const searchResponse = await this.search(query)

      if (searchResponse.error || searchResponse.results.length === 0) {
        return `I couldn't find information about "${query}". ${searchResponse.error || "No results found."}`
      }

      // Use the AI to summarize the search results
      const aiService = getAIService()
      if (aiService.isConfigured()) {
        try {
          const searchContext = searchResponse.results
            .map((result) => `${result.title}: ${result.snippet}`)
            .join("\n\n")

          const aiResponse = await aiService.getResponse(
            `Based on these search results about "${query}", provide a concise and helpful answer:\n\n${searchContext}`,
          )

          return aiResponse.text
        } catch (aiError) {
          console.error("Error getting AI summary:", aiError)
          // Fall back to returning the first result if AI summarization fails
          const topResult = searchResponse.results[0]
          return `According to search results: ${topResult.snippet}`
        }
      }

      // If AI is not available, return the first result
      const topResult = searchResponse.results[0]
      return `According to search results: ${topResult.snippet}`
    } catch (error) {
      console.error("Error getting search answer:", error)
      return `I'm sorry, I encountered an error while searching for "${query}". ${error instanceof Error ? error.message : "Please try again later."}`
    }
  }
}

// Create a singleton instance
let searchServiceInstance: SearchService | null = null

// Get the search service instance
export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService()
  }
  return searchServiceInstance
}
