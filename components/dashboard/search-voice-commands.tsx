"use client"

import { useState } from "react"
import { Mic, ChevronDown, ChevronUp } from "lucide-react"

export function SearchVoiceCommands() {
  const [isExpanded, setIsExpanded] = useState(false)

  const commandCategories = [
    {
      name: "Basic Search",
      commands: [
        { trigger: "search for [query]", description: "Performs a web search and summarizes results" },
        { trigger: "web search [query]", description: "Shows detailed search results" },
        { trigger: "open search page", description: "Opens the search interface" },
      ],
    },
    {
      name: "Specialized Search",
      commands: [
        { trigger: "news about [topic]", description: "Searches for latest news" },
        { trigger: "define [term]", description: "Looks up definitions" },
        { trigger: "how to [task]", description: "Finds step-by-step guides" },
        { trigger: "compare [A] and [B]", description: "Compares different items" },
        { trigger: "facts about [topic]", description: "Finds interesting facts" },
        { trigger: "summarize [topic]", description: "Creates a brief overview" },
        { trigger: "reviews for [product]", description: "Finds product reviews" },
      ],
    },
    {
      name: "Search History",
      commands: [
        { trigger: "search history", description: "Shows your recent searches" },
        { trigger: "clear search history", description: "Deletes your search history" },
      ],
    },
  ]

  return (
    <div className="glass-card p-4 mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center text-primary"
      >
        <div className="flex items-center">
          <Mic className="h-4 w-4 mr-2" />
          <h3 className="text-sm font-medium">Voice Search Commands</h3>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-gray-300">
            Use these voice commands to search more efficiently. Just speak the command followed by your query.
          </p>

          {commandCategories.map((category) => (
            <div key={category.name} className="space-y-2">
              <h4 className="text-xs font-medium text-gray-400">{category.name}</h4>
              <div className="space-y-1">
                {category.commands.map((command) => (
                  <div key={command.trigger} className="flex text-xs">
                    <span className="text-primary font-mono w-1/2 truncate">"{command.trigger}"</span>
                    <span className="text-gray-300 ml-2">{command.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-400 italic">
            Tip: You can combine commands, like "Hey JARVIS, find news about artificial intelligence"
          </p>
        </div>
      )}
    </div>
  )
}
