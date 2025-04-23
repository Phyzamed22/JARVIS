import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationId } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 })
    }

    // Generate a fallback ID if needed
    const currentConversationId =
      conversationId || `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Check if GROQ API key is available
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY

    if (!apiKey) {
      console.warn("GROQ API key not found, using fallback response")
      return NextResponse.json({
        text: "I'm sorry, but my AI capabilities are not fully configured. I can still assist with basic tasks.",
        conversationId: currentConversationId,
      })
    }

    try {
      // Generate response using GROQ
      const response = await generateText({
        model: groq("llama3-70b-8192"),
        messages: [
          {
            role: "system",
            content: `You are JARVIS, an advanced AI assistant with a friendly, helpful, and slightly witty personality.
            You provide concise, accurate, and helpful responses.
            You're knowledgeable but admit when you don't know something.
            You're conversational but focused on providing value.
            Current date: ${new Date().toLocaleDateString()}
            Current time: ${new Date().toLocaleTimeString()}`,
          },
          ...messages,
        ],
        temperature: 0.7,
        maxTokens: 1024,
      })

      return NextResponse.json({
        text: response.text,
        conversationId: currentConversationId,
      })
    } catch (aiError) {
      console.error("AI generation error:", aiError)

      // Provide a fallback response when AI generation fails
      return NextResponse.json({
        text: "I apologize, but I'm having trouble generating a response right now. Could you please try again or rephrase your question?",
        conversationId: currentConversationId,
        error: aiError instanceof Error ? aiError.message : "Unknown AI error",
      })
    }
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      {
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }, // Return 200 even for errors to prevent client-side failures
    )
  }
}
