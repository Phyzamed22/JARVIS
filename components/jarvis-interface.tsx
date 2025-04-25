"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Send, VolumeX, Loader2 } from "lucide-react"
import { SearchResults } from "./dashboard/search-results"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// StatusBadge component
interface StatusBadgeProps {
  status: "idle" | "listening" | "thinking" | "speaking"
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "listening":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Listening...
        </Badge>
      )
    case "thinking":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          Thinking...
        </Badge>
      )
    case "speaking":
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          Speaking...
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
          Ready
        </Badge>
      )
  }
}

export function JarvisInterface() {
  // State variables
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle")
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello, I'm JARVIS. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioVolume, setAudioVolume] = useState(0)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchState, setSearchState] = useState({
    isVisible: false,
    query: "",
    results: [],
    isLoading: false,
    error: undefined
  })
  // Track if we're on a mobile device
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setUserInput(transcript)

          if (event.results[0].isFinal) {
            handleUserInput(transcript)
          }
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          setStatus("idle")
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)
          setStatus("idle")
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition. Please try Chrome or Edge.",
          variant: "destructive",
        })
      }
    }

    return () => {
      // Cleanup
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          console.error("Error stopping speech recognition", e)
        }
      }

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
      }

      if (speechSynthesisRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [toast])

  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setIsListening(true)
      setStatus("listening")
      setUserInput("")

      // Start monitoring audio volume for visualization
      setupAudioMonitoring()

      toast({
        title: "Listening",
        description: "Speak now...",
      })
    } catch (error) {
      console.error("Error starting speech recognition", error)
      toast({
        title: "Error",
        description: "Could not start listening. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Stop listening
  const stopListening = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      setIsListening(false)
      setStatus("idle")

      // Stop audio monitoring
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
        micStreamRef.current = null
      }
    } catch (error) {
      console.error("Error stopping speech recognition", error)
    }
  }

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Setup audio monitoring for visualization
  const setupAudioMonitoring = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia not supported")
        return
      }

      // Stop any existing stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream

      // Setup audio context and analyser
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const analyser = audioContextRef.current.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start monitoring volume
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        if (!analyserRef.current || status !== "listening") return

        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
        setAudioVolume(average / 128) // Normalize to 0-1

        requestAnimationFrame(updateVolume)
      }

      updateVolume()
    } catch (error) {
      console.error("Error setting up audio monitoring", error)
    }
  }

  // Handle user input (from voice or text)
  const handleUserInput = async (input: string) => {
    if (!input.trim() || isProcessing) return

    // Check if it's a search command
    if (input.toLowerCase().startsWith('search for') || input.toLowerCase().startsWith('google')) {
      const query = input.toLowerCase().startsWith('search for') ? 
        input.slice('search for'.length).trim() : 
        input.slice('google'.length).trim()

      if (query) {
        setSearchState(prev => ({
          ...prev,
          isVisible: true,
          query,
          isLoading: true
        }))

        try {
          // Import and use the automation handler for search commands
          const { handleAutomationCommand } = await import('@/lib/voice-commands/automation-handler')
          const result = await handleAutomationCommand(`search for ${query}`)
          
          if (result.executed) {
            // Add a message to show the search was executed
            const searchMessage: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: `I've searched Google for "${query}" for you.`,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, searchMessage])
            
            // Update search state
            setSearchState(prev => ({
              ...prev,
              isLoading: false
            }))
            
            // Don't proceed with the regular AI response
            return
          }
        } catch (error) {
          setSearchState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Search failed',
            isLoading: false
          }))
        }
      }
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setUserInput("")
    setStatus("thinking")
    setIsProcessing(true)

    try {
      // Call API to get response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: "user",
              content: input,
            },
          ],
          conversationId,
        }),
      })

      const data = await response.json()

      // Check if there's an error in the response
      if (data.error) {
        console.warn("API warning:", data.error)
        toast({
          title: "Warning",
          description: "The AI had some trouble, but I'll still try to help.",
        })
      }

      // Update conversation ID if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Speak the response
      await speakResponse(data.text)
    } catch (error) {
      console.error("Error processing message", error)

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ])

      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      })

      setStatus("idle")
    } finally {
      setIsProcessing(false)
    }
  }

  // Speak the response using TTS
  const speakResponse = async (text: string) => {
    try {
      setStatus("speaking")
      setIsSpeaking(true)

      // Use browser's built-in speech synthesis as a reliable fallback
      if (window.speechSynthesis) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text)
        speechSynthesisRef.current = utterance

        // Set properties
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        utterance.lang = "en-US"

        // Try to use a good voice if available
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(
          (voice) => voice.name.includes("Google") || voice.name.includes("Premium") || voice.name.includes("Enhanced"),
        )
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        // Set event handlers
        utterance.onstart = () => {
          setIsSpeaking(true)
        }

        utterance.onend = () => {
          setIsSpeaking(false)
          setStatus("idle")
          speechSynthesisRef.current = null
        }

        utterance.onerror = (event) => {
          console.error("Speech synthesis error", event)
          setIsSpeaking(false)
          setStatus("idle")
          speechSynthesisRef.current = null
        }

        // Speak the text
        window.speechSynthesis.speak(utterance)
      } else {
        // No speech synthesis available
        setIsSpeaking(false)
        setStatus("idle")
      }
    } catch (error) {
      console.error("Error speaking response", error)
      setIsSpeaking(false)
      setStatus("idle")
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim() && !isProcessing) {
      handleUserInput(userInput)
    }
  }

  // Stop speaking
  const stopSpeaking = () => {
    if (speechSynthesisRef.current && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setStatus("idle")
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Search Results Panel */}
      {searchState.isVisible && (
        <div className="mb-4">
          <SearchResults
            query={searchState.query}
            results={searchState.results}
            isLoading={searchState.isLoading}
            error={searchState.error}
          />
        </div>
      )}
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-2 bg-primary">
            <AvatarFallback>J</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">JARVIS</h2>
            <StatusBadge status={status} />
          </div>
        </div>

        {isSpeaking && (
          <Button variant="outline" size="sm" onClick={stopSpeaking} className="flex items-center">
            <VolumeX className="h-4 w-4 mr-1" />
            Stop Speaking
          </Button>
        )}
      </div>

      {/* Messages container */}
      <Card className="flex-1 overflow-y-auto mb-4 border-primary/20">
        <CardContent className="p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Voice activity visualization */}
      {isListening && (
        <div className="mb-4 flex justify-center">
          <div className="flex items-center space-x-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 bg-primary rounded-full transition-all duration-200"
                style={{
                  height: `${Math.max(15, audioVolume * 100 * (0.5 + Math.sin(i / 2) * 0.5))}%`,
                  opacity: 0.6 + i / 10,
                }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`h-14 w-14 rounded-full ${
            isListening ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
          }`}
        >
          {isListening ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </Button>

        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Type a message..."}
            disabled={isListening || isProcessing}
            className="flex-1 rounded-l-md border border-r-0 border-primary/30 bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button type="submit" disabled={!userInput.trim() || isProcessing || isSpeaking} className="rounded-l-none">
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
