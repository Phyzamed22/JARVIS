// Types for conversation history
export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

// Maximum number of messages to include in context
const MAX_CONTEXT_MESSAGES = 10

// In-memory storage for conversations
const conversations: Map<string, Conversation> = new Map()

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Get the current active conversation or create a new one
export function getActiveConversation(): Conversation {
  // For simplicity, we'll just use a single conversation for now
  const activeConversationId = "active-conversation"

  if (!conversations.has(activeConversationId)) {
    const newConversation: Conversation = {
      id: activeConversationId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    conversations.set(activeConversationId, newConversation)
  }

  return conversations.get(activeConversationId)!
}

// Add a message to the conversation
export function addMessage(role: "user" | "assistant" | "system", content: string): Message {
  const conversation = getActiveConversation()

  const message: Message = {
    id: generateId(),
    role,
    content,
    timestamp: new Date().toISOString(),
  }

  conversation.messages.push(message)
  conversation.updatedAt = new Date().toISOString()

  // Update conversation title based on first user message if it's untitled
  if (
    conversation.title === "New Conversation" &&
    role === "user" &&
    conversation.messages.filter((m) => m.role === "user").length === 1
  ) {
    conversation.title = content.length > 30 ? content.substring(0, 30) + "..." : content
  }

  return message
}

// Get recent conversation history for context
export function getConversationContext(maxMessages = MAX_CONTEXT_MESSAGES): Message[] {
  const conversation = getActiveConversation()

  // Get the most recent messages up to the maximum
  return conversation.messages.slice(-maxMessages)
}

// Clear the conversation history
export function clearConversationHistory(): void {
  const activeConversationId = "active-conversation"
  const newConversation: Conversation = {
    id: activeConversationId,
    title: "New Conversation",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  conversations.set(activeConversationId, newConversation)
}

// Get all messages from the active conversation
export function getAllMessages(): Message[] {
  const conversation = getActiveConversation()
  return [...conversation.messages]
}
