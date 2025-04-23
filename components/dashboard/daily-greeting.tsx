"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getUserProfileService } from "@/lib/user-profile-service"
import { Card, CardContent } from "@/components/ui/card"
import { Coffee, Sun, Moon, CloudRain, CloudSnow, Wind } from "lucide-react"

export function DailyGreeting() {
  const [quote, setQuote] = useState("")
  const [greeting, setGreeting] = useState("")
  const [userName, setUserName] = useState("")
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(null)
  const [caffeineCount, setCaffeineCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileService = getUserProfileService()
        const profile = await profileService.getCurrentProfile()

        // Get random quote
        const randomQuote = await profileService.getRandomQuote()
        setQuote(randomQuote)

        // Set user name
        setUserName(profile.name || "User")

        // Set caffeine count
        setCaffeineCount(profile.caffeine_intake?.today || 0)

        // Set greeting based on time of day
        const hour = new Date().getHours()
        let timeGreeting = ""

        if (hour < 12) {
          timeGreeting = "Good morning"
          setWeatherIcon(<Sun className="h-5 w-5 text-yellow-400" />)
        } else if (hour < 18) {
          timeGreeting = "Good afternoon"
          setWeatherIcon(<Sun className="h-5 w-5 text-yellow-400" />)
        } else {
          timeGreeting = "Good evening"
          setWeatherIcon(<Moon className="h-5 w-5 text-blue-400" />)
        }

        // Randomly select a weather icon for variety
        const randomWeather = Math.random()
        if (randomWeather < 0.2) {
          setWeatherIcon(<CloudRain className="h-5 w-5 text-blue-400" />)
        } else if (randomWeather < 0.3) {
          setWeatherIcon(<CloudSnow className="h-5 w-5 text-blue-200" />)
        } else if (randomWeather < 0.4) {
          setWeatherIcon(<Wind className="h-5 w-5 text-gray-400" />)
        }

        // Add some personality to the greeting
        const greetings = [
          `${timeGreeting}, ${profile.name || "User"}! Ready to crush it today?`,
          `${timeGreeting}! Let's make today amazing, ${profile.name || "User"}!`,
          `Hey ${profile.name || "User"}! ${timeGreeting}. What's on the agenda?`,
          `${timeGreeting}, ${profile.name || "User"}! Let's get this bread!`,
          `${timeGreeting}! Looking good, ${profile.name || "User"}!`,
        ]

        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]
        setGreeting(randomGreeting)
      } catch (error) {
        console.error("Error loading daily greeting:", error)
        setGreeting("Hello! Welcome back!")
        setQuote("The best way to predict the future is to invent it.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4">
          <div className="h-6 w-2/3 bg-primary/20 rounded mb-4"></div>
          <div className="h-4 w-full bg-primary/10 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-primary flex items-center">
            {weatherIcon}
            <span className="ml-2">{greeting}</span>
          </h3>

          {caffeineCount > 0 && (
            <div className="flex items-center text-sm text-gray-400">
              <Coffee className="h-4 w-4 mr-1" />
              <span>{caffeineCount} today</span>
            </div>
          )}
        </div>

        <blockquote className="border-l-2 border-primary/30 pl-3 italic text-gray-300">"{quote}"</blockquote>
      </CardContent>
    </Card>
  )
}
