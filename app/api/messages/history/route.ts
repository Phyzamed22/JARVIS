import { type NextRequest, NextResponse } from "next/server"
import { getConversationMessages, getConversations } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const conversationId = url.searchParams.get("conversationId")
    const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)

    if (conversationId) {
      // Get messages for a specific conversation
      const messages = await getConversationMessages(conversationId, limit)
      return NextResponse.json({ messages })
    } else {
      // Get all conversations
      const conversations = await getConversations(limit)
      return NextResponse.json({ conversations })
    }
  } catch (error) {
    console.error("Error retrieving message history:", error)
    return NextResponse.json({ error: "Failed to retrieve message history" }, { status: 500 })
  }
}
