"use client"

import { useState, useEffect } from "react"
import { Clock, ArrowUpRight, Search } from "lucide-react"
import { getSearchHistoryService, type SearchHistoryItem } from "@/lib/search-history-service"
import Link from "next/link"

export function CommandSearchHistory({ onSelectQuery }: { onSelectQuery: (query: string) => void }) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadHistory()
  }, [])

  const loadHistory = () => {
    const historyService = getSearchHistoryService()
    const searchHistory = historyService.getSearchHistory()
    setHistory(searchHistory.slice(0, 5)) // Only show the 5 most recent searches
  }

  if (!isClient || history.length === 0) {
    return null
  }

  return (
    <div className="mt-4 mb-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-400 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Recent Searches
        </h3>
        <Link href="/search" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center">
          View All
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectQuery(item.query)}
            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors flex items-center"
          >
            <Search className="h-3 w-3 mr-1.5 opacity-70" />
            {item.query.length > 25 ? `${item.query.substring(0, 25)}...` : item.query}
          </button>
        ))}
      </div>
    </div>
  )
}
