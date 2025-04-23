"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Search,
  BookOpen,
  Calendar,
  CheckSquare,
  Settings,
  BarChart,
  Headphones,
  Mic,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Search", href: "/search", icon: Search },
  { name: "Study", href: "/study", icon: BookOpen },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart },
  { name: "Voice", href: "/voice", icon: Mic },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-16 flex-col items-center border-r bg-muted/40 py-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Headphones className="h-6 w-6" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex h-14 w-14 flex-col items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
              pathname === item.href && "bg-primary/10 text-primary",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="mt-1 text-xs">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-xl">
          <div className="flex flex-col items-center">
            <Settings className="h-5 w-5" />
            <span className="mt-1 text-xs">Settings</span>
          </div>
        </Button>
        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-xl">
          <div className="flex flex-col items-center">
            <HelpCircle className="h-5 w-5" />
            <span className="mt-1 text-xs">Help</span>
          </div>
        </Button>
      </div>
    </div>
  )
}
