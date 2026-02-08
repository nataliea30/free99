import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const maxSizeBytes = 5 * 1024 * 1024
    if (buffer.byteLength > maxSizeBytes) {
      return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 })
    }

    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`
    return NextResponse.json({ url: dataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload image"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
