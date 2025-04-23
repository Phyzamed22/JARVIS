"use client"

import type React from "react"

import { useState } from "react"
import { SearchIcon, History, X } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { SearchResults } from "@/components/dashboard/search-results"
import { SearchHistory } from "@/components/dashboard/search-history"
import { SearchVoiceCommands } from "@/components/dashboard/search-voice-commands"
import { getSearchHistoryService } from "@/lib/search-history-service"
import type { SearchResult } from "@/lib/search-service"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setSearchQuery(query)
    setHasSearched(true)

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`Search request failed with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.results || [])

        // Add to search history
        const historyService = getSearchHistoryService()
        historyService.addToHistory(query)
      }
    } catch (err) {
      console.error("Error performing search:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectFromHistory = (selectedQuery: string) => {
    setQuery(selectedQuery)
    // Automatically search with the selected query
    const formEvent = { preventDefault: () => {} } as React.FormEvent
    handleSearch(formEvent)
  }

  const clearSearch = () => {
    setQuery("")
    setSearchResults([])
    setError(null)
    setHasSearched(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Header />

        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-primary flex items-center">
              <SearchIcon className="h-5 w-5 mr-2" />
              Web Search
            </h2>
            {hasSearched && (
              <button
                onClick={clearSearch}
                className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Search
              </button>
            )}
          </div>

          <form onSubmit={handleSearch} className="relative mb-6">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the web..."
                className="w-full bg-background/50 border border-primary/30 rounded-full py-3 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-14 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:hover:bg-primary/20"
              >
                <SearchIcon className="h-5 w-5 text-primary" />
              </button>
            </div>
          </form>

          {/* Show search history if no search has been performed yet */}
          {!hasSearched && <SearchHistory onSelectQuery={handleSelectFromHistory} />}

          {(isLoading || searchResults.length > 0 || error) && (
            <SearchResults
              query={searchQuery}
              results={searchResults}
              isLoading={isLoading}
              error={error || undefined}
            />
          )}

          {!hasSearched && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
                <History className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">Search the Web with JARVIS</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Enter your query above to search the web. You can also use voice commands like "search for [topic]" or
                "find information about [topic]" from the command center.
              </p>
            </div>
          )}

          {/* Voice commands help */}
          <SearchVoiceCommands />
        </div>
      </div>
    </div>
  )
}
