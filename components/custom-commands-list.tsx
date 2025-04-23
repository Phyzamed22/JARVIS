import { format } from "date-fns"
import { Code2, Play, Pause } from "lucide-react"
import type { CustomCommand } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CustomCommandsListProps {
  commands: CustomCommand[]
}

export function CustomCommandsList({ commands }: CustomCommandsListProps) {
  if (commands.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No custom commands found for this user</div>
  }

  return (
    <div className="space-y-4">
      {commands.map((command) => (
        <div key={command.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Code2 className="h-5 w-5 mt-1 text-primary" />
              <div>
                <div className="font-medium">{command.trigger_phrase}</div>
                <div className="text-sm text-muted-foreground mt-1">{command.description}</div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{command.action_type}</Badge>
                  {command.is_enabled ? (
                    <Badge variant="success" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs text-muted-foreground">
                Created {format(new Date(command.created_at), "MMM d, yyyy")}
              </div>
              <Button variant="ghost" size="icon">
                {command.is_enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {command.code_snippet && (
            <div className="mt-3 text-sm font-mono bg-muted p-2 rounded-md overflow-x-auto">
              <pre className="text-xs">
                {command.code_snippet.length > 100
                  ? command.code_snippet.substring(0, 100) + "..."
                  : command.code_snippet}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
