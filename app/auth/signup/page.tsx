"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { readJsonSafe, setSessionToken } from "@/lib/demo-client"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEduEmail = email.endsWith(".edu")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isEduEmail) {
      setError("Please use your .edu university email address")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const payload = ((await readJsonSafe<{ token?: string; error?: string }>(response)) ??
        {}) as {
        token?: string
        error?: string
      }

      if (!response.ok || !payload.token) {
        throw new Error(payload.error ?? "Unable to create account")
      }

      setSessionToken(payload.token)
      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-white relative">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-sm animate-float-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-4">
            <Image src="/brand/left.jpg" alt="Brand mascot left" width={80} height={80} className="h-20 w-20" />
            <span className="text-3xl font-bold tracking-tight text-foreground">neighbr2neighbr</span>
            <Image src="/brand/right.jpg" alt="Brand mascot right" width={80} height={80} className="h-20 w-20" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join your campus marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              University Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
            />
            {email && !isEduEmail && (
              <p className="mt-1 text-xs text-destructive">
                Please use your .edu university email address
              </p>
            )}
            {isEduEmail && (
              <p className="mt-1 text-xs text-primary">
                University will be auto-detected from your email
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!isEduEmail || !name || !password || isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>

        <Separator className="my-6" />

        <Button variant="outline" className="w-full bg-transparent">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
