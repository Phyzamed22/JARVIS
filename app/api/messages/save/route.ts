import { type NextRequest, NextResponse } from "next/server"
import { saveMessage } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, role, content, audioUrl } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    if (!role || !["user", "assistant", "system"].includes(role)) {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Save message to database
    const message = await saveMessage({
      conversationId,
      role,
      content,
      audioUrl,
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Error saving message:", error)
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }
}
