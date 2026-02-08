import { NextResponse } from "next/server"
import { appendMessage, findUserBySession, markConversationRead } from "@/lib/postgres-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const getToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim()
  }
  return request.headers.get("x-demo-session")
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await context.params
  const token = getToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUserBySession(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { body?: string; attachments?: string[] }
    const text = body.body?.trim() ?? ""
    const attachments = body.attachments?.filter((item) => typeof item === "string") ?? []

    if (!text && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message body or attachment is required" },
        { status: 400 }
      )
    }

    if (attachments.length > 4) {
      return NextResponse.json({ error: "Too many attachments" }, { status: 400 })
    }

    const result = await appendMessage({
      conversationId,
      senderId: user.id,
      body: text,
      attachments,
    })

    if (!result) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await context.params
  const token = getToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUserBySession(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  try {
    const conversation = await markConversationRead({
      conversationId,
      userId: user.id,
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark messages as read"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
