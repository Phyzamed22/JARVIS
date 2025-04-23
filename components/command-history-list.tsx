import { format } from "date-fns"
import { Terminal } from "lucide-react"
import type { CommandHistory } from "@/lib/db"
import { Badge } from "@/components/ui/badge"

interface CommandHistoryListProps {
  commands: CommandHistory[]
}

export function CommandHistoryList({ commands }: CommandHistoryListProps) {
  if (commands.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No command history found for this user</div>
  }

  return (
    <div className="space-y-4">
      {commands.map((command) => (
        <div key={command.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Terminal className="h-5 w-5 mt-1 text-primary" />
              <div>
                <div className="font-medium">{command.executed_task}</div>
                <div className="text-sm mt-1">{command.command_text}</div>

                {command.tags && command.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {command.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(command.timestamp), "MMM d, yyyy h:mm a")}
            </div>
          </div>

          {command.response_summary && (
            <div className="mt-3 text-sm text-muted-foreground border-t pt-2">{command.response_summary}</div>
          )}
        </div>
      ))}
    </div>
  )
}
