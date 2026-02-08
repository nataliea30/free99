import { NextResponse } from "next/server"
import {
  createConversationForListing,
  findUserBySession,
  listConversationsForUser,
} from "@/lib/postgres-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const getToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim()
  }
  return request.headers.get("x-demo-session")
}

export async function GET(request: Request) {
  const token = getToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUserBySession(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const conversations = await listConversationsForUser(user.id)
  const { password: _password, ...publicUser } = user

  return NextResponse.json({ conversations, currentUser: publicUser })
}

export async function POST(request: Request) {
  const token = getToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUserBySession(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { listingId?: string; messageOnly?: boolean }
    if (!body.listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 })
    }

    const conversation = await createConversationForListing({
      listingId: body.listingId,
      requesterId: user.id,
      messageOnly: body.messageOnly ?? false,
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start conversation"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
