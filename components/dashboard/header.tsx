"use client"

import { useState, useEffect } from "react"
import { Menu, Bell, Settings, User } from "lucide-react"

export function Header() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <header className="glass flex items-center justify-between p-4 mb-6">
      <div className="flex items-center">
        <div className="mr-4">
          <Menu className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          JARVIS
        </h1>
      </div>

      <div className="flex items-center space-x-6">
        <div className="text-sm text-gray-300">
          {time.toLocaleDateString()} | {time.toLocaleTimeString()}
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-5 w-5 text-gray-300 hover:text-primary transition-colors" />
          <Settings className="h-5 w-5 text-gray-300 hover:text-primary transition-colors" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <User className="h-5 w-5 text-background" />
          </div>
        </div>
      </div>
    </header>
  )
}
