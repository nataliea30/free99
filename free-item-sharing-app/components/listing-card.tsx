"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"
import { getTagColor } from "@/lib/tag-colors"

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ListingCard({
  listing,
  currentUserId,
}: {
  listing: Listing
  currentUserId?: string | null
}) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 ease-smooth hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 hover:scale-[1.01]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={imageFailed ? "/placeholder.svg" : (listing.images[0] || "/placeholder.svg")}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-500 ease-smooth group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onError={() => setImageFailed(true)}
        />
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-card-foreground text-xs">
            {listing.condition}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
        </div>

        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs font-normal">
            {listing.category}
          </Badge>
          {listing.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              className={cn("text-xs font-medium border", getTagColor(tag.id))}
            >
              {tag.label}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{listing.location}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {listing.seller.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span className="text-xs text-muted-foreground">
            {listing.seller.name}
          </span>
        </div>
      </div>
    </Link>
  )
}
