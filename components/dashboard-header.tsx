import { CircleUser, Command, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DatabaseStatusIndicator } from "@/components/database-status"

export function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">JARVIS Dashboard</h1>
        <p className="text-muted-foreground">Monitor and manage your AI assistant system</p>
      </div>
      <div className="flex items-center gap-2">
        <DatabaseStatusIndicator />
        <Button variant="outline" size="sm">
          <Command className="mr-2 h-4 w-4" />
          Commands
        </Button>
        <Button variant="outline" size="sm">
          <CircleUser className="mr-2 h-4 w-4" />
          Users
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  )
}
