"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { MicButton } from "./mic-button"
import { TypingIndicator } from "./typing-indicator"
import { Send, Loader2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  audioUrl?: string
}

interface ChatInterfaceProps {
  initialMessages?: Message[]
  conversationId?: string
}

export function ChatInterface({ initialMessages = [], conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputText, setInputText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

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

  // Handle text input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputText.trim() || isProcessing) return
    
    // Check if the input is task-related
    if (isTaskRelated(inputText)) {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: inputText,
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, userMessage])
      setInputText("")
      
      // Add system message about redirection
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I've detected a task-related request. Redirecting you to the Tasks module where you can manage your tasks more effectively...",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, systemMessage])
      
      // Redirect after a short delay to allow the user to see the message
      setTimeout(() => {
        redirectToTasksPage()
      }, 2000)
      
      return
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsProcessing(true)
    setIsTyping(true)

    try {
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()

      // Send message to API
      const response = await fetch("/api/llm/chat", {
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
            { role: "user", content: inputText },
          ],
          conversationId: currentConversationId,
          stream: false,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Update conversation ID if it's a new conversation
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId)
      }

      setIsTyping(false)

      // Add agent message
      const agentMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, agentMessage])

      // Generate audio for the agent message
      setIsGeneratingAudio(true)

      const audioResponse = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          conversationId: currentConversationId,
          messageId: agentMessage.id,
        }),
      })

      const audioData = await audioResponse.json()

      if (audioData.error) {
        console.error("Error generating audio:", audioData.error)
      } else {
        // Update the agent message with the audio URL
        setMessages((prev) => prev.map((m) => (m.id === agentMessage.id ? { ...m, audioUrl: audioData.audioUrl } : m)))
      }
    } catch (error) {
      console.error("Error processing message:", error)

      // If it's not an abort error, add an error message
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "I'm sorry, I encountered an error processing your request. Please try again.",
            timestamp: new Date(),
          },
        ])
      }
    } finally {
      setIsProcessing(false)
      setIsGeneratingAudio(false)
      abortControllerRef.current = null
    }
  }

  // Handle voice input
  const handleVoiceInput = (transcript: string) => {
    if (!transcript.trim()) return

    setInputText(transcript)

    // Auto-submit after a short delay
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    }, 500)
  }

  return (
    <div className="flex flex-col h-full chat-container">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 message-list">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm md:text-base px-4 text-center">Start a conversation by speaking or typing a message.</p>
          </div>
        ) : (
          <div>
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} isLatest={index === messages.length - 1} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 p-2 md:p-4 chat-input-container">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 chat-input-wrapper">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-2 md:p-3 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
              rows={1}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {isProcessing && (
              <div className="absolute right-3 bottom-3">
                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex gap-2 controls-container">
            <MicButton onTranscript={handleVoiceInput} isDisabled={isProcessing} size="md" />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 send-button"
            >
              <Send className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </button>
          </div>
        </form>

        {isGeneratingAudio && (
          <div className="mt-2 text-xs text-gray-400 flex items-center">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Generating voice response...
          </div>
        )}
      </div>
    </div>
  )
}
