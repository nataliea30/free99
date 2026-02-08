"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, Plus, MessageCircle, User, LogIn, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { authHeaders, clearSessionToken } from "@/lib/demo-client"
import type { Conversation, User as AppUser } from "@/lib/types"

export function MobileNav() {
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

        const payload = (await response.json()) as { user?: AppUser }
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

        const conversationsPayload = (await conversationsResponse.json()) as {
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

  const navItems = currentUser
    ? [
        { href: "/", label: "Home", icon: Home },
        { href: "/post", label: "Post", icon: Plus },
        { href: "/messages", label: "Messages", icon: MessageCircle },
        { href: `/profile/${currentUser.id}`, label: "Profile", icon: User },
      ]
    : [
        { href: "/", label: "Home", icon: Home },
        { href: "/auth/login", label: "Sign In", icon: LogIn },
        { href: "/auth/signup", label: "Sign Up", icon: User },
      ]

  const isAuth = pathname.startsWith("/auth")
  if (isAuth) return null

  const handleLogout = () => {
    clearSessionToken()
    setCurrentUser(null)
    router.push("/auth/login")
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around py-2">
        {!isLoading && navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.label === "Messages" && currentUser && unreadCount > 0 && (
                <span className="absolute right-0 top-0 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
        {!isLoading && currentUser && (
          <button
            type="button"
            onClick={handleLogout}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </nav>
  )
}
