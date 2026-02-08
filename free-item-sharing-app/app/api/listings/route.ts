import { NextResponse } from "next/server"
import { createListing, findUserBySession, listListings } from "@/lib/postgres-db"
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

export async function GET() {
  const listings = await listListings()
  return NextResponse.json({ listings })
}

export async function POST(request: Request) {
  const userId = await requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Partial<{
      title: string
      description: string
      images: string[]
      category: Listing["category"]
      condition: Listing["condition"]
      tags: Listing["tags"]
      location: string
      expiresAt: string
    }>

    if (!body.title || !body.description || !body.category || !body.condition || !body.location) {
      return NextResponse.json(
        { error: "title, description, category, condition, and location are required" },
        { status: 400 }
      )
    }

    const listing = await createListing({
      sellerId: userId,
      title: body.title,
      description: body.description,
      images: body.images,
      category: body.category,
      condition: body.condition,
      tags: body.tags,
      location: body.location,
      expiresAt: body.expiresAt,
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create listing"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
