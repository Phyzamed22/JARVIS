import { type NextRequest, NextResponse } from "next/server"
import { chatWithGroq } from "@/lib/groq"
import { saveMessage, createConversation } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationId, stream = false, options = {} } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 })
    }

    // Create a new conversation if needed
    let currentConversationId = conversationId
    if (!currentConversationId) {
      try {
        const newConversation = await createConversation()
        currentConversationId = newConversation.id
      } catch (error) {
        console.error("Error creating conversation:", error)
        // Continue without saving to database
      }
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m) => m.role === "user").pop()

    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    // Save user message to database if we have a conversation ID
    if (currentConversationId) {
      try {
        await saveMessage({
          conversationId: currentConversationId,
          role: "user",
          content: lastUserMessage.content,
        })
      } catch (error) {
        console.error("Error saving user message:", error)
        // Continue without saving to database
      }
    }

    // If streaming is requested, use a different approach
    if (stream) {
      // This would be implemented with streaming response
      // For now, we'll just use the non-streaming approach
      const response = await chatWithGroq(messages, options)

      // Save assistant message to database if we have a conversation ID
      if (currentConversationId) {
        try {
          await saveMessage({
            conversationId: currentConversationId,
            role: "assistant",
            content: response.text,
          })
        } catch (error) {
          console.error("Error saving assistant message:", error)
          // Continue without saving to database
        }
      }

      return NextResponse.json({
        text: response.text,
        conversationId: currentConversationId,
      })
    } else {
      // Non-streaming approach
      const response = await chatWithGroq(messages, options)

      if (response.error) {
        return NextResponse.json({ error: response.error }, { status: 500 })
      }

      // Save assistant message to database if we have a conversation ID
      if (currentConversationId) {
        try {
          await saveMessage({
            conversationId: currentConversationId,
            role: "assistant",
            content: response.text,
          })
        } catch (error) {
          console.error("Error saving assistant message:", error)
          // Continue without saving to database
        }
      }

      return NextResponse.json({
        text: response.text,
        conversationId: currentConversationId,
        usage: response.usage,
      })
    }
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
