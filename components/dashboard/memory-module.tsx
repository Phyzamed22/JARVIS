"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, AlertTriangle, Info } from "lucide-react"
import { getMemories, createMemory, deleteMemory } from "@/app/actions/memory"
import { useToast } from "@/components/ui/use-toast"

export function MemoryModule() {
  const [memories, setMemories] = useState([])
  const [newMemory, setNewMemory] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    async function loadMemories() {
      setLoading(true)
      try {
        const result = await getMemories()

        if (result.error) {
          setError(result.error)
          setWarning(null)
          toast({
            title: "Database Notice",
            description: result.error,
            variant: result.error.includes("doesn't exist yet") ? "default" : "destructive",
          })
        } else if (result.warning) {
          setWarning(result.warning)
          setError(null)
          toast({
            title: "Memory Storage Notice",
            description: result.warning,
            variant: "default",
          })
        } else {
          setError(null)
          setWarning(null)
        }

        setMemories(result.memories || [])
      } catch (err) {
        console.error("Error loading memories:", err)
        setError("Failed to load memories. Using local storage instead.")
        setMemories([])
        toast({
          title: "Error",
          description: "Failed to load memories. Using local storage instead.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadMemories()
  }, [toast])

  async function handleCreateMemory(e) {
    e.preventDefault()

    try {
      const result = await createMemory(newMemory)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setNewMemory("")

        try {
          const updatedMemories = await getMemories()
          setMemories(updatedMemories.memories || [])
        } catch (err) {
          console.error("Error refreshing memories:", err)
        }

        if (result.warning) {
          setWarning(result.warning)
          toast({
            title: "Memory Storage Notice",
            description: result.warning,
            variant: "default",
          })
        } else {
          setWarning(null)
          toast({
            title: "Success",
            description: "Memory created successfully",
          })
        }
      }
    } catch (err) {
      console.error("Error creating memory:", err)
      toast({
        title: "Error",
        description: "Failed to create memory. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteMemory(id) {
    try {
      const result = await deleteMemory(id)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        try {
          const updatedMemories = await getMemories()
          setMemories(updatedMemories.memories || [])
        } catch (err) {
          console.error("Error refreshing memories:", err)
          // Remove the deleted memory from the local state
          setMemories((prev) => prev.filter((memory) => memory.id !== id))
        }

        if (result.warning) {
          setWarning(result.warning)
          toast({
            title: "Memory Storage Notice",
            description: result.warning,
            variant: "default",
          })
        } else {
          setWarning(null)
          toast({
            title: "Success",
            description: "Memory deleted successfully",
          })
        }
      }
    } catch (err) {
      console.error("Error deleting memory:", err)
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {error && (
        <div
          className={`${error.includes("doesn't exist yet") ? "bg-yellow-900/30 border-yellow-600/30 text-yellow-200" : "bg-red-900/30 border-red-600/30 text-red-200"} px-4 py-3 rounded mb-4 border text-sm`}
        >
          <p className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <strong>{error.includes("doesn't exist yet") ? "Notice:" : "Database Error:"}</strong> {error}
          </p>
        </div>
      )}

      {warning && (
        <div className="bg-blue-900/30 border-blue-600/30 text-blue-200 px-4 py-3 rounded mb-4 border text-sm">
          <p className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <strong>Storage Notice:</strong> {warning}
          </p>
        </div>
      )}

      <form onSubmit={handleCreateMemory} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Store a new memory..."
            className="flex-1 bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
          />
          <button
            type="submit"
            disabled={!newMemory.trim()}
            className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-md disabled:opacity-50 disabled:hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="circular-progress">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" stroke="#0f172a" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="url(#blue-gradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray="213.52"
                  strokeDashoffset="53.38"
                  className="animate-rotate"
                />
                <defs>
                  <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(56, 189, 248)" />
                    <stop offset="100%" stopColor="rgb(20, 184, 166)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        ) : memories.length > 0 ? (
          memories.map((memory) => (
            <div key={memory.id} className="glass-card p-3 flex justify-between items-start group">
              <div className="flex-1">
                <p className="text-gray-200">{memory.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(memory.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleDeleteMemory(memory.id)}
                className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">No memories found. Create your first memory above.</div>
        )}
      </div>
    </div>
  )
}
