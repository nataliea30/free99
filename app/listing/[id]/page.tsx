"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Send,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getTagColor } from "@/lib/tag-colors"
import type { Conversation, Listing } from "@/lib/types"
import { authHeaders, readJsonSafe } from "@/lib/demo-client"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [currentImage, setCurrentImage] = useState(0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({})
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isMessaging, setIsMessaging] = useState(false)
  const [claimantOptions, setClaimantOptions] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClaimantId, setSelectedClaimantId] = useState("")

  useEffect(() => {
    let isMounted = true
    const loadListing = async () => {
      try {
        const response = await fetch(`/api/listings/${id}`)
        const payload = ((await readJsonSafe<{ listing?: Listing; error?: string }>(response)) ??
          {}) as {
          listing?: Listing
          error?: string
        }

        if (!response.ok || !payload.listing) {
          throw new Error(payload.error ?? "Unable to load listing")
        }

        if (isMounted) {
          setListing(payload.listing)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load listing")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadListing()
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    setBrokenImages({})
    setCurrentImage(0)
  }, [listing?.id])

  useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => {
      setCurrentImage(carouselApi.selectedScrollSnap())
    }
    onSelect()
    carouselApi.on("select", onSelect)
    carouselApi.on("reInit", onSelect)
    return () => {
      carouselApi.off("select", onSelect)
      carouselApi.off("reInit", onSelect)
    }
  }, [carouselApi])

  useEffect(() => {
    let isMounted = true
    const loadCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            ...authHeaders(),
          },
        })

        if (!response.ok) {
          return
        }

        const payload = ((await readJsonSafe<{ user?: { id: string } }>(response)) ?? {}) as {
          user?: { id: string }
        }
        if (isMounted && payload.user) {
          setCurrentUserId(payload.user.id)
        }
      } catch (err) {
        // Ignore auth lookup errors for logged-out visitors.
      }
    }

    loadCurrentUser()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!listing || !currentUserId || listing.seller.id !== currentUserId) {
      setClaimantOptions([])
      setSelectedClaimantId("")
      return
    }

    let isMounted = true
    const loadClaimants = async () => {
      try {
        const response = await fetch("/api/conversations", {
          headers: {
            ...authHeaders(),
          },
        })
        if (!response.ok) return

        const payload = ((await readJsonSafe<{ conversations?: Conversation[] }>(response)) ??
          {}) as { conversations?: Conversation[] }
        if (!payload.conversations || !isMounted) return

        const byId = new Map<string, { id: string; name: string }>()
        payload.conversations
          .filter((conversation) => conversation.listing.id === listing.id)
          .forEach((conversation) => {
            const claimant = conversation.participants.find((p) => p.id !== currentUserId)
            if (claimant) {
              byId.set(claimant.id, { id: claimant.id, name: claimant.name })
            }
          })

        if (listing.claimedBy) {
          byId.set(listing.claimedBy.id, {
            id: listing.claimedBy.id,
            name: listing.claimedBy.name,
          })
        }

        const nextOptions = Array.from(byId.values())
        setClaimantOptions(nextOptions)
        setSelectedClaimantId((prev) => {
          if (listing.claimedBy?.id) return listing.claimedBy.id
          if (prev && nextOptions.some((opt) => opt.id === prev)) return prev
          return nextOptions[0]?.id ?? ""
        })
      } catch (_err) {
        // Ignore claimant lookup failures.
      }
    }

    void loadClaimants()
    return () => {
      isMounted = false
    }
  }, [listing, currentUserId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-semibold text-foreground">Unable to load listing</h2>
        <p className="mt-2 text-sm text-destructive">{error}</p>
        <Button asChild className="mt-4 bg-transparent" variant="outline">
          <Link href="/">Back to listings</Link>
        </Button>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-semibold text-foreground">
          Listing not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This listing may have been removed or expired.
        </p>
        <Button asChild className="mt-4 bg-transparent" variant="outline">
          <Link href="/">Back to listings</Link>
        </Button>
      </div>
    )
  }

  const statusLabel = listing.status === "Available" ? null : "Sold"
  const statusClassName = "bg-muted text-muted-foreground"

  const isSeller = listing.seller.id === currentUserId
  const isClaimedByYou = listing.claimedBy?.id === currentUserId

  const handleMessageSeller = async () => {
    setClaimError(null)
    setIsMessaging(true)

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ listingId: listing.id, messageOnly: true }),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      const payload = ((await readJsonSafe<{
        conversation?: { id: string }
        error?: string
      }>(response)) ?? {}) as {
        conversation?: { id: string }
        error?: string
      }

      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error ?? "Unable to start conversation")
      }

      router.push(`/messages?conversation=${payload.conversation.id}`)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Unable to message seller")
    } finally {
      setIsMessaging(false)
    }
  }

  const updateStatus = async (status: Listing["status"], claimedById?: string | null) => {
    setStatusError(null)
    setIsUpdatingStatus(true)

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          status,
          claimedById: claimedById ?? listing.claimedBy?.id ?? null,
        }),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      const payload = ((await readJsonSafe<{ listing?: Listing; error?: string }>(response)) ??
        {}) as { listing?: Listing; error?: string }
      if (!response.ok || !payload.listing) {
        throw new Error(payload.error ?? "Unable to update listing")
      }

      setListing(payload.listing)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Unable to update listing")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        {/* Image section */}
        <div className="md:col-span-3 animate-float-up stagger-1">
          <div className="relative overflow-hidden rounded-xl bg-muted">
            <Carousel
              opts={{ loop: listing.images.length > 1 }}
              setApi={setCarouselApi}
              className="w-full"
            >
              <CarouselContent className="ml-0">
                {(listing.images.length ? listing.images : ["/placeholder.svg"]).map((image, i) => (
                  <CarouselItem key={`${listing.id}-image-${i}`} className="pl-0">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={brokenImages[i] ? "/placeholder.svg" : image}
                        alt={`${listing.title} image ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 60vw"
                        priority={i === 0}
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [i]: true }))
                        }
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {listing.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => carouselApi?.scrollPrev()}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm text-card-foreground shadow-sm hover:bg-card transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => carouselApi?.scrollNext()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm text-card-foreground shadow-sm hover:bg-card transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image dots */}
            {listing.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {listing.images.map((_, i) => (
                  <button
                    key={`dot-${listing.id}-${i}`}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(i)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      i === currentImage
                        ? "bg-card"
                        : "bg-card/50"
                    )}
                    aria-label={`View image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="md:col-span-2 animate-float-up stagger-3">
          <div className="flex items-center gap-2 mb-3">
            {statusLabel && (
              <Badge className={cn("text-xs font-semibold", statusClassName)}>
                {statusLabel}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {listing.condition}
            </Badge>
            {isClaimedByYou && (
              <Badge variant="secondary" className="text-xs">
                Claimed by you
              </Badge>
            )}
            {listing.claimedBy && !isClaimedByYou && (
              <Badge variant="secondary" className="text-xs">
                Claimed by {listing.claimedBy.name}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground text-balance">
            {listing.title}
          </h1>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(listing.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {listing.location}
            </span>
          </div>

          <Separator className="my-4" />

          <p className="text-sm text-foreground leading-relaxed">
            {listing.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{listing.category}</Badge>
            {listing.tags.map((tag) => (
              <Badge key={tag.id} className={cn("text-xs font-medium border", getTagColor(tag.id))}>
                {tag.label}
              </Badge>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Seller card */}
          <Link
            href={`/profile/${listing.seller.id}`}
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {listing.seller.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {listing.seller.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {listing.seller.university.name}
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Message Seller — always visible for non-sellers */}
            {currentUserId && !isSeller && (
              <Button
                size="lg"
                className="w-full"
                variant="outline"
                onClick={handleMessageSeller}
                disabled={isMessaging}
              >
                <Send className="mr-2 h-4 w-4" />
                {isMessaging ? "Opening chat..." : "Message Seller"}
              </Button>
            )}

            {!currentUserId && (
              <Button
                size="lg"
                className="w-full"
                variant="ghost"
                onClick={() => router.push("/auth/login")}
              >
                <Send className="mr-2 h-4 w-4" />
                Sign in to message seller
              </Button>
            )}

            {listing.status === "Claimed" && !isSeller && currentUserId && (
              <Button size="lg" className="w-full" disabled>
                Already Claimed
              </Button>
            )}

            {listing.status === "Gone" && !isSeller && currentUserId && (
              <Button size="lg" className="w-full" disabled>
                No Longer Available
              </Button>
            )}

            {isSeller && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Seller controls
                </p>
                <label className="text-xs text-muted-foreground" htmlFor="claimant">
                  Claimed by
                </label>
                <select
                  id="claimant"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedClaimantId}
                  onChange={(e) => setSelectedClaimantId(e.target.value)}
                  disabled={isUpdatingStatus || claimantOptions.length === 0}
                >
                  {claimantOptions.length === 0 ? (
                    <option value="">No interested users yet</option>
                  ) : (
                    claimantOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => updateStatus("Claimed", selectedClaimantId)}
                    disabled={
                      isUpdatingStatus ||
                      claimantOptions.length === 0 ||
                      !selectedClaimantId ||
                      (listing.status === "Claimed" && listing.claimedBy?.id === selectedClaimantId)
                    }
                  >
                    {isUpdatingStatus ? "Updating..." : "Mark Claimed"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => updateStatus("Gone")}
                    disabled={isUpdatingStatus || listing.status === "Gone"}
                  >
                    Mark Gone
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => updateStatus("Available", null)}
                  disabled={isUpdatingStatus || listing.status === "Available"}
                >
                  Reopen
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-muted-foreground bg-transparent">
                <Flag className="mr-1.5 h-3.5 w-3.5" />
                Report
              </Button>
            </div>
            {claimError && (
              <p className="text-sm text-destructive" role="alert">
                {claimError}
              </p>
            )}
            {statusError && (
              <p className="text-sm text-destructive" role="alert">
                {statusError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
