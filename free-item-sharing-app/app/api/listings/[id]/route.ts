import { NextResponse } from "next/server"
import {
  deleteListing,
  findListingById,
  findUserBySession,
  updateListing,
} from "@/lib/demo-db"
import type { Listing } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const getToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim()
  }
  return request.headers.get("x-demo-session")
}

const requireUserId = async (request: Request) => {
  const token = getToken(request)
  if (!token) {
    return null
  }
  const user = await findUserBySession(token)
  return user?.id ?? null
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const listing = await findListingById(id)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }
  return NextResponse.json({ listing })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  try {
    const body = (await request.json()) as Partial<{
      title: string
      description: string
      images: string[]
      category: Listing["category"]
      condition: Listing["condition"]
      tags: Listing["tags"]
      status: Listing["status"]
      location: string
      expiresAt: string
      claimedById: string | null
    }>

    const listing = await updateListing({
      id,
      sellerId: userId,
      data: body,
    })

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    return NextResponse.json({ listing })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update listing"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  try {
    const removed = await deleteListing({ id, sellerId: userId })
    if (!removed) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete listing"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
