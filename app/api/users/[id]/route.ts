import { NextResponse } from "next/server"
import {
  findUserById,
  findUserBySession,
  listListings,
  updateUserProfile,
} from "@/lib/demo-db"
import type { Tag } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const getToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim()
  }
  return request.headers.get("x-demo-session")
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const token = getToken(request)
  const sessionUser = token ? await findUserBySession(token) : null

  const { id: requestedId } = await context.params
  const user =
    requestedId === "me" && sessionUser
      ? sessionUser
      : await findUserById(requestedId)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const listings = await listListings()
  const userListings = listings.filter((listing) => listing.seller.id === user.id)
  const canViewClaimed = sessionUser?.id === user.id
  const claimedListings = canViewClaimed
    ? listings.filter((listing) => listing.claimedBy?.id === user.id)
    : []
  const { password: _password, ...publicUser } = user

  return NextResponse.json({
    user: publicUser,
    currentUserId: sessionUser?.id ?? null,
    listings: userListings,
    claimedListings,
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const token = getToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionUser = await findUserBySession(token)
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const { id: requestedId } = await context.params

  if (requestedId !== "me" && requestedId !== sessionUser.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  try {
    const body = (await request.json()) as Partial<{
      name: string
      bio: string
      avatarUrl: string
      tags: Tag[]
    }>

    const updated = await updateUserProfile({
      userId: sessionUser.id,
      data: {
        name: body.name,
        bio: body.bio,
        avatarUrl: body.avatarUrl,
        tags: body.tags,
      },
    })

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
