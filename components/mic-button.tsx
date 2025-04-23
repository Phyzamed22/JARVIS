"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { getSpeechRecognitionService } from "@/lib/speech-recognition"

interface MicButtonProps {
  onTranscript: (transcript: string) => void
  isDisabled?: boolean
  size?: "sm" | "md" | "lg"
}

export function MicButton({ onTranscript, isDisabled = false, size = "md" }: MicButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize speech recognition
  useEffect(() => {
    const speechService = getSpeechRecognitionService()

    if (speechService) {
      setIsSupported(speechService.isSupported())

      // Set up callbacks
      speechService.onResult((text, isFinal) => {
        setTranscript(text)
        if (isFinal) {
          onTranscript(text)
          setIsListening(false)
        }
      })

      speechService.onEnd(() => {
        setIsListening(false)
      })

      speechService.onError((error) => {
        console.error("Speech recognition error:", error)
        setIsListening(false)
      })
    } else {
      setIsSupported(false)
    }

    setIsInitializing(false)
  }, [onTranscript])

  // Toggle listening state
  const toggleListening = () => {
    if (isDisabled) return

    const speechService = getSpeechRecognitionService()
    if (!speechService) return

    if (isListening) {
      speechService.stopListening()
      setIsListening(false)
    } else {
      setTranscript("")
      const started = speechService.startListening()
      setIsListening(started)
    }
  }

  // Determine button size
  const buttonSize = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  }[size]

  // Determine icon size
  const iconSize = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  }[size]

  if (isInitializing) {
    return (
      <button className={`${buttonSize} rounded-full bg-gray-700 flex items-center justify-center`} disabled={true}>
        <Loader2 className={`${iconSize} animate-spin text-gray-400`} />
      </button>
    )
  }

  if (!isSupported) {
    return (
      <button
        className={`${buttonSize} rounded-full bg-gray-700 flex items-center justify-center opacity-50 cursor-not-allowed`}
        disabled={true}
        title="Speech recognition not supported in this browser"
      >
        <MicOff className={`${iconSize} text-gray-400`} />
      </button>
    )
  }

  return (
    <button
      onClick={toggleListening}
      disabled={isDisabled}
      className={`${buttonSize} rounded-full ${
        isListening ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
      } flex items-center justify-center transition-colors ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? <MicOff className={`${iconSize} text-white`} /> : <Mic className={`${iconSize} text-white`} />}
    </button>
  )
}
