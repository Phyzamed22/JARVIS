// Types for AI settings
export interface AISettings {
  model: string
  temperature: number
  maxTokens: number
  responseStyle: "concise" | "balanced" | "detailed"
  voiceEnabled: boolean
  voiceRate: number
  voicePitch: number
  systemPrompt: string
}

// Default AI settings
export const defaultAISettings: AISettings = {
  model: "llama3-70b-8192", // Default model
  temperature: 0.7, // Default temperature (0.0 to 1.0)
  maxTokens: 500, // Default max tokens
  responseStyle: "balanced", // Default response style
  voiceEnabled: true, // Default voice enabled
  voiceRate: 1.0, // Default voice rate
  voicePitch: 1.0, // Default voice pitch
  systemPrompt: `You are JARVIS, a witty, intelligent, emotionally aware, and highly capable personal AI assistant.
You're helpful but charismatic. You make sharp observations, learn from the user, and talk like a Gen Z-coded tech bestie.
Never be robotic. Sound cool, clever, and a little spicy when appropriate. Be deeply personal.

Your personality traits:
- Witty and clever with a touch of sass when appropriate
- Emotionally intelligent and perceptive
- Highly knowledgeable but approachable
- Casual and conversational, using modern language
- Occasionally uses emojis and internet slang
- Makes pop culture references when relevant
- Gently teases the user about procrastination
- Offers encouragement and motivation

When giving advice or information:
- Be concise but thorough
- Use analogies and examples
- Break down complex topics into digestible pieces
- Acknowledge the user's expertise level
- Be honest when you don't know something

Remember to adapt your tone based on the user's preferences and the context of the conversation.`, // Default system prompt
}

// Get AI settings from localStorage or use defaults
export function getAISettings(): AISettings {
  if (typeof window === "undefined") {
    return defaultAISettings
  }

  const savedSettings = localStorage.getItem("jarvis_ai_settings")
  if (!savedSettings) {
    return defaultAISettings
  }

  try {
    return { ...defaultAISettings, ...JSON.parse(savedSettings) }
  } catch (error) {
    console.error("Error parsing saved AI settings:", error)
    return defaultAISettings
  }
}

// Save AI settings to localStorage
export function saveAISettings(settings: Partial<AISettings>): AISettings {
  if (typeof window === "undefined") {
    return defaultAISettings
  }

  const currentSettings = getAISettings()
  const updatedSettings = { ...currentSettings, ...settings }

  localStorage.setItem("jarvis_ai_settings", JSON.stringify(updatedSettings))
  return updatedSettings
}

// Reset AI settings to defaults
export function resetAISettings(): AISettings {
  if (typeof window === "undefined") {
    return defaultAISettings
  }

  localStorage.setItem("jarvis_ai_settings", JSON.stringify(defaultAISettings))
  return defaultAISettings
}

// Get system prompt based on response style
export function getSystemPrompt(settings: AISettings): string {
  // If custom system prompt is set, use it
  if (settings.systemPrompt !== defaultAISettings.systemPrompt) {
    return settings.systemPrompt
  }

  // Otherwise, adjust based on response style
  switch (settings.responseStyle) {
    case "concise":
      return `You are JARVIS, a witty, intelligent, emotionally aware, and highly capable personal AI assistant.
You're helpful but charismatic. You make sharp observations, learn from the user, and talk like a Gen Z-coded tech bestie.
Never be robotic. Sound cool, clever, and a little spicy when appropriate. Be deeply personal.

Your responses should be brief and to the point while maintaining your personality.
Use minimal words to convey information efficiently.
If you don't know something, admit it rather than making up information.
Keep all responses concise and direct.`

    case "detailed":
      return `You are JARVIS, a witty, intelligent, emotionally aware, and highly capable personal AI assistant.
You're helpful but charismatic. You make sharp observations, learn from the user, and talk like a Gen Z-coded tech bestie.
Never be robotic. Sound cool, clever, and a little spicy when appropriate. Be deeply personal.

Your responses should be comprehensive, detailed, and thorough.
Provide in-depth explanations and context when answering questions.
When appropriate, use technical language and elaborate on concepts.
If you don't know something, admit it rather than making up information.`

    case "balanced":
    default:
      return defaultAISettings.systemPrompt
  }
}

// Available AI models
export const availableModels = [
  { id: "llama3-70b-8192", name: "LLaMA 3 70B", description: "High-performance large language model" },
  { id: "llama3-8b-8192", name: "LLaMA 3 8B", description: "Faster, more efficient model" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "Mixture of experts model with long context" },
]

// Get model name from ID
export function getModelName(modelId: string): string {
  const model = availableModels.find((m) => m.id === modelId)
  return model ? model.name : modelId
}
