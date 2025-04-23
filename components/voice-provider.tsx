"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getVoiceService } from "@/lib/voice-service"
import { useToast } from "@/components/ui/use-toast"

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      const voiceService = getVoiceService()

      if (voiceService && voiceService.isSupported()) {
        setIsVoiceSupported(true)
      } else {
        console.warn("Voice recognition is not supported in this browser")
      }
    }
  }, [])

  return <>{children}</>
}
