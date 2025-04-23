import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Check if ElevenLabs API key is available
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn("ElevenLabs API key not configured, using fallback TTS")
      return NextResponse.json({
        useBuiltInTTS: true,
        message: "Using browser's built-in TTS as fallback",
      })
    }

    try {
      // Default voice ID (Rachel)
      const voiceId = "21m00Tcm4TlvDq8ikWAM"

      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      // Get audio as blob
      const audioBlob = await response.blob()

      // Convert to base64 for sending to client
      const buffer = await audioBlob.arrayBuffer()
      const base64Audio = Buffer.from(buffer).toString("base64")

      // Create a data URL
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

      return NextResponse.json({ audioUrl })
    } catch (ttsError) {
      console.error("TTS API error:", ttsError)
      // Fall back to browser's built-in TTS
      return NextResponse.json({
        useBuiltInTTS: true,
        error: ttsError instanceof Error ? ttsError.message : "Unknown TTS error",
      })
    }
  } catch (error) {
    console.error("Error in TTS API:", error)
    return NextResponse.json(
      {
        useBuiltInTTS: true,
        error: "Failed to generate speech",
      },
      { status: 200 },
    ) // Return 200 even for errors
  }
}
