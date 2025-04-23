"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Clock, X, Trash2 } from "lucide-react"
import { getSearchHistoryService, type SearchHistoryItem } from "@/lib/search-history-service"

interface SearchHistoryProps {
  onSelectQuery: (query: string) => void
}

export function SearchHistory({ onSelectQuery }: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadHistory()
  }, [])

  const loadHistory = () => {
    const historyService = getSearchHistoryService()
    const searchHistory = historyService.getSearchHistory()
    setHistory(searchHistory)
  }

  const handleClearHistory = () => {
    const historyService = getSearchHistoryService()
    historyService.clearHistory()
    setHistory([])
  }

  const handleRemoveItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent triggering the parent click
    const historyService = getSearchHistoryService()
    const updatedHistory = historyService.removeFromHistory(id)
    setHistory(updatedHistory)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    // If it's today, just show the time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // If it's yesterday
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // Otherwise show the full date
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isClient || history.length === 0) {
    return null
  }

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-primary flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Recent Searches
        </h3>
        <button
          onClick={handleClearHistory}
          className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear History
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectQuery(item.query)}
            className="flex justify-between items-center p-2 rounded-md hover:bg-primary/10 cursor-pointer group transition-colors"
          >
            <div className="flex-1">
              <p className="text-gray-200 text-sm truncate">{item.query}</p>
              <p className="text-xs text-gray-400">{formatDate(item.timestamp)}</p>
            </div>
            <button
              onClick={(e) => handleRemoveItem(e, item.id)}
              className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove from history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
