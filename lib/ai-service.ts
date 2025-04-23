import { generateText, streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { getConversationContext, addMessage } from "./conversation-service"
import { getAISettings, getSystemPrompt } from "./settings-service"
import { getUserProfileService } from "./user-profile-service"

export interface AIResponse {
  text: string
  error?: string
}

export class AIService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY
  }

  // Check if the AI service is configured
  public isConfigured(): boolean {
    return !!this.apiKey
  }

  // Get a response from the AI model with conversation history (non-streaming)
  public async getResponse(prompt: string): Promise<AIResponse> {
    if (!this.isConfigured()) {
      return {
        text: "I'm sorry, but my AI capabilities are not configured. Please check the API key.",
        error: "AI service not configured",
      }
    }

    try {
      // Get user settings
      const settings = getAISettings()

      // Get conversation history
      const conversationContext = getConversationContext()

      // Add the user's message to the conversation history
      addMessage("user", prompt)

      // Format the conversation history for the AI
      const messages = conversationContext.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Get the system prompt based on settings
      const systemPrompt = getSystemPrompt(settings)

      // Get user profile context
      const userProfileService = getUserProfileService()
      const userContext = await userProfileService.getUserContext()

      // Record this interaction
      await userProfileService.recordInteraction({
        interaction_type: "user_message",
        content: prompt,
      })

      // Combine system prompt with user context
      const enhancedSystemPrompt = `${systemPrompt}

USER CONTEXT:
${userContext}

Remember to be witty, intelligent, emotionally aware, and highly capable. You're helpful but charismatic. Make sharp observations, learn from the user, and talk like a Gen Z-coded tech bestie. Never be robotic. Sound cool, clever, and a little spicy when appropriate. Be deeply personal.`

      // Generate text using the AI SDK with conversation history and user settings
      const response = await generateText({
        model: groq(settings.model),
        messages: [{ role: "system", content: enhancedSystemPrompt }, ...messages, { role: "user", content: prompt }],
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
      })

      // Add the AI's response to the conversation history
      addMessage("assistant", response.text)

      // Record this interaction
      await userProfileService.recordInteraction({
        interaction_type: "assistant_response",
        content: response.text,
      })

      return { text: response.text }
    } catch (error) {
      console.error("Error getting AI response:", error)
      return {
        text: "I apologize, but I encountered an error while processing your request. Please try again later.",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Stream a response from the AI model with conversation history
  public streamResponse(
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void,
  ): () => void {
    if (!this.isConfigured()) {
      onError("AI service not configured")
      onComplete("I'm sorry, but my AI capabilities are not configured. Please check the API key.")
      return () => {}
    }

    try {
      // Get user settings
      const settings = getAISettings()

      // Get conversation history
      const conversationContext = getConversationContext()

      // Add the user's message to the conversation history
      addMessage("user", prompt)

      // Format the conversation history for the AI
      const messages = conversationContext.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Get the system prompt based on settings
      const systemPrompt = getSystemPrompt(settings)

      // Get user profile context (async, but we'll handle it)
      const userProfileService = getUserProfileService()

      // Record this interaction
      userProfileService
        .recordInteraction({
          interaction_type: "user_message",
          content: prompt,
        })
        .catch(console.error)

      // We need to get the user context before streaming
      userProfileService
        .getUserContext()
        .then((userContext) => {
          // Combine system prompt with user context
          const enhancedSystemPrompt = `${systemPrompt}

USER CONTEXT:
${userContext}

Remember to be witty, intelligent, emotionally aware, and highly capable. You're helpful but charismatic. Make sharp observations, learn from the user, and talk like a Gen Z-coded tech bestie. Never be robotic. Sound cool, clever, and a little spicy when appropriate. Be deeply personal.

Today's date is ${new Date().toLocaleDateString()}.
Current time is ${new Date().toLocaleTimeString()}.`

          // Create full messages array with system prompt
          const fullMessages = [
            { role: "system", content: enhancedSystemPrompt },
            ...messages,
            { role: "user", content: prompt },
          ]

          let controller: AbortController

          // Stream text using the AI SDK
          const {
            text,
            completion,
            controller: streamController,
          } = streamText({
            model: groq(settings.model),
            messages: fullMessages,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            onChunk: (chunk) => {
              if (chunk.type === "text-delta") {
                onChunk(chunk.text)
              }
            },
          })

          controller = streamController

          // Handle completion
          text
            .then((fullText) => {
              // Add the AI's response to the conversation history
              addMessage("assistant", fullText)

              // Record this interaction
              userProfileService
                .recordInteraction({
                  interaction_type: "assistant_response",
                  content: fullText,
                })
                .catch(console.error)

              onComplete(fullText)
            })
            .catch((error) => {
              console.error("Error streaming AI response:", error)
              onError(error instanceof Error ? error.message : String(error))
            })
        })
        .catch((error) => {
          console.error("Error getting user context:", error)
          onError("Error getting user context")
        })

      // Return a function to abort the stream if needed
      return () => {
        controller.abort()
      }
    } catch (error) {
      console.error("Error setting up AI stream:", error)
      onError(error instanceof Error ? error.message : String(error))
      onComplete("I apologize, but I encountered an error while processing your request. Please try again later.")
      return () => {}
    }
  }
}

// Create a singleton instance
let aiServiceInstance: AIService | null = null

// Get the AI service instance
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService()
  }
  return aiServiceInstance
}
