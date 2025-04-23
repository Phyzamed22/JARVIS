import { Zap, Search, Calendar, Mail, FileText, Settings } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const actions = [
    { icon: <Search className="h-5 w-5" />, label: "Search", color: "from-blue-400 to-blue-600", href: "/search" },
    { icon: <Calendar className="h-5 w-5" />, label: "Calendar", color: "from-purple-400 to-purple-600", href: "#" },
    { icon: <Mail className="h-5 w-5" />, label: "Mail", color: "from-green-400 to-green-600", href: "#" },
    { icon: <FileText className="h-5 w-5" />, label: "Documents", color: "from-yellow-400 to-yellow-600", href: "#" },
    { icon: <Zap className="h-5 w-5" />, label: "Tasks", color: "from-red-400 to-red-600", href: "#" },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", color: "from-gray-400 to-gray-600", href: "#" },
  ]

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-4 text-primary">Quick Actions</h2>

      <div className="grid grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="glass-card p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform"
          >
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center mb-2`}
            >
              {action.icon}
            </div>
            <span className="text-sm text-gray-300">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
