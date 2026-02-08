"use client"

import React, { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Send, ArrowLeft, CheckCheck, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Conversation, Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/demo-client"
import { useRouter, useSearchParams } from "next/navigation"

function getConversationStatusLabel(conversation: Conversation): string {
  if (conversation.listing.title === "Deleted listing") {
    return "Deleted"
  }
  if (conversation.listing.status === "Claimed" || conversation.listing.status === "Gone") {
    return "Sold"
  }
  return "Available"
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  currentUserId: string
}) {
  const otherParticipant = conversation.participants.find(
    (p) => p.id !== currentUserId
  )
  const lastMsg = conversation.lastMessage
  const unreadCount = conversation.messages.filter(
    (m) => !m.read && m.sender.id !== currentUserId
  ).length

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-muted"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground flex-shrink-0">
        {otherParticipant?.name
          .split(" ")
          .map((n) => n[0])
          .join("") || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-foreground truncate">
            {otherParticipant?.name || "Unknown"}
          </span>
          {lastMsg && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          Item: {conversation.listing.title === "Deleted listing" ? "Deleted" : conversation.listing.title}
        </p>
        {lastMsg && (
          <p
            className={cn(
              "text-sm truncate mt-0.5",
              unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {lastMsg.sender.id === currentUserId ? "You: " : ""}
            {lastMsg.body
              ? lastMsg.body
              : lastMsg.attachments?.length
                ? `Photo${lastMsg.attachments.length > 1 ? "s" : ""}`
                : ""}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex-shrink-0 mt-1">
          {unreadCount}
        </div>
      )}
    </button>
  )
}

function MessageBubble({
  message,
  currentUserId,
}: {
  message: Message
  currentUserId: string
}) {
  const isOwn = message.sender.id === currentUserId

  return (
    <div
      className={cn("flex gap-2 mb-3", isOwn ? "justify-end" : "justify-start")}
    >
      {!isOwn && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex-shrink-0 mt-1">
          {message.sender.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {message.body ? (
          <p className="text-sm leading-relaxed">{message.body}</p>
        ) : null}
        {message.attachments?.length > 0 && (
          <div className={cn("mt-2 grid grid-cols-2 gap-2", !message.body && "mt-0")}>
            {message.attachments.map((url, index) => (
              <a
                key={`${message.id}-att-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <Image src={url} alt="Attachment" fill className="object-cover" sizes="120px" />
              </a>
            ))}
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-[10px]",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {formatTime(message.createdAt)}
          </span>
          {isOwn && message.read && (
            <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  const [showConversationList, setShowConversationList] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadConversations = async () => {
      try {
        const response = await fetch("/api/conversations", {
          headers: {
            ...authHeaders(),
          },
        })

        if (response.status === 401) {
          router.push("/auth/login")
          return
        }

        const payload = (await response.json()) as {
          conversations?: Conversation[]
          currentUser?: { id: string }
          error?: string
        }

        if (!response.ok || !payload.conversations || !payload.currentUser) {
          throw new Error(payload.error ?? "Unable to load conversations")
        }

        if (isMounted) {
          setConversations(payload.conversations)
          setCurrentUserId(payload.currentUser.id)
          const requestedId = searchParams.get("conversation")
          const requestedConversation = payload.conversations.find(
            (conversation) => conversation.id === requestedId
          )
          setActiveConversationId(
            requestedConversation?.id ?? payload.conversations[0]?.id ?? null
          )
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load conversations")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadConversations()
    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  useEffect(() => {
    if (!activeConversationId || !currentUserId) return

    let isMounted = true
    const markAsRead = async () => {
      try {
        const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
          method: "PATCH",
          headers: {
            ...authHeaders(),
          },
        })

        if (response.status === 401) {
          router.push("/auth/login")
          return
        }

        const payload = (await response.json()) as {
          conversation?: Conversation
          error?: string
        }

        if (!response.ok || !payload.conversation || !isMounted) {
          return
        }

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === payload.conversation?.id ? payload.conversation : conversation
          )
        )
        window.dispatchEvent(new Event("messages-updated"))
      } catch (_err) {
        // Ignore read receipt sync failures.
      }
    }

    void markAsRead()
    return () => {
      isMounted = false
    }
  }, [activeConversationId, currentUserId, router])

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.id !== currentUserId
  )
  const isMessagingClosed =
    !!activeConversation &&
    (activeConversation.listing.title === "Deleted listing" ||
      activeConversation.listing.status === "Claimed" ||
      activeConversation.listing.status === "Gone")

  const uploadAttachments = async (files: FileList) => {
    const remainingSlots = 4 - pendingAttachments.length
    if (remainingSlots <= 0) return

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    if (filesToUpload.length === 0) return

    setUploadError(null)
    setIsUploading(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        const payload = (await response.json()) as { url?: string; error?: string }
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? "Unable to upload image")
        }

        uploadedUrls.push(payload.url)
      }

      setPendingAttachments((prev) => [...prev, ...uploadedUrls])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload image")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSendError(null)
    if (isMessagingClosed) {
      setSendError(
        activeConversation?.listing.title === "Deleted listing"
          ? "This listing was deleted. Messaging is closed."
          : "This listing is sold. Messaging is closed."
      )
      return
    }
    if (!newMessage.trim() && pendingAttachments.length === 0) return

    if (!activeConversation || !currentUserId) {
      return
    }

    const pendingMessage = newMessage.trim()
    setNewMessage("")
    const attachmentsToSend = [...pendingAttachments]
    setPendingAttachments([])

    try {
      const response = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ body: pendingMessage, attachments: attachmentsToSend }),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      const payload = (await response.json()) as {
        conversation?: Conversation
        error?: string
      }

      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error ?? "Unable to send message")
      }

      setConversations((prev) =>
        prev.map((conv) => (conv.id === payload.conversation?.id ? payload.conversation : conv))
      )
      window.dispatchEvent(new Event("messages-updated"))
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unable to send message")
      setPendingAttachments(attachmentsToSend)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-sm text-muted-foreground">Loading messages…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-semibold text-foreground">Unable to load messages</h2>
        <p className="mt-2 text-sm text-destructive">{error}</p>
        <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/">Browse Listings</Link>
        </Button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Send className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No messages yet</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          When you message a seller from a listing, the conversation will appear
          here.
        </p>
        <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/">Browse Listings</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Conversation list */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0 flex flex-col animate-float-up stagger-1",
          !showConversationList && "hidden md:flex"
        )}
      >
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground animate-fade-in">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => {
                  setActiveConversationId(conv.id)
                  setShowConversationList(false)
                }}
                currentUserId={currentUserId ?? ""}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message thread */}
      <div
        className={cn(
          "flex-1 flex flex-col animate-float-up stagger-2",
          showConversationList && !activeConversation && "hidden md:flex"
        )}
      >
        {activeConversation ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <button
                type="button"
                onClick={() => setShowConversationList(true)}
                className="md:hidden text-muted-foreground hover:text-foreground"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground flex-shrink-0">
                {otherParticipant?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("") || "?"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {otherParticipant?.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · Item: {activeConversation.listing.title === "Deleted listing" ? "Deleted" : activeConversation.listing.title}
                  </span>
                </p>
                <Link
                  href={`/listing/${activeConversation.listing.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Re: {activeConversation.listing.title}
                </Link>
              </div>

              <Badge
                className={cn(
                  "text-xs",
                  activeConversation.listing.title === "Deleted listing"
                    ? "bg-destructive text-destructive-foreground"
                    : getConversationStatusLabel(activeConversation) === "Available"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {getConversationStatusLabel(activeConversation)}
              </Badge>
            </div>

            {/* Listing preview */}
            <div className="p-3 border-b border-border bg-muted/30">
              <Link
                href={`/listing/${activeConversation.listing.id}`}
                className="flex items-center gap-3 rounded-lg hover:bg-muted/50 transition-colors p-1"
              >
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={activeConversation.listing.images[0] || "/placeholder.svg"}
                    alt={activeConversation.listing.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activeConversation.listing.title === "Deleted listing"
                      ? "Deleted"
                      : activeConversation.listing.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.listing.title === "Deleted listing"
                      ? "This listing was deleted"
                      : `${activeConversation.listing.condition} · ${activeConversation.listing.location}`}
                  </p>
                </div>
              </Link>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col">
                {activeConversation.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId ?? ""} />
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isMessagingClosed || isUploading || pendingAttachments.length >= 4}
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="sr-only">Attach image</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      void uploadAttachments(e.target.files)
                    }
                  }}
                />
                <Input
                  placeholder={
                    isMessagingClosed
                      ? "Messaging closed for this listing"
                      : "Type a message..."
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={isMessagingClosed}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                  disabled={
                    isMessagingClosed || (!newMessage.trim() && pendingAttachments.length === 0)
                  }
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
              {isMessagingClosed && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {activeConversation.listing.title === "Deleted listing"
                    ? "This listing was deleted. Messaging is closed."
                    : "This listing is sold. Messaging is closed."}
                </p>
              )}
              {sendError && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {sendError}
                </p>
              )}
              {(pendingAttachments.length > 0 || uploadError) && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((url, index) => (
                      <div
                        key={`pending-${url}-${index}`}
                        className="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                      >
                        <Image src={url} alt="Pending upload" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="absolute top-1 right-1 rounded-full bg-card/90 px-1 text-xs text-foreground"
                          aria-label="Remove attachment"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-xs text-destructive" role="alert">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4 mx-auto">
                <Send className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Select a conversation
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a conversation from the left to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
