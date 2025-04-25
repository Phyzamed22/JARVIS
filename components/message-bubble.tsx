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
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-4 message-bubble`}>
      <div className={`flex max-w-[80%] md:max-w-[80%] sm:max-w-[85%] xs:max-w-[90%] ${isAssistant ? "flex-row" : "flex-row-reverse"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isAssistant ? "mr-2 md:mr-3" : "ml-2 md:ml-3"}`}>
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary flex items-center justify-center">
            {isAssistant ? <Bot className="h-3 w-3 md:h-4 md:w-4 text-white" /> : <User className="h-3 w-3 md:h-4 md:w-4 text-white" />}
          </div>
        </div>

        {/* Message content */}
        <div>
          <div
            className={`rounded-lg p-2 md:p-3 ${
              isAssistant ? "bg-secondary/20 text-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
          </div>

          <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}
