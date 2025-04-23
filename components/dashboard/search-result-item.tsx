import { ExternalLink, FileText, Video, Star, Calendar, ChevronRight } from "lucide-react"
import type { SearchResult } from "@/lib/search-service"

interface SearchResultItemProps {
  result: SearchResult
}

export function SearchResultItem({ result }: SearchResultItemProps) {
  // Format the URL for display
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return `${urlObj.hostname}${urlObj.pathname.length > 1 ? urlObj.pathname : ""}`
    } catch (e) {
      return url
    }
  }

  // Format the date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return null

    try {
      const date = new Date(dateString)
      // Check if it's a valid date
      if (isNaN(date.getTime())) return dateString

      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="border-b border-primary/20 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <div className="flex gap-4">
        {/* Thumbnail if available */}
        {result.thumbnail && (
          <div className="hidden sm:block flex-shrink-0">
            <div className="w-24 h-24 rounded-md overflow-hidden bg-gray-800 relative">
              <img
                src={result.thumbnail || "/placeholder.svg"}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide the image if it fails to load
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title and link */}
          <a href={result.link} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start">
            <h3 className="text-primary group-hover:text-primary/80 transition-colors font-medium mb-1 pr-6 relative">
              {result.title}
              <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors absolute right-0 top-1" />
            </h3>
          </a>

          {/* URL and metadata */}
          <div className="flex flex-wrap items-center text-xs text-gray-400 mb-2 gap-x-3 gap-y-1">
            <span className="truncate max-w-[200px]">{formatUrl(result.link)}</span>

            {result.isPdf && (
              <span className="flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </span>
            )}

            {result.isVideo && (
              <span className="flex items-center">
                <Video className="h-3 w-3 mr-1" />
                Video
              </span>
            )}

            {result.date && (
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(result.date)}
              </span>
            )}

            {result.rating && (
              <span className="flex items-center">
                <Star className="h-3 w-3 mr-1 text-yellow-400 fill-yellow-400" />
                {result.rating.value.toFixed(1)}
                {result.rating.count > 0 && <span className="ml-1">({result.rating.count})</span>}
              </span>
            )}
          </div>

          {/* Snippet */}
          <p className="text-sm text-gray-300 mb-2">{result.snippet}</p>

          {/* Sitelinks if available */}
          {result.sitelinks && result.sitelinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {result.sitelinks.map((link, index) => (
                <a
                  key={index}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-full transition-colors flex items-center"
                >
                  {link.title}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
