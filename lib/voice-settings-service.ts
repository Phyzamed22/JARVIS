// Types for voice settings
export interface VoiceSettings {
  // Recognition settings
  recognitionEnabled: boolean
  recognitionLanguage: string
  continuousListening: boolean
  autoStopAfterSilence: boolean
  silenceThreshold: number // seconds
  wakeWord: string
  wakeWordEnabled: boolean
  wakeWordSensitivity: "low" | "medium" | "high" // Sensitivity for wake word detection
  wakeWordAutoStart: boolean // Automatically start wake word detection on page load
  wakeWordStartConversation: boolean // Start conversational mode after wake word

  // Conversational mode settings
  conversationalMode: boolean
  conversationTimeout: number // seconds
  conversationContext: boolean

  // Synthesis settings
  synthesisEnabled: boolean
  synthesisVoice: string
  synthesisRate: number
  synthesisPitch: number
  synthesisVolume: number
  autoReadResponses: boolean
  useSSML: boolean
  audioEffects: {
    echo: boolean
    reverb: boolean
  }
  
  // LiveKit integration settings
  livekitEnabled: boolean
  livekitServerUrl: string
  livekitApiKey: string
  livekitApiSecret: string
  livekitRoomPrefix: string
  livekitVadSensitivity: number // Voice activity detection sensitivity (0.0 to 1.0)
  livekitInterruptionEnabled: boolean // Allow interrupting assistant while speaking
}

// Default voice settings
export const defaultVoiceSettings: VoiceSettings = {
  // Recognition settings
  recognitionEnabled: true,
  recognitionLanguage: "en-US",
  continuousListening: false,
  autoStopAfterSilence: true,
  silenceThreshold: 2, // seconds
  wakeWord: "hey jarvis",
  wakeWordEnabled: true,
  wakeWordSensitivity: "medium", // Sensitivity for wake word detection
  wakeWordAutoStart: true, // Automatically start wake word detection on page load
  wakeWordStartConversation: true, // Start conversational mode after wake word

  // Conversational mode settings
  conversationalMode: true,
  conversationTimeout: 30, // seconds
  conversationContext: true,

  // Synthesis settings
  synthesisEnabled: true,
  synthesisVoice: "Google UK English Male",
  synthesisRate: 1.0,
  synthesisPitch: 1.0,
  synthesisVolume: 1.0,
  autoReadResponses: true,
  useSSML: true,
  audioEffects: {
    echo: false,
    reverb: false,
  },
  
  // LiveKit integration settings
  livekitEnabled: true, // Enable LiveKit by default if environment variables are available
  livekitServerUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
  livekitApiKey: process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || "",
  livekitApiSecret: process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET || "",
  livekitRoomPrefix: "jarvis",
  livekitVadSensitivity: 0.7, // Voice activity detection sensitivity (0.0 to 1.0)
  livekitInterruptionEnabled: true, // Allow interrupting assistant while speaking
}

// Available recognition languages
export const recognitionLanguages = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru-RU", name: "Russian" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
]

// Get voice settings from localStorage or use defaults
export function getVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") {
    return defaultVoiceSettings
  }

  const savedSettings = localStorage.getItem("jarvis_voice_settings")
  if (!savedSettings) {
    return defaultVoiceSettings
  }

  try {
    return { ...defaultVoiceSettings, ...JSON.parse(savedSettings) }
  } catch (error) {
    console.error("Error parsing saved voice settings:", error)
    return defaultVoiceSettings
  }
}

// Save voice settings to localStorage
export function saveVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  if (typeof window === "undefined") {
    return defaultVoiceSettings
  }

  const currentSettings = getVoiceSettings()
  const updatedSettings = { ...currentSettings, ...settings }

  localStorage.setItem("jarvis_voice_settings", JSON.stringify(updatedSettings))
  return updatedSettings
}

// Reset voice settings to defaults
export function resetVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") {
    return defaultVoiceSettings
  }

  localStorage.setItem("jarvis_voice_settings", JSON.stringify(defaultVoiceSettings))
  return defaultVoiceSettings
}

// Get available voices from the browser
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return []
  }

  return window.speechSynthesis.getVoices()
}

// Get voice by name or return default
export function getVoiceByName(name: string): SpeechSynthesisVoice | null {
  if (name === "default" || typeof window === "undefined" || !window.speechSynthesis) {
    return null
  }

  const voices = getAvailableVoices()
  return voices.find((voice) => voice.name === name) || null
}
