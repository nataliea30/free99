"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ListingCard } from "@/components/listing-card"
import { FilterBar } from "@/components/filter-bar"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Listing } from "@/lib/types"
import { authHeaders, readJsonSafe } from "@/lib/demo-client"
import { cn } from "@/lib/utils"

function getSchoolKeyFromEmail(email: string | null): "gt" | "uga" | null {
  if (!email) return null
  const normalized = email.toLowerCase()
  if (normalized.includes("gatech")) return "gt"
  if (normalized.endsWith("@uga.edu")) return "uga"
  return null
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedCondition, setSelectedCondition] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSchool, setSelectedSchool] = useState("Georgia Institute of Technology")
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const guestSchools = [
    "Georgia Institute of Technology",
    "Emory University",
    "Georgia State University",
    "Kennesaw State University",
    "University of Georgia",
  ]

  useEffect(() => {
    let isMounted = true
    const loadListings = async () => {
      try {
        const [listingsResponse, meResponse] = await Promise.all([
          fetch("/api/listings"),
          fetch("/api/auth/me", { headers: { ...authHeaders() } }),
        ])

        const payload = ((await readJsonSafe<{ listings?: Listing[]; error?: string }>(
          listingsResponse
        )) ?? {}) as {
          listings?: Listing[]
          error?: string
        }

        if (!listingsResponse.ok || !payload.listings) {
          throw new Error(payload.error ?? "Unable to load listings")
        }

        if (isMounted) {
          setListings(payload.listings)
          setError(null)
        }

        if (isMounted && meResponse.ok) {
          const mePayload = ((await readJsonSafe<{ user?: { id: string; email: string } }>(
            meResponse
          )) ?? {}) as { user?: { id: string; email: string } }
          setCurrentUserId(mePayload.user?.id ?? null)
          setCurrentUserEmail(mePayload.user?.email ?? null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load listings")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadListings()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredListings = useMemo(() => {
    let filtered = listings.filter((l) => l.status === "Available")
    const currentSchoolKey = getSchoolKeyFromEmail(currentUserEmail)

    // Demo rule: signed-in users only see their own school listings.
    if (currentSchoolKey) {
      filtered = filtered.filter((l) => {
        const sellerSchoolKey = getSchoolKeyFromEmail(l.seller.email)
        return sellerSchoolKey === currentSchoolKey
      })
    } else if (!currentUserId && selectedSchool) {
      filtered = filtered.filter(
        (l) => l.seller.university.name === selectedSchool
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter((l) => l.category === selectedCategory)
    }

    if (selectedCondition !== "all") {
      filtered = filtered.filter((l) => l.condition === selectedCondition)
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortBy === "newest" ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [listings, selectedCategory, selectedCondition, sortBy, searchQuery, currentUserEmail, currentUserId, selectedSchool])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* Hero section */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-1 md:hidden">
            <Image src="/brand/left.jpg" alt="Brand mascot" width={36} height={36} className="h-9 w-9 rounded-lg" />
          </div>
          <div className="flex-1">
            <h1
              className={`text-2xl font-extrabold md:text-3xl text-balance tracking-tight font-["Nunito",system-ui] text-[#2d1b00]`}
            >
              Everything is{" "}
              <span className="inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-primary">
                $FREE.99!!!
              </span>
            </h1>
          </div>
          <div className="hidden sm:flex flex-col items-end">
              <p className="text-lg md:text-xl font-extrabold text-black">
              {currentUserId
                ? getSchoolKeyFromEmail(currentUserEmail) === "uga"
                  ? "University of Georgia 🐶"
                  : "Georgia Institute of Technology 🐝"
                : `${selectedSchool}${
                    selectedSchool === "Georgia Institute of Technology"
                      ? " 🐝"
                      : selectedSchool === "University of Georgia"
                        ? " 🐶"
                        : ""
                  }`}
            </p>
          </div>
        </div>

        {!isLoading && !currentUserId && (
          <div className="mt-3 rounded-xl border border-border bg-card/80 p-5 animate-float-up stagger-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Guest browsing
              </span>
              <span className="text-sm text-muted-foreground">
                Select a school to preview listings
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {guestSchools.map((school, i) => (
                <button
                  key={school}
                  type="button"
                  onClick={() => setSelectedSchool(school)}
                  className={cn(
                    "animate-pop-in rounded-full px-4 py-2 text-sm font-medium transition-[transform,box-shadow,background-color,color,outline-color] duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.06] hover:shadow-[0_14px_28px_-14px_rgba(0,0,0,0.45)] hover:ring-2 hover:ring-primary/25 active:translate-y-0 active:scale-100",
                    selectedSchool === school
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    `stagger-${Math.min(i + 1, 8)}`
                  )}
                >
                  {school}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Viewing: <span className="font-medium text-foreground">{selectedSchool}</span>. Sign
              in to post or claim items.
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className="relative mt-4 animate-float-up stagger-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-2 border-border/80 shadow-sm rounded-xl focus:border-primary focus:shadow-md focus:ring-primary/20 transition-all duration-300"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="animate-float-up stagger-3">
      <FilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedCondition={selectedCondition}
        onConditionChange={setSelectedCondition}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      </div>

      {/* Results count */}
      <div className="mt-6 mb-4 flex items-center justify-between animate-float-up stagger-4">
        <p className="text-sm text-muted-foreground">
          {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
          {selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}
        </p>
      </div>

      {/* Listing grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading listings…</div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-destructive">{error}</div>
      ) : filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredListings.map((listing, i) => (
            <div key={listing.id} className={`animate-float-up stagger-${Math.min(i + 1, 8)}`}>
              <ListingCard listing={listing} currentUserId={currentUserId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No listings found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Try adjusting your filters or search query to find what you&apos;re looking for.
          </p>
        </div>
      )}
    </div>
  )
}
