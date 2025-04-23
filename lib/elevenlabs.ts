// Default voice ID for ElevenLabs (using "Rachel" voice)
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

export interface TTSOptions {
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  speakerBoost?: boolean
}

// Generate TTS audio URL
export async function generateSpeech(
  text: string,
  options: TTSOptions = {},
): Promise<{ audioUrl: string; error?: string }> {
  try {
    // Ensure we have a valid ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      return {
        audioUrl: "",
        error: "API key not configured. Please add your ElevenLabs API key to the environment variables.",
      }
    }

    const voiceId = options.voiceId || DEFAULT_VOICE_ID
    const modelId = options.modelId || "eleven_turbo_v2"

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.75,
          style: options.style || 0.0,
          use_speaker_boost: options.speakerBoost !== undefined ? options.speakerBoost : true,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Failed to generate speech")
    }

    // Get audio blob
    const audioBlob = await response.blob()

    // Create a URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob)

    return { audioUrl }
  } catch (error) {
    console.error("Error generating speech:", error)
    return {
      audioUrl: "",
      error: error instanceof Error ? error.message : "Failed to generate speech",
    }
  }
}

// Stream TTS audio
export async function streamSpeech(
  text: string,
  onChunk: (audioChunk: Uint8Array) => void,
  onComplete: () => void,
  onError: (error: string) => void,
  options: TTSOptions = {},
): Promise<{ abort: () => void }> {
  try {
    // Ensure we have a valid ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      onError("API key not configured. Please add your ElevenLabs API key to the environment variables.")
      return { abort: () => {} }
    }

    const voiceId = options.voiceId || DEFAULT_VOICE_ID
    const modelId = options.modelId || "eleven_turbo_v2"

    const controller = new AbortController()
    const signal = controller.signal

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.75,
          style: options.style || 0.0,
          use_speaker_boost: options.speakerBoost !== undefined ? options.speakerBoost : true,
        },
      }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Failed to stream speech")
    }

    // Get the reader from the response body
    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error("Failed to get response reader")
    }

    // Read the stream
    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            onComplete()
            break
          }

          onChunk(value)
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Stream aborted")
        } else {
          console.error("Error reading stream:", error)
          onError(error instanceof Error ? error.message : "Error streaming audio")
        }
      }
    }

    // Start reading the stream
    readStream()

    // Return a function to abort the stream
    return {
      abort: () => controller.abort(),
    }
  } catch (error) {
    console.error("Error setting up speech stream:", error)
    onError(error instanceof Error ? error.message : "Failed to stream speech")
    return { abort: () => {} }
  }
}
