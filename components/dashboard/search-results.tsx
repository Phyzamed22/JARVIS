import { SearchResultItem } from "./search-result-item"
import type { SearchResult } from "@/lib/search-service"
import { Loader2 } from "lucide-react"

interface SearchResultsProps {
  query: string
  results: SearchResult[]
  isLoading?: boolean
  error?: string
}

export function SearchResults({ query, results, isLoading, error }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-gray-300">Searching for "{query}"...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-red-400 mb-2">Search Error</h3>
        <p className="text-gray-300">{error}</p>
        <p className="text-gray-400 text-sm mt-4">
          Please check your internet connection and try again. If the problem persists, the search API may be
          experiencing issues.
        </p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-primary mb-2">No Results Found</h3>
        <p className="text-gray-300">No results found for "{query}". Try a different search term.</p>
        <div className="mt-4 p-4 bg-primary/10 rounded-md">
          <p className="text-sm text-gray-300">Suggestions:</p>
          <ul className="list-disc list-inside text-sm text-gray-300 mt-2">
            <li>Check your spelling</li>
            <li>Try more general keywords</li>
            <li>Try different keywords</li>
            <li>Try fewer keywords</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-primary">Search Results for "{query}"</h3>
        <span className="text-xs text-gray-400">{results.length} results</span>
      </div>

      <div>
        {results.map((result) => (
          <SearchResultItem key={result.position} result={result} />
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-primary/20 text-center">
        <p className="text-sm text-gray-400">
          Want more results? Try refining your search or asking a more specific question.
        </p>
      </div>
    </div>
  )
}
