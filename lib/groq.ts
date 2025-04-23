import { generateText, streamText } from "ai"
import { groq } from "@ai-sdk/groq"

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
}

export interface ChatResponse {
  text: string
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
}

const DEFAULT_SYSTEM_PROMPT = `You are JARVIS, a highly advanced AI assistant. You are helpful, knowledgeable, and adaptable, always striving to provide the most accurate and useful information possible. You have a friendly, conversational tone and aim to make complex topics accessible. You're designed to assist with a wide range of tasks, from answering questions to providing recommendations and engaging in thoughtful discussions.`

export async function chatWithGroq(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
  try {
    // Check if GROQ API key is configured
    if (!process.env.GROQ_API_KEY) {
      return {
        text: "I'm sorry, but my AI capabilities are not configured. Please check the API key.",
        error: "GROQ API key not configured",
      }
    }

    // Prepare system message if provided
    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT

    // Prepare messages array with system prompt
    const messagesWithSystem = [{ role: "system", content: systemPrompt }, ...messages]

    // Generate text using the AI SDK
    const response = await generateText({
      model: groq("llama3-70b-8192"),
      messages: messagesWithSystem,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 0.9,
    })

    return {
      text: response.text,
      finishReason: response.finishReason,
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
    }
  } catch (error) {
    console.error("Error in GROQ chat:", error)
    return {
      text: "I apologize, but I encountered an error while processing your request. Please try again later.",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function streamChatWithGroq(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: string) => void,
  options: ChatOptions = {},
): () => void {
  try {
    // Check if GROQ API key is configured
    if (!process.env.GROQ_API_KEY) {
      onError("GROQ API key not configured")
      onComplete("I'm sorry, but my AI capabilities are not configured. Please check the API key.")
      return () => {}
    }

    // Prepare system message if provided
    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT

    // Prepare messages array with system prompt
    const messagesWithSystem = [{ role: "system", content: systemPrompt }, ...messages]

    // Stream text using the AI SDK
    const { text, controller } = streamText({
      model: groq("llama3-70b-8192"),
      messages: messagesWithSystem,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 0.9,
      onChunk: (chunk) => {
        if (chunk.type === "text-delta") {
          onChunk(chunk.text)
        }
      },
    })

    // Handle completion
    text
      .then((fullText) => {
        onComplete(fullText)
      })
      .catch((error) => {
        console.error("Error streaming GROQ response:", error)
        onError(error instanceof Error ? error.message : String(error))
      })

    // Return a function to abort the stream if needed
    return () => {
      controller.abort()
    }
  } catch (error) {
    console.error("Error setting up GROQ stream:", error)
    onError(error instanceof Error ? error.message : String(error))
    onComplete("I apologize, but I encountered an error while processing your request. Please try again later.")
    return () => {}
  }
}
