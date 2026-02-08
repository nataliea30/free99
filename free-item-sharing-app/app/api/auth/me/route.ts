import { NextResponse } from "next/server"
import { findUserBySession } from "@/lib/postgres-db"

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
    return NextResponse.json({ error: "Missing session token" }, { status: 401 })
  }

  const user = await findUserBySession(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const { password: _password, ...publicUser } = user
  return NextResponse.json({ user: publicUser })
}
