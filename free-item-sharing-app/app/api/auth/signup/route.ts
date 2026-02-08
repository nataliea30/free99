import { NextResponse } from "next/server"
import { createSession, createUser } from "@/lib/postgres-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      name?: string
      password?: string
      avatarUrl?: string
      bio?: string
    }

    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: "email, name, and password are required" },
        { status: 400 }
      )
    }

    const user = await createUser({
      email: body.email,
      name: body.name,
      password: body.password,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    })

    const token = await createSession(user.id)

    return NextResponse.json({ user, token })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
