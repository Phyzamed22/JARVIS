import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if ElevenLabs API key is available
    const apiKey = process.env.ELEVENLABS_API_KEY || "sk_68417b1f2c61a833f7b0d64bbcccea34c981521a06fbc150"

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs API key not configured",
          useBuiltInTTS: true,
        }),
        {
          status: 200, // Return 200 to allow fallback
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Default voice ID for ElevenLabs (Rachel voice)
    const voiceId = "21m00Tcm4TlvDq8ikWAM" // Rachel voice

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
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
      const errorData = await response.json().catch(() => ({}))
      console.error("ElevenLabs API error:", response.status, JSON.stringify(errorData))

      // Check for quota exceeded or unusual activity errors
      if (response.status === 401) {
        const errorMessage = errorData?.detail?.message || "Unauthorized access to ElevenLabs API"
        const errorStatus = errorData?.detail?.status || "unauthorized"

        console.warn(`ElevenLabs API error: ${errorStatus} - ${errorMessage}`)

        return new Response(
          JSON.stringify({
            error: `ElevenLabs API error: ${errorStatus}`,
            message: errorMessage,
            useBuiltInTTS: true,
          }),
          {
            status: 200, // Return 200 to allow fallback
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      throw new Error(`ElevenLabs API error: ${response.status} ${JSON.stringify(errorData)}`)
    }

    // Return the audio directly as a stream
    const audioBlob = await response.blob()
    return new Response(audioBlob, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  } catch (error) {
    console.error("Error in TTS API:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        useBuiltInTTS: true,
      }),
      {
        status: 200, // Return 200 to allow fallback
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
