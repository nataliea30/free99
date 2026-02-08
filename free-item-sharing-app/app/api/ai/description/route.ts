import { NextResponse } from "next/server"
import { findUserBySession } from "@/lib/postgres-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN_DESCRIPTION_LENGTH = 220

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()
const DESCRIPTION_MAX_LENGTH = 500

const isLowQualityDescription = (description: string, title: string) => {
  const normalizedDescription = normalizeWhitespace(description).toLowerCase()
  const normalizedTitle = normalizeWhitespace(title).toLowerCase()

  if (normalizedDescription.length < MIN_DESCRIPTION_LENGTH) {
    return true
  }

  // If the model mostly echoes the title, treat as low quality.
  if (
    normalizedDescription.startsWith(normalizedTitle) ||
    normalizedDescription.startsWith(`free ${normalizedTitle}`)
  ) {
    return true
  }

  return false
}

const getToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim()
  }
  return request.headers.get("x-demo-session")
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

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key on server" },
      { status: 500 }
    )
  }

  try {
    const body = (await request.json()) as {
      title?: string
      category?: string
      condition?: string
    }

    const title = body.title?.trim()
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const basePrompt = [
      "Write a realistic Facebook Marketplace-style description for a free item.",
      "Use a natural, trustworthy tone and include details that help someone decide quickly.",
      "Cover: overall condition, time used, any flaws, what is included, and a practical pickup note.",
      "Write from the perspective of a student giving the item away for free.",
      "Do not repeat the title as the first sentence.",
      "Return plain text only, no markdown, no bullet points, no emojis.",
      "Length: 5-8 sentences, around 450-700 characters.",
      `Title: ${title}`,
      body.category ? `Category: ${body.category}` : null,
      body.condition ? `Condition: ${body.condition}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const configuredModel = process.env.GEMINI_MODEL?.trim()
    const candidateModels = [
      configuredModel,
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
    ].filter((value): value is string => Boolean(value))

    const listModelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: "GET" }
    )
    if (listModelsResponse.ok) {
      const listModelsPayload = (await listModelsResponse.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
      }
      const apiSupported = (listModelsPayload.models ?? [])
        .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model) => model.name?.replace(/^models\//, ""))
        .filter((name): name is string => Boolean(name))

      const flashPreferred = apiSupported.filter((name) => name.includes("flash"))
      candidateModels.push(...flashPreferred, ...apiSupported)
    }

    const uniqueModels = Array.from(new Set(candidateModels))

    let response: Response | null = null
    let payload:
      | {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
          }>
          error?: { message?: string }
        }
      | null = null
    let lastError = "Gemini request failed"
    let generated = ""
    const promptAttempts = [
      basePrompt,
      `${basePrompt}\n\nImportant: The previous output was too short or repeated the title. Rewrite with specific condition details, what is included, and a clear pickup note.`,
    ]

    for (const prompt of promptAttempts) {
      for (const model of uniqueModels) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.6,
                topP: 0.95,
                maxOutputTokens: 420,
              },
            }),
          }
        )

        payload = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
          }>
          error?: { message?: string }
        }

        if (!response.ok) {
          lastError = payload.error?.message ?? `Gemini request failed for model ${model}`
          continue
        }

        generated =
          payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim() ?? ""

        if (!generated) {
          lastError = "Gemini returned an empty description"
          continue
        }

        if (!isLowQualityDescription(generated, title)) {
          break
        }

        lastError = "Generated description was too short or too similar to the title"
        generated = ""
      }

      if (generated) {
        break
      }
    }
    if (!response || !payload || !response.ok || !generated) {
      return NextResponse.json(
        { error: lastError },
        { status: 400 }
      )
    }

    const boundedDescription = normalizeWhitespace(generated).slice(0, DESCRIPTION_MAX_LENGTH)
    return NextResponse.json({ description: boundedDescription })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate description"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
