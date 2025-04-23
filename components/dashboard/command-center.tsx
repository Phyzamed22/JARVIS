"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, Mic, X, Volume2, Brain, Trash2, StopCircle, Search, MessageSquare, Ear } from "lucide-react"
import { getVoiceService } from "@/lib/voice-service"
import { getCommandProcessor } from "@/lib/command-processor"
import { getAIService } from "@/lib/ai-service"
import { getAllMessages, clearConversationHistory, addMessage } from "@/lib/conversation-service"
import { getVoiceSettings } from "@/lib/voice-settings-service"
import { useToast } from "@/components/ui/use-toast"
import { CommandSearchHistory } from "./command-search-history"

export function CommandCenter() {
  const [command, setCommand] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isContinuousListening, setIsContinuousListening] = useState(false)
  const [isConversationalMode, setIsConversationalMode] = useState(false)
  const [isWakeWordActive, setIsWakeWordActive] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedResponse, setStreamedResponse] = useState("")
  const [isAIConfigured, setIsAIConfigured] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [showSearchTip, setShowSearchTip] = useState(true)
  const [conversationActive, setConversationActive] = useState(false)
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const conversationHistoryRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<(() => void) | null>(null)
  const { toast } = useToast()

  // Initialize voice service and check AI configuration
  useEffect(() => {
    // Check voice support
    const voiceService = getVoiceService()
    if (voiceService && voiceService.isSupported()) {
      setIsVoiceSupported(true)

      // Set up voice service callbacks
      voiceService.onResult((text, isFinal) => {
        setTranscript(text)
        if (isFinal) {
          setCommand(text)
          if (isConversationalMode) {
            processVoiceCommand(text)
          }
        }
      })

      voiceService.onEnd(() => {
        if (!voiceService.getIsContinuousListening() && !isConversationalMode) {
          setIsListening(false)
          setIsContinuousListening(false)
        }
      })

      voiceService.onError((error) => {
        console.error("Voice recognition error:", error)
        setIsListening(false)
        setIsContinuousListening(false)
        setIsConversationalMode(false)
        setConversationActive(false)
        toast({
          title: "Voice Recognition Error",
          description: "There was an error with voice recognition. Please try again.",
          variant: "destructive",
        })
      })

      // Set up wake word detection
      voiceService.onWakeWord(() => {
        handleWakeWordDetected()
      })

      // Set up silence detection for conversational mode
      voiceService.onSilence(() => {
        if (isConversationalMode && conversationActive) {
          handleSilenceInConversation()
        }
      })

      // Check if wake word detection should be started automatically
      const settings = getVoiceSettings()
      if (settings.wakeWordEnabled && settings.wakeWordAutoStart) {
        startWakeWordDetection()
      }
    }

    // Check AI configuration
    const aiService = getAIService()
    setIsAIConfigured(aiService.isConfigured())

    // Load conversation history
    loadConversationHistory()

    // Clean up on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current()
        abortControllerRef.current = null
      }

      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }

      // Stop any ongoing voice recognition
      const voiceService = getVoiceService()
      if (voiceService) {
        voiceService.stopListening()
        voiceService.stopSpeaking()
        voiceService.stopWakeWordDetection()
      }
    }
  }, [toast])

  // Load conversation history
  const loadConversationHistory = () => {
    const messages = getAllMessages()
    setConversationHistory(messages)
  }

  // Scroll to bottom of conversation history when it updates
  useEffect(() => {
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.scrollTop = conversationHistoryRef.current.scrollHeight
    }
  }, [conversationHistory, streamedResponse])

  // Process text command with streaming
  const processTextCommand = async (text: string) => {
    if (!text.trim()) return

    // Hide the search tip after user interaction
    setShowSearchTip(false)

    // Reset any previous streamed response
    setStreamedResponse("")
    setIsProcessing(true)
    setIsStreaming(true)

    try {
      const commandProcessor = getCommandProcessor()

      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current()
        abortControllerRef.current = null
      }

      // Start streaming the response
      abortControllerRef.current = commandProcessor.streamCommand(
        text,
        // On chunk
        (chunk) => {
          setStreamedResponse((prev) => prev + chunk)
        },
        // On complete
        (result) => {
          setIsProcessing(false)
          setIsStreaming(false)
          abortControllerRef.current = null

          // Reload conversation history after processing
          loadConversationHistory()

          // Clear the streamed response since it's now in the conversation history
          setStreamedResponse("")

          // Get voice settings
          const voiceSettings = getVoiceSettings()

          // Speak the response if auto-read is enabled
          if (voiceSettings.synthesisEnabled && voiceSettings.autoReadResponses) {
            const voiceService = getVoiceService()
            if (voiceService) {
              setIsSpeaking(true)
              voiceService.speak(result.response, () => {
                setIsSpeaking(false)

                // If in conversational mode, wait for the next user input
                if (isConversationalMode && conversationActive) {
                  // Set a timer to check for silence after speaking
                  const timer = setTimeout(() => {
                    handleSilenceInConversation()
                  }, voiceSettings.conversationTimeout * 1000)

                  setSilenceTimer(timer)
                }
              })
            }
          } else if (isConversationalMode && conversationActive) {
            // If not speaking but in conversational mode, set a timer for silence
            const timer = setTimeout(() => {
              handleSilenceInConversation()
            }, voiceSettings.conversationTimeout * 1000)

            setSilenceTimer(timer)
          }
        },
        // On error
        (error) => {
          console.error("Error processing command:", error)
          setIsProcessing(false)
          setIsStreaming(false)
          abortControllerRef.current = null

          toast({
            title: "Command Error",
            description: error || "An error occurred while processing your request.",
            variant: "destructive",
          })

          // Reload conversation history to show error message
          loadConversationHistory()
        },
      )

      return true
    } catch (error) {
      console.error("Error processing command:", error)
      setIsProcessing(false)
      setIsStreaming(false)

      toast({
        title: "Command Error",
        description: "I'm sorry, I encountered an error processing your request.",
        variant: "destructive",
      })

      return false
    }
  }

  // Process voice command
  const processVoiceCommand = async (text: string) => {
    // Clear any existing silence timer
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    await processTextCommand(text)
    setTranscript("")
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim()) {
      await processTextCommand(command)
      setCommand("")
    }
  }

  // Handle silence in conversation
  const handleSilenceInConversation = () => {
    // Only handle if we're in conversational mode and the conversation is active
    if (!isConversationalMode || !conversationActive) return

    // Check if we're currently speaking or processing
    if (isSpeaking || isProcessing) return

    // Add a message to indicate the conversation is ending
    addMessage("assistant", "I notice you've been quiet for a while. If you need anything else, just let me know.")
    loadConversationHistory()

    // Set conversation as inactive but keep listening
    setConversationActive(false)

    // Notify the user
    toast({
      title: "Conversation Paused",
      description: "I'm still listening, but our conversation has been paused due to inactivity.",
    })
  }

  // Handle wake word detected
  const handleWakeWordDetected = () => {
    // Stop wake word detection since we detected the wake word
    const voiceService = getVoiceService()
    if (!voiceService) return

    setIsWakeWordActive(false)

    // Get settings to determine what to do after wake word detection
    const settings = getVoiceSettings()

    // Add a welcome message
    addMessage("assistant", `I heard you say "${settings.wakeWord}". How can I help you?`)
    loadConversationHistory()

    // Notify the user
    toast({
      title: "Wake Word Detected",
      description: `I heard you say "${settings.wakeWord}". How can I help you?`,
    })

    // Start conversational mode if enabled in settings
    if (settings.wakeWordStartConversation) {
      startConversationalMode()
    } else {
      // Otherwise just start regular listening
      startListening()
    }
  }

  // Start wake word detection
  const startWakeWordDetection = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    const settings = getVoiceSettings()
    if (!settings.wakeWordEnabled) {
      toast({
        title: "Wake Word Detection Disabled",
        description: "Wake word detection is disabled in settings. Please enable it first.",
        variant: "destructive",
      })
      return
    }

    // Don't start if already listening or in conversational mode
    if (isListening || isConversationalMode) {
      toast({
        title: "Cannot Start Wake Word Detection",
        description: "Please stop active listening or conversation mode first.",
        variant: "destructive",
      })
      return
    }

    const started = voiceService.startWakeWordDetection()
    if (started) {
      setIsWakeWordActive(true)
      toast({
        title: "Wake Word Detection Started",
        description: `I'm now listening for the wake word "${settings.wakeWord}".`,
      })
    } else {
      toast({
        title: "Wake Word Detection Failed",
        description: "Could not start wake word detection. Please check your browser permissions.",
        variant: "destructive",
      })
    }
  }

  // Stop wake word detection
  const stopWakeWordDetection = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    voiceService.stopWakeWordDetection()
    setIsWakeWordActive(false)

    toast({
      title: "Wake Word Detection Stopped",
      description: "I'm no longer listening for the wake word.",
    })
  }

  // Start listening
  const startListening = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    const settings = getVoiceSettings()

    // Don't start if recognition is disabled in settings
    if (!settings.recognitionEnabled) {
      toast({
        title: "Voice Recognition Disabled",
        description: "Voice recognition is disabled in settings. Please enable it first.",
        variant: "destructive",
      })
      return
    }

    // Stop wake word detection if active
    if (isWakeWordActive) {
      voiceService.stopWakeWordDetection()
      setIsWakeWordActive(false)
    }

    // Start regular listening
    const started = voiceService.startListening()
    if (started) {
      setIsListening(true)
      setIsContinuousListening(false)
      setIsConversationalMode(false)
      setTranscript("")
      toast({
        title: "Voice Recognition Active",
        description: "I'm listening. Speak a command.",
      })
    } else {
      toast({
        title: "Voice Recognition Failed",
        description: "Could not start voice recognition. Please check your browser permissions.",
        variant: "destructive",
      })
    }
  }

  // Start conversational mode
  const startConversationalMode = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    const settings = getVoiceSettings()

    // Don't start if recognition is disabled in settings
    if (!settings.recognitionEnabled) {
      toast({
        title: "Voice Recognition Disabled",
        description: "Voice recognition is disabled in settings. Please enable it first.",
        variant: "destructive",
      })
      return
    }

    // Stop wake word detection if active
    if (isWakeWordActive) {
      voiceService.stopWakeWordDetection()
      setIsWakeWordActive(false)
    }

    // Clear any existing silence timer
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    // Start conversational mode
    const started = voiceService.startConversationalMode()
    if (started) {
      setIsListening(true)
      setIsContinuousListening(true)
      setIsConversationalMode(true)
      setConversationActive(true)
      setTranscript("")

      toast({
        title: "Conversational Mode Active",
        description: "I'm listening continuously and will maintain our conversation. Speak naturally.",
        duration: 5000,
      })
    } else {
      toast({
        title: "Voice Recognition Failed",
        description: "Could not start conversational mode. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle voice listening
  const toggleListening = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    const settings = getVoiceSettings()

    if (!isListening) {
      // Check if voice recognition is enabled in settings
      if (!settings.recognitionEnabled) {
        toast({
          title: "Voice Recognition Disabled",
          description: "Voice recognition is disabled in settings. Please enable it first.",
          variant: "destructive",
        })
        return
      }

      // Clear any existing silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer)
        setSilenceTimer(null)
      }

      // Stop wake word detection if active
      if (isWakeWordActive) {
        voiceService.stopWakeWordDetection()
        setIsWakeWordActive(false)
      }

      // Check if conversational mode is enabled in settings
      if (settings.conversationalMode) {
        startConversationalMode()
      } else if (settings.continuousListening) {
        // Start continuous listening if enabled in settings
        const started = voiceService.startContinuousListening()
        if (started) {
          setIsListening(true)
          setIsContinuousListening(true)
          setIsConversationalMode(false)
          setTranscript("")
          toast({
            title: "Continuous Listening Active",
            description: "I'm listening continuously. Speak your commands anytime.",
          })
        } else {
          toast({
            title: "Voice Recognition Failed",
            description: "Could not start voice recognition. Please try again.",
            variant: "destructive",
          })
        }
      } else {
        // Start regular listening
        startListening()
      }
    } else {
      // Stop listening
      voiceService.stopListening()
      setIsListening(false)
      setIsContinuousListening(false)
      setIsConversationalMode(false)
      setConversationActive(false)

      // Clear any existing silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer)
        setSilenceTimer(null)
      }

      // Restart wake word detection if it was enabled
      if (settings.wakeWordEnabled) {
        setTimeout(() => {
          startWakeWordDetection()
        }, 500)
      }
    }
  }

  // Stop streaming response
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current()
      abortControllerRef.current = null
      setIsProcessing(false)
      setIsStreaming(false)

      // Add a message to indicate the response was stopped
      if (streamedResponse) {
        addMessage("assistant", streamedResponse + " [Response stopped]")
        setStreamedResponse("")
        loadConversationHistory()
      }

      toast({
        title: "Response Stopped",
        description: "I've stopped generating the response.",
      })
    }
  }

  // Clear conversation history
  const handleClearConversation = () => {
    clearConversationHistory()
    loadConversationHistory()
    toast({
      title: "Conversation Cleared",
      description: "The conversation history has been cleared.",
    })
  }

  // Toggle wake word detection
  const toggleWakeWordDetection = () => {
    if (isWakeWordActive) {
      stopWakeWordDetection()
    } else {
      startWakeWordDetection()
    }
  }

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-primary flex items-center">
          Command Center
          {isAIConfigured && (
            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center">
              <Brain className="h-3 w-3 mr-1" />
              AI Enabled
            </span>
          )}
          {isConversationalMode ? (
            <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              Conversational Mode
            </span>
          ) : isWakeWordActive ? (
            <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full flex items-center">
              <Ear className="h-3 w-3 mr-1" />
              Listening for Wake Word
            </span>
          ) : isContinuousListening ? (
            <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full flex items-center">
              <Mic className="h-3 w-3 mr-1" />
              Always Listening
            </span>
          ) : null}
        </h2>

        <div className="flex items-center space-x-2">
          {!isListening && !isConversationalMode && (
            <button
              onClick={toggleWakeWordDetection}
              className={`text-xs flex items-center ${
                isWakeWordActive ? "text-purple-400 hover:text-purple-300" : "text-gray-400 hover:text-gray-300"
              } transition-colors`}
              title={isWakeWordActive ? "Stop wake word detection" : "Start wake word detection"}
            >
              <Ear className="h-4 w-4 mr-1" />
              {isWakeWordActive ? "Stop Wake Word" : "Start Wake Word"}
            </button>
          )}
          <button
            onClick={handleClearConversation}
            className="text-gray-400 hover:text-primary transition-colors flex items-center text-xs"
            title="Clear conversation history"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear History
          </button>
        </div>
      </div>

      <div className="mb-4 max-h-60 overflow-y-auto glass p-4 rounded-md" ref={conversationHistoryRef}>
        {conversationHistory.length > 0 || streamedResponse ? (
          <div className="space-y-4">
            {conversationHistory.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.role === "user" ? (
                  <div className="flex items-start">
                    <span className="text-gray-400 mr-2">You:</span>
                    <span className="text-gray-200">{message.content}</span>
                  </div>
                ) : message.role === "assistant" ? (
                  <div className="flex items-start">
                    <span className="text-primary mr-2 flex items-center">
                      JARVIS:
                      {isAIConfigured && <Brain className="h-3 w-3 ml-1 text-primary" />}
                    </span>
                    <span className="text-gray-200">{message.content}</span>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Streaming response */}
            {streamedResponse && (
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-primary mr-2 flex items-center">
                    JARVIS:
                    {isAIConfigured && <Brain className="h-3 w-3 ml-1 text-primary" />}
                  </span>
                  <span className="text-gray-200">
                    {streamedResponse}
                    {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse"></span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            {isAIConfigured
              ? "No conversation yet. Try asking me anything!"
              : 'No conversation yet. Try saying "Hello JARVIS" or "What time is it?"'}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={
            isListening
              ? transcript ||
                (isConversationalMode
                  ? "Conversational mode active... I'm listening..."
                  : isContinuousListening
                    ? "Continuous listening mode active..."
                    : "Listening...")
              : isWakeWordActive
                ? `Listening for wake word "${getVoiceSettings().wakeWord}"...`
                : isAIConfigured
                  ? "Ask me anything..."
                  : "Enter a command..."
          }
          disabled={isProcessing}
          className={`w-full bg-background/50 border ${
            isConversationalMode
              ? "border-green-500"
              : isWakeWordActive
                ? "border-purple-500"
                : isContinuousListening
                  ? "border-red-500"
                  : isListening
                    ? "border-yellow-500"
                    : isProcessing
                      ? "border-yellow-500"
                      : "border-primary/30"
          } rounded-full py-3 px-6 pr-24 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100`}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
          {isStreaming && (
            <button
              type="button"
              onClick={stopStreaming}
              className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
              title="Stop generating response"
            >
              <StopCircle className="h-5 w-5 text-red-400" />
            </button>
          )}

          {isProcessing && !isStreaming && (
            <div className="p-2 rounded-full bg-yellow-500/20">
              <div className="h-5 w-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
            </div>
          )}

          {isSpeaking && !isProcessing && (
            <div className="p-2 rounded-full bg-primary/20">
              <Volume2 className="h-5 w-5 text-primary animate-pulse" />
            </div>
          )}

          {isVoiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isProcessing}
              className={`p-2 rounded-full ${
                isConversationalMode
                  ? "bg-green-500"
                  : isWakeWordActive
                    ? "bg-purple-500"
                    : isContinuousListening
                      ? "bg-red-500"
                      : isListening
                        ? "bg-yellow-500"
                        : "bg-primary/20 hover:bg-primary/30"
              } transition-colors disabled:opacity-50`}
              title={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening ? <X className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-primary" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!command.trim() || isProcessing}
            className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 disabled:opacity-50 disabled:hover:bg-primary/20 transition-colors"
          >
            <Send className="h-5 w-5 text-primary" />
          </button>
        </div>
      </form>

      {/* Wake word detection indicator */}
      {isWakeWordActive && (
        <div className="mt-4 p-3 bg-purple-500/10 rounded-md flex items-start">
          <Ear className="h-4 w-4 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-xs text-gray-300">
            <p className="font-medium mb-1">Wake Word Detection Active</p>
            <p>
              I'm listening for the wake word "{getVoiceSettings().wakeWord}". Say it to start a conversation with me.
              No need to press any buttons.
            </p>
          </div>
        </div>
      )}

      {/* Conversational mode indicator */}
      {isConversationalMode && (
        <div className="mt-4 p-3 bg-green-500/10 rounded-md flex items-start">
          <MessageSquare className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-xs text-gray-300">
            <p className="font-medium mb-1">Conversational Mode Active</p>
            <p>
              I'm listening continuously and maintaining our conversation context. You can speak naturally without
              pressing any buttons. I'll respond when you finish speaking.
            </p>
          </div>
        </div>
      )}

      {/* Search tip */}
      {showSearchTip &&
        conversationHistory.length === 0 &&
        !isProcessing &&
        !isStreaming &&
        !isConversationalMode &&
        !isWakeWordActive && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md flex items-start">
            <Search className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-xs text-gray-300">
              <p className="font-medium mb-1">New Voice Search Commands Available!</p>
              <p>
                Try commands like "news about tech", "define quantum computing", "how to make pasta", or "compare iPhone
                and Android". Check the search page for more commands.
              </p>
            </div>
          </div>
        )}

      {!isProcessing &&
        !isStreaming &&
        conversationHistory.length === 0 &&
        !isConversationalMode &&
        !isWakeWordActive && (
          <CommandSearchHistory
            onSelectQuery={(query) => {
              setCommand(query)
              // Automatically submit the form with a slight delay
              setTimeout(() => {
                processTextCommand(query)
              }, 100)
            }}
          />
        )}

      {(isListening || isWakeWordActive) && (
        <div className="mt-4 flex justify-center">
          <div className="sound-wave">
            <div className="bar h-4"></div>
            <div className="bar h-6"></div>
            <div className="bar h-8"></div>
            <div className="bar h-10"></div>
            <div className="bar h-8"></div>
            <div className="bar h-6"></div>
            <div className="bar h-4"></div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        {isWakeWordActive ? (
          <p>
            Wake word detection is active. Say "{getVoiceSettings().wakeWord}" to start a conversation with me. No need
            to press any buttons.
          </p>
        ) : isConversationalMode ? (
          <p>
            Conversational mode is active. I'm listening continuously and will maintain our conversation context. You
            can speak naturally without pressing any buttons.
          </p>
        ) : isAIConfigured ? (
          <p>
            I'm powered by AI with conversation memory and streaming responses. I can remember our chat history to
            provide more contextual responses.
            {isVoiceSupported && " Try voice commands by clicking the microphone button."}
            {isContinuousListening && " Continuous listening mode is active. I'm always listening for commands."}
          </p>
        ) : isVoiceSupported ? (
          <p>
            Try voice commands like "Hello JARVIS", "What time is it?", or "What can you do?". Click the microphone
            button to start.
          </p>
        ) : (
          <p>Voice recognition is not supported in your browser. Please try using Chrome, Edge, or Safari.</p>
        )}
      </div>
    </div>
  )
}
