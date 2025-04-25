"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Send, VolumeX, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VoiceProviderLiveKit } from "@/components/voice-provider-livekit"
import { getVoiceSettings } from "@/lib/voice-settings-service"

// Define turn states
const TURN_STATE = {
  IDLE: "idle",
  LISTENING: "listening",
  THINKING: "thinking",
  SPEAKING: "speaking",
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function JarvisAgent() {
  // State
  const [turnState, setTurnState] = useState(TURN_STATE.IDLE)
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello, I'm JARVIS. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [audioVolume, setAudioVolume] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [wasInterrupted, setWasInterrupted] = useState(false)
  const [useLiveKit, setUseLiveKit] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const interruptionCheckRef = useRef<number | null>(null)
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Add a ref to track when speaking starts to prevent self-triggering
  // Add this to the refs section
  const speakingStartTimeRef = useRef<number | null>(null)

  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  // Initialize LiveKit based on voice settings
  useEffect(() => {
    const settings = getVoiceSettings()
    setUseLiveKit(settings.livekitEnabled)
    
    // Check if LiveKit environment variables are set
    if (settings.livekitEnabled && (!settings.livekitServerUrl || !settings.livekitApiKey || !settings.livekitApiSecret)) {
      toast({
        title: "LiveKit Configuration Missing",
        description: "Please check your environment variables for LiveKit integration.",
        variant: "destructive",
      })
    }
  }, [])

  // Update the useEffect for speech recognition to better handle transitions
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

          // Ignore very short transcripts that might be noise or self-echo
          if (transcript.trim().length < 2) {
            return
          }

          setUserInput(transcript)

          if (event.results[0].isFinal) {
            // If we're in speaking state, this is an interruption
            if (turnState === TURN_STATE.SPEAKING) {
              // Only handle interruption if we're not at the very beginning of speaking
              // to avoid self-triggering
              if (speakingStartTimeRef.current && Date.now() - speakingStartTimeRef.current > 1000) {
                handleInterruption(transcript)
              }
            } else {
              handleUserInput(transcript)
            }
          }
        }

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended")

          // Only reset to IDLE if we're in LISTENING state
          // This prevents resetting when we're in THINKING or SPEAKING
          if (turnState === TURN_STATE.LISTENING) {
            // Instead of immediately going to IDLE, restart listening after a short delay
            // This creates a more continuous listening experience
            if (restartTimerRef.current) {
              clearTimeout(restartTimerRef.current)
            }

            restartTimerRef.current = setTimeout(() => {
              if (turnState === TURN_STATE.LISTENING) {
                // Try to restart listening
                try {
                  recognitionRef.current.start()
                  console.log("Restarted listening after end event")
                } catch (e) {
                  console.log("Could not restart listening, setting to IDLE", e)
                  setTurnState(TURN_STATE.IDLE)
                }
              }
            }, 100) // Reduced delay for more seamless experience
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.log("Speech recognition error", event.error)

          // Handle "no-speech" differently - this is normal and not an error
          if (event.error === "no-speech") {
            console.log("No speech detected, continuing to listen")

            // For no-speech, we want to keep listening
            if (turnState === TURN_STATE.LISTENING) {
              // Try to restart listening after a short delay
              if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current)
              }

              restartTimerRef.current = setTimeout(() => {
                if (turnState === TURN_STATE.LISTENING) {
                  try {
                    recognitionRef.current.start()
                    console.log("Restarted listening after no-speech")
                  } catch (e) {
                    console.log("Could not restart listening after no-speech", e)
                    setTurnState(TURN_STATE.IDLE)
                  }
                }
              }, 100) // Reduced delay for more seamless experience
            }
            return
          }

          // For other errors, we may want to go to IDLE
          if (turnState === TURN_STATE.LISTENING) {
            setTurnState(TURN_STATE.IDLE)
          }

          // Only show toast for errors other than no-speech
          if (event.error !== "no-speech") {
            toast({
              title: "Speech Recognition Error",
              description: `Error: ${event.error}. Please try again.`,
              variant: "destructive",
            })
          }
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

      if (interruptionCheckRef.current) {
        cancelAnimationFrame(interruptionCheckRef.current)
      }

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
      }
    }
  }, [toast, turnState])

  // Handle state transitions
  useEffect(() => {
    console.log("Turn state changed to:", turnState)

    switch (turnState) {
      case TURN_STATE.LISTENING:
        startListening()
        break
      case TURN_STATE.IDLE:
        // In a continuous conversation, we don't want to stay IDLE
        // After a short delay, transition to LISTENING
        const idleTimer = setTimeout(() => {
          if (turnState === TURN_STATE.IDLE) {
            setTurnState(TURN_STATE.LISTENING)
          }
        }, 1000)

        return () => clearTimeout(idleTimer)
        break
      case TURN_STATE.THINKING:
        // THINKING state is handled by the handleUserInput function
        break
      case TURN_STATE.SPEAKING:
        // SPEAKING state is handled by the speakResponse function
        // Make sure we're monitoring for interruptions
        setupAudioMonitoring()
        break
    }
  }, [turnState])

  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setTurnState(TURN_STATE.LISTENING)
      setUserInput("")

      // Start monitoring audio volume for visualization
      setupAudioMonitoring()

      toast({
        title: "Listening",
        description: "Speak now...",
      })
    } catch (error) {
      console.error("Error starting speech recognition", error)
      setTurnState(TURN_STATE.IDLE)
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

      // Only set to IDLE if we're in LISTENING state
      if (turnState === TURN_STATE.LISTENING) {
        setTurnState(TURN_STATE.IDLE)
      }

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
    if (turnState === TURN_STATE.LISTENING) {
      stopListening()
    } else if (turnState === TURN_STATE.IDLE) {
      setTurnState(TURN_STATE.LISTENING)
    } else if (turnState === TURN_STATE.SPEAKING) {
      // If JARVIS is speaking, this is an interruption
      stopSpeaking()
      setTurnState(TURN_STATE.LISTENING)
    }
  }

  // Setup audio monitoring for visualization and interruption detection
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micStreamRef.current = stream

      // Setup audio context and analyser
      try {
        // Check if AudioContext exists and is not closed
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        } else if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume()
        }

        const analyser = audioContextRef.current.createAnalyser()
        analyserRef.current = analyser
        analyser.fftSize = 1024 // Higher resolution
        analyser.smoothingTimeConstant = 0.5 // Add some smoothing

        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyser)

        // Start monitoring volume
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        // Variables for interruption detection
        let silenceCount = 0
        const volumeThreshold = turnState === TURN_STATE.SPEAKING ? 35 : 5 // Higher threshold during speaking to avoid self-triggering
        const consecutiveFramesNeeded = 8 // Require more consecutive frames above threshold during speaking
        let framesAboveThreshold = 0

        const updateVolume = () => {
          if (!analyserRef.current) return

          // Don't monitor audio during the first 1000ms of speaking to avoid self-triggering
          if (
            turnState === TURN_STATE.SPEAKING &&
            speakingStartTimeRef.current &&
            Date.now() - speakingStartTimeRef.current < 1000
          ) {
            interruptionCheckRef.current = requestAnimationFrame(updateVolume)
            return
          }

          analyserRef.current.getByteFrequencyData(dataArray)

          // Calculate RMS volume (better than simple average)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i]
          }
          const rms = Math.sqrt(sum / dataArray.length)
          const normalizedVolume = rms / 128 // Normalize to 0-1

          setAudioVolume(normalizedVolume)

          // Check for interruptions if JARVIS is speaking
          if (turnState === TURN_STATE.SPEAKING) {
            if (normalizedVolume > volumeThreshold / 100) {
              framesAboveThreshold++
              silenceCount = 0

              // Only trigger interruption if we have enough consecutive frames
              if (framesAboveThreshold >= consecutiveFramesNeeded) {
                console.log("Interruption detected with volume:", normalizedVolume * 100)
                stopSpeaking()
                setWasInterrupted(true)
                setTurnState(TURN_STATE.LISTENING)

                // Reset after a short delay
                setTimeout(() => setWasInterrupted(false), 3000)

                // Don't continue monitoring after interruption
                return
              }
            } else {
              framesAboveThreshold = 0
              silenceCount++
            }
          }

          interruptionCheckRef.current = requestAnimationFrame(updateVolume)
        }

        updateVolume()
      } catch (error) {
        console.error("Error setting up audio context:", error)
      }
    } catch (error) {
      console.error("Error setting up audio monitoring:", error)
    }
  }

  // Handle interruption
  const handleInterruption = (transcript: string) => {
    // Stop the current audio playback
    stopSpeaking()

    // Set the interruption flag
    setWasInterrupted(true)

    // Add the interruption as a user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Process the user input
    processUserInput(transcript)

    // Reset the flag after a short delay
    setTimeout(() => setWasInterrupted(false), 3000)
  }

  // Handle user input (from voice or text)
  const handleUserInput = (input: string) => {
    if (!input.trim() || isProcessing) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setUserInput("")

    // Process the user input
    processUserInput(input)
  }

  // Check if input contains task-related keywords
  const isTaskRelated = (text: string): boolean => {
    const taskKeywords = [
      "add task", "create task", "new task",
      "show tasks", "view tasks", "my tasks", 
      "pending tasks", "task list", "todo list",
      "mark task", "complete task", "finish task",
      "tasks due", "due today"
    ]
    
    return taskKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // Handle redirection to tasks page
  const redirectToTasksPage = () => {
    window.location.href = "/tasks"
  }

  // Process user input
  const processUserInput = async (input: string) => {
    setTurnState(TURN_STATE.THINKING)
    setIsProcessing(true)
    
    // Check if the input is task-related for direct redirection
    if (isTaskRelated(input)) {
      // Add a message to inform the user about redirection
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I've detected a task-related request. Redirecting you to the Tasks module where you can manage your tasks more effectively...",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await speakResponse(assistantMessage.content);
      setIsProcessing(false);
      
      // Redirect after a short delay to allow the user to hear the message
      setTimeout(() => {
        redirectToTasksPage()
      }, 3000);
      
      return; // Exit early since we're redirecting
    }
    
    // Check for task-related commands first (for backward compatibility)
    try {
      // Dynamically import the task handler to avoid loading it unnecessarily
      const { handleTaskCommand } = await import('@/lib/voice-commands/task-handler');
      const result = await handleTaskCommand(input);
      
      if (result.executed) {
        // If it was a task command, add the response as an assistant message
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.message || "Task command executed successfully.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        await speakResponse(assistantMessage.content);
        setIsProcessing(false);
        return; // Exit early since we've handled the command
      }
    } catch (error) {
      console.error("Error processing task command:", error);
      // Continue with normal processing if task handling fails
    }
    
    // Preload speech synthesis voices if needed
    if ("speechSynthesis" in window) {
      try {
        // Try to initialize speech synthesis early
        window.speechSynthesis.cancel();
        
        // Check if voices are already loaded
        let voices = window.speechSynthesis.getVoices();
        
        if (voices.length === 0) {
          // Create a temporary utterance to trigger voice loading
          const tempUtterance = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(tempUtterance);
          window.speechSynthesis.cancel();
          
          // Wait for voices to load
          await new Promise<void>((resolve) => {
            const voicesChanged = () => {
              window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
              resolve();
            };
            window.speechSynthesis.addEventListener('voiceschanged', voicesChanged);
            
            // Set a timeout in case the event doesn't fire
            setTimeout(() => {
              window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
              resolve();
            }, 1000);
          });
          
          // Check if voices loaded successfully
          voices = window.speechSynthesis.getVoices();
          if (voices.length === 0) {
            console.warn("No speech synthesis voices available after initialization attempt");
          } else {
            console.log("Successfully loaded", voices.length, "speech synthesis voices");
          }
        }
      } catch (e) {
        console.error("Error preloading speech synthesis:", e);
      }
    }

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

      setTurnState(TURN_STATE.IDLE)
    } finally {
      setIsProcessing(false)
    }
  }

  // Update the speakResponse function to handle ElevenLabs API errors and fall back to browser's built-in speech synthesis

  // Speak the response using ElevenLabs TTS or fallback to browser's built-in TTS
  const speakResponse = async (text: string) => {
    try {
      // Set speaking state immediately to prevent delays
      setTurnState(TURN_STATE.SPEAKING)
      speakingStartTimeRef.current = Date.now() // Track when speaking starts

      // Ensure we stop any ongoing speech synthesis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
      
      // Temporarily stop listening while preparing to speak
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log("Error stopping recognition before speaking", e)
        }
      }
      
      // Preload speech synthesis voices if needed
      if ("speechSynthesis" in window && window.speechSynthesis.getVoices().length === 0) {
        try {
          // Try to initialize speech synthesis early
          const tempUtterance = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(tempUtterance);
          window.speechSynthesis.cancel();
          
          // Wait for voices to load
          await new Promise<void>((resolve) => {
            const voicesChanged = () => {
              window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
              resolve();
            };
            window.speechSynthesis.addEventListener('voiceschanged', voicesChanged);
            
            // Set a timeout in case the event doesn't fire
            setTimeout(resolve, 1000);
          });
        } catch (e) {
          console.log("Error preloading speech synthesis:", e);
        }
      }
      
      // Add a small delay to ensure audio context is ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Call ElevenLabs API
      const response = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      // Check if we got audio or an error response
      const contentType = response.headers.get("Content-Type") || ""

      if (contentType.includes("audio/")) {
        // We got audio, play it
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // Create and play audio
        if (audioRef.current) {
          audioRef.current.pause()
          URL.revokeObjectURL(audioRef.current.src)
        }

        const audio = new Audio(audioUrl)
        audioRef.current = audio

        // Set up event handlers
        audio.onended = () => {
          // Longer delay before transitioning to listening to avoid self-triggering
          setTimeout(() => {
            if (turnState === TURN_STATE.SPEAKING) {
              setTurnState(TURN_STATE.LISTENING)
            }
          }, 1000)
          URL.revokeObjectURL(audioUrl)
        }

        audio.onerror = (e) => {
          console.error("Audio playback error:", e)
          setTurnState(TURN_STATE.IDLE)
          URL.revokeObjectURL(audioUrl)
        }

        // Start monitoring for interruptions
        setupAudioMonitoring()

        // Play the audio
        await audio.play()
      } else {
        // We got a JSON response, likely an error
        const data = await response.json()
        console.log("TTS API returned JSON instead of audio:", data)

        // Always use browser TTS when we get an error from ElevenLabs
        console.log("Using browser's built-in TTS as fallback")

        // Use browser's built-in speech synthesis as fallback
        if ("speechSynthesis" in window) {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(text)

          // Set properties
          utterance.rate = 1.0
          utterance.pitch = 1.0
          utterance.volume = 1.0
          utterance.lang = "en-US"

          // Get available voices
          let voices = window.speechSynthesis.getVoices()

          // If voices array is empty, wait for voices to load
          if (voices.length === 0) {
            // Wait for voices to be loaded
            await new Promise<void>((resolve) => {
              const voicesChanged = () => {
                window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
                voices = window.speechSynthesis.getVoices();
                resolve();
              };
              
              window.speechSynthesis.addEventListener('voiceschanged', voicesChanged);
              
              // Set a timeout in case the event doesn't fire
              setTimeout(() => {
                window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
                voices = window.speechSynthesis.getVoices();
                if (voices.length === 0) {
                  console.warn("No speech synthesis voices available after timeout");
                }
                resolve();
              }, 1000);
            });
          }

          // Try to find a female voice similar to Rachel
          // First try to find a female voice with "Google" in the name
          let preferredVoice = voices.find(
            (voice) => voice.name.includes("Google") && voice.name.toLowerCase().includes("female"),
          )

          // If not found, try any female voice
          if (!preferredVoice) {
            preferredVoice = voices.find(
              (voice) =>
                voice.name.toLowerCase().includes("female") ||
                voice.name.toLowerCase().includes("samantha") ||
                voice.name.toLowerCase().includes("lisa") ||
                voice.name.toLowerCase().includes("karen"),
            )
          }

          // If still not found, try any Google voice
          if (!preferredVoice) {
            preferredVoice = voices.find((voice) => voice.name.includes("Google"))
          }

          // If still not found, use any available voice
          if (preferredVoice) {
            utterance.voice = preferredVoice
            console.log("Using voice:", preferredVoice.name)
          } else if (voices.length > 0) {
            // Use the first available voice if no preferred voice is found
            utterance.voice = voices[0]
            console.log("Using default voice:", voices[0].name)
          }

          // Set event handlers
          utterance.onend = () => {
            // Longer delay before transitioning to listening to avoid self-triggering
            setTimeout(() => {
              if (turnState === TURN_STATE.SPEAKING) {
                setTurnState(TURN_STATE.LISTENING)
              }
            }, 1000)
          }

          utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e)
            // Don't immediately set to IDLE, try to recover
            setTimeout(() => {
              if (turnState === TURN_STATE.SPEAKING) {
                setTurnState(TURN_STATE.IDLE)
                toast({
                  title: "Speech Error",
                  description: "There was an issue with speech synthesis. Please try again.",
                  variant: "destructive",
                })
              }
            }, 500)
          }

          // Start monitoring for interruptions
          setupAudioMonitoring()

          // Speak the text
          window.speechSynthesis.speak(utterance)

          // Show a toast notification about using browser TTS
          if (data.error && data.error.includes("unusual_activity")) {
            toast({
              title: "Using Browser TTS",
              description: "ElevenLabs detected unusual activity. Using browser's built-in speech instead.",
            })
          } else {
            toast({
              title: "Using Browser TTS",
              description: "ElevenLabs unavailable. Using browser's built-in speech instead.",
            })
          }
        } else {
          throw new Error("Speech synthesis not supported in this browser")
        }
      }
    } catch (error) {
      console.error("Error speaking response:", error)

      // Try browser's built-in TTS as a last resort
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(text)

          // Get available voices
          const voices = window.speechSynthesis.getVoices()

          // Try to find a female voice
          const femaleVoice = voices.find(
            (voice) =>
              voice.name.toLowerCase().includes("female") ||
              voice.name.includes("Google") ||
              voice.name.toLowerCase().includes("samantha") ||
              voice.name.toLowerCase().includes("lisa"),
          )

          if (femaleVoice) {
            utterance.voice = femaleVoice
            console.log("Using fallback voice:", femaleVoice.name)
          } else if (voices.length > 0) {
            // Use the first available voice if no female voice is found
            utterance.voice = voices[0]
            console.log("Using default fallback voice:", voices[0].name)
          }

          utterance.onend = () => {
            setTimeout(() => {
              if (turnState === TURN_STATE.SPEAKING) {
                setTurnState(TURN_STATE.LISTENING)
              }
            }, 1000)
          }

          utterance.onerror = (e) => {
            console.error("Fallback speech synthesis error:", e)
            // Add a delay before changing state to allow for recovery
            setTimeout(() => {
              if (turnState === TURN_STATE.SPEAKING) {
                setTurnState(TURN_STATE.IDLE)
                toast({
                  title: "Speech Synthesis Error",
                  description: "There was an issue with the fallback speech synthesis.",
                  variant: "destructive",
                })
              }
            }, 500)
          }

          window.speechSynthesis.speak(utterance)

          toast({
            title: "Using Browser TTS",
            description: "Using browser's built-in speech synthesis as fallback.",
          })
        } else {
          setTurnState(TURN_STATE.IDLE)

          toast({
            title: "TTS Error",
            description: "Speech synthesis is not available in this browser.",
            variant: "destructive",
          })
        }
      } catch (fallbackError) {
        console.error("Fallback TTS error:", fallbackError)
        setTurnState(TURN_STATE.IDLE)

        toast({
          title: "TTS Error",
          description: "Failed to generate speech with any available method.",
          variant: "destructive",
        })
      }
    }
  }

  // Stop speaking
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src)
      }
      audioRef.current = null
    }

    // Don't automatically set state here - let the caller decide
    // This allows for proper interruption handling
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim() && !isProcessing) {
      handleUserInput(userInput)
    }
  }

  // Render status badge
  const renderStatusBadge = () => {
    switch (turnState) {
      case TURN_STATE.LISTENING:
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Listening...
          </Badge>
        )
      case TURN_STATE.THINKING:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Thinking...
          </Badge>
        )
      case TURN_STATE.SPEAKING:
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

  return (
    <div className="flex flex-col h-full">
      {/* LiveKit Voice Provider */}
      {useLiveKit && (
        <VoiceProviderLiveKit
          onSpeechStart={() => {
            if (turnState === TURN_STATE.IDLE) {
              setTurnState(TURN_STATE.LISTENING)
            }
          }}
          onSpeechEnd={(transcript) => {
            if (turnState === TURN_STATE.LISTENING && transcript.trim().length > 2) {
              handleUserInput(transcript)
            }
          }}
          onWakeWord={() => {
            // When wake word is detected, start listening
            if (turnState === TURN_STATE.IDLE || turnState === TURN_STATE.SPEAKING) {
              stopSpeaking()
              setTurnState(TURN_STATE.LISTENING)
              toast({
                title: "Wake Word Detected",
                description: "How can I help you?",
              })
            }
          }}
          onInterruption={(transcript) => {
            if (turnState === TURN_STATE.SPEAKING && transcript.trim().length > 3) {
              handleInterruption(transcript)
            }
          }}
          onVolumeChange={(volume) => {
            setAudioVolume(volume)
          }}
          isListening={turnState === TURN_STATE.LISTENING}
          isSpeaking={turnState === TURN_STATE.SPEAKING}
          userId={conversationId || "default-user"}
        />
      )}
      
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${message.role === "assistant" ? "" : "flex-row-reverse"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar>
                      <AvatarFallback>J</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={`rounded-lg px-3 py-2 ${message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"}`}
                    >
                      {message.content}
                    </div>
                    <div
                      className={`text-xs text-muted-foreground mt-1 ${message.role === "assistant" ? "text-left" : "text-right"}`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleListening}
              className={turnState === TURN_STATE.LISTENING ? "bg-red-100 hover:bg-red-200" : ""}
            >
              {turnState === TURN_STATE.LISTENING ? <MicOff /> : <Mic />}
            </Button>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleUserInput(userInput)
                }
              }}
              placeholder="Type a message or press the mic to speak..."
              className="flex-1 border rounded-md px-3 py-2"
              disabled={isProcessing}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleUserInput(userInput)}
              disabled={!userInput.trim() || isProcessing}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
            {turnState === TURN_STATE.SPEAKING && (
              <Button
                variant="outline"
                size="icon"
                onClick={stopSpeaking}
                className="bg-red-100 hover:bg-red-200"
              >
                <VolumeX />
              </Button>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <Badge variant={turnState === TURN_STATE.IDLE ? "outline" : "default"}>
                {turnState === TURN_STATE.IDLE && "Ready"}
                {turnState === TURN_STATE.LISTENING && "Listening"}
                {turnState === TURN_STATE.THINKING && "Thinking"}
                {turnState === TURN_STATE.SPEAKING && "Speaking"}
              </Badge>
              {wasInterrupted && <Badge variant="destructive">Interrupted</Badge>}
              {useLiveKit && <Badge variant="secondary">LiveKit</Badge>}
            </div>
            <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${turnState === TURN_STATE.LISTENING ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${audioVolume * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
