import { Bot, User } from "lucide-react"

interface MessageProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
  }
}

export function MessageBubble({ message }: MessageProps) {
  const isAssistant = message.role === "assistant"

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-4`}>
      <div className={`flex max-w-[80%] ${isAssistant ? "flex-row" : "flex-row-reverse"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isAssistant ? "mr-3" : "ml-3"}`}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            {isAssistant ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
          </div>
        </div>

        {/* Message content */}
        <div>
          <div
            className={`rounded-lg p-3 ${
              isAssistant ? "bg-secondary/20 text-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}
