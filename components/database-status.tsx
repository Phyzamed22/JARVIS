"use client"

import { useEffect, useState } from "react"
import { type DatabaseStatus, getDatabaseStatus } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Database, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

export function DatabaseStatusIndicator() {
  const [status, setStatus] = useState<DatabaseStatus>("connecting")
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const { status, error } = getDatabaseStatus()
      setStatus(status)
      setError(error ? error.message : null)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setChecking(true)
    try {
      const { status, error } = getDatabaseStatus()
      setStatus(status)
      setError(error ? error.message : null)
    } finally {
      setTimeout(() => setChecking(false), 1000)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleRefresh}>
            <Database className="h-4 w-4" />
            {status === "connected" && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {status === "connecting" && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                <RefreshCw className={`h-3 w-3 mr-1 ${checking ? "animate-spin" : ""}`} />
                Connecting
              </Badge>
            )}
            {status === "disconnected" && (
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">
                Disconnected
              </Badge>
            )}
            {status === "error" && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {status === "connected" && <p>Database is connected and working properly</p>}
          {status === "connecting" && <p>Attempting to connect to the database...</p>}
          {status === "disconnected" && <p>Database is disconnected. Click to retry connection.</p>}
          {status === "error" && (
            <div>
              <p>Database connection error:</p>
              <p className="text-xs text-red-400 mt-1">{error || "Unknown error"}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
