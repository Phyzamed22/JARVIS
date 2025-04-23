import { format } from "date-fns"
import { MessageSquare, Bot } from "lucide-react"
import type { UserInteraction } from "@/lib/db"

interface UserInteractionsListProps {
  interactions: UserInteraction[]
}

export function UserInteractionsList({ interactions }: UserInteractionsListProps) {
  if (interactions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No interactions found for this user</div>
  }

  return (
    <div className="space-y-6">
      {interactions.map((interaction) => (
        <div key={interaction.id} className="flex gap-4">
          <div className="flex-shrink-0 mt-1">
            {interaction.interaction_type === "user_message" ? (
              <div className="bg-primary/10 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="bg-secondary/10 p-2 rounded-full">
                <Bot className="h-5 w-5 text-secondary" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{interaction.interaction_type === "user_message" ? "User" : "JARVIS"}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(interaction.timestamp), "MMM d, yyyy h:mm a")}
              </span>
            </div>
            <p className="mt-1">{interaction.content}</p>

            {interaction.metadata && (
              <div className="mt-2 text-xs text-muted-foreground">
                {interaction.interaction_type === "user_message" ? (
                  <span>
                    via {interaction.metadata.source} ({interaction.metadata.device})
                  </span>
                ) : (
                  <span>
                    {interaction.metadata.model} ({interaction.metadata.tokens} tokens)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
