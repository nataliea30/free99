import { NextResponse } from "next/server"
import { createSession, findUserByEmail, validatePassword } from "@/lib/postgres-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    const user = await findUserByEmail(body.email)
    if (!user || !validatePassword(user, body.password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = await createSession(user.id)
    const { password: _password, ...publicUser } = user

    return NextResponse.json({ user: publicUser, token })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log in"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
