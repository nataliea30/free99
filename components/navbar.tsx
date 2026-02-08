"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Plus, MessageCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { authHeaders, clearSessionToken, readJsonSafe } from "@/lib/demo-client"
import type { Conversation, User as AppUser } from "@/lib/types"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    const loadUser = async (silent = false) => {
      if (pathname.startsWith("/auth")) {
        if (isMounted) {
          setCurrentUser(null)
          setUnreadCount(0)
          setIsLoading(false)
        }
        return
      }

      if (!silent) {
        setIsLoading(true)
      }
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: {
            ...authHeaders(),
          },
        })

        if (!response.ok) {
          if (isMounted) {
            setCurrentUser(null)
            setUnreadCount(0)
          }
          return
        }

        const payload = ((await readJsonSafe<{ user?: AppUser }>(response)) ?? {}) as {
          user?: AppUser
        }
        if (!payload.user) {
          if (isMounted) {
            setCurrentUser(null)
            setUnreadCount(0)
          }
          return
        }

        if (isMounted) {
          setCurrentUser(payload.user)
        }

        const conversationsResponse = await fetch("/api/conversations", {
          cache: "no-store",
          headers: {
            ...authHeaders(),
          },
        })

        if (!conversationsResponse.ok) {
          if (isMounted) {
            setUnreadCount(0)
          }
          return
        }

        const conversationsPayload = ((await readJsonSafe<{ conversations?: Conversation[] }>(
          conversationsResponse
        )) ?? {}) as {
          conversations?: Conversation[]
        }
        const unread = (conversationsPayload.conversations ?? []).reduce(
          (count, conversation) =>
            count +
            conversation.messages.filter(
              (message) => !message.read && message.sender.id !== payload.user?.id
            ).length,
          0
        )

        if (isMounted) {
          setUnreadCount(unread)
        }
      } catch (err) {
        // ignore auth lookup failures
        if (isMounted) {
          setCurrentUser(null)
          setUnreadCount(0)
        }
      } finally {
        if (isMounted && !silent) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()
    const intervalId = window.setInterval(() => {
      void loadUser(true)
    }, 15000)
    const onMessagesUpdated = () => {
      void loadUser(true)
    }
    window.addEventListener("messages-updated", onMessagesUpdated)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.removeEventListener("messages-updated", onMessagesUpdated)
    }
  }, [pathname])

  const initials = useMemo(() => {
    if (!currentUser?.name) return "?"
    return currentUser.name
      .split(" ")
      .map((name) => name[0])
      .join("")
  }, [currentUser?.name])

  const isAuth = pathname.startsWith("/auth")
  if (isAuth) return null

  const handleLogout = () => {
    clearSessionToken()
    setCurrentUser(null)
    router.push("/auth/login")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md hidden md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]">
          <Image
            src="/brand/left.jpg"
            alt="Brand mascot left"
            width={64}
            height={64}
            className="h-16 w-16"
          />
          <span className="text-xl font-bold tracking-tight text-foreground">
            neighbr2neighbr
          </span>
          <Image
            src="/brand/right.jpg"
            alt="Brand mascot right"
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </Link>

        <div className="flex-1" />

        <nav className="flex items-center gap-2">
          {!isLoading && currentUser ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  pathname === "/post" && "text-foreground bg-muted"
                )}
              >
                <Link href="/post">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Post
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="icon"
                className={cn(
                  "relative text-muted-foreground hover:text-foreground",
                  pathname === "/messages" && "text-foreground bg-muted"
                )}
              >
                <Link href="/messages">
                  <MessageCircle className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Messages</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  pathname.startsWith("/profile") && "text-foreground bg-muted"
                )}
              >
                <Link href={`/profile/${currentUser.id}`}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </div>
                  <span className="ml-2">Profile</span>
                </Link>
              </Button>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : !isLoading ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
