import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Bot } from "lucide-react"
import type { UserInteraction } from "@/lib/db"

interface RecentInteractionsProps {
  interactions: UserInteraction[]
}

export function RecentInteractions({ interactions }: RecentInteractionsProps) {
  if (interactions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No recent interactions found.</div>
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <div key={interaction.id} className="flex gap-3">
          <div className="flex-shrink-0 mt-1">
            {interaction.interaction_type === "user_message" ? (
              <MessageSquare className="h-5 w-5 text-primary" />
            ) : (
              <Bot className="h-5 w-5 text-secondary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{interaction.user_name || `User #${interaction.user_id}`}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mt-1 line-clamp-2">{interaction.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
