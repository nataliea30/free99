"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Mail, School, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListingCard } from "@/components/listing-card"
import { getTagColor } from "@/lib/tag-colors"
import { cn } from "@/lib/utils"
import type { Listing, Tag, User } from "@/lib/types"
import { authHeaders, readJsonSafe } from "@/lib/demo-client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { tags as allTags } from "@/lib/mock-data"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userListings, setUserListings] = useState<Listing[]>([])
  const [claimedItems, setClaimedItems] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editTags, setEditTags] = useState<Tag[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingListingId, setEditingListingId] = useState<string | null>(null)
  const [listingTitle, setListingTitle] = useState("")
  const [listingDescription, setListingDescription] = useState("")
  const [listingLocation, setListingLocation] = useState("")
  const [listingStatus, setListingStatus] = useState<Listing["status"]>("Available")
  const [listingError, setListingError] = useState<string | null>(null)
  const [isListingSaving, setIsListingSaving] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/users/${id}`, {
          headers: {
            ...authHeaders(),
          },
        })

        const payload = ((await readJsonSafe<{
          user?: User
          currentUserId?: string | null
          listings?: Listing[]
          claimedListings?: Listing[]
          error?: string
        }>(response)) ?? {}) as {
          user?: User
          currentUserId?: string | null
          listings?: Listing[]
          claimedListings?: Listing[]
          error?: string
        }

        if (!response.ok || !payload.user) {
          throw new Error(payload.error ?? "Unable to load profile")
        }

        if (isMounted) {
          setUser(payload.user)
          setCurrentUserId(payload.currentUserId ?? null)
          setUserListings(payload.listings ?? [])
          setClaimedItems(payload.claimedListings ?? [])
          setEditName(payload.user.name)
          setEditBio(payload.user.bio)
          setEditTags(payload.user.tags ?? [])
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load profile")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [id])

  const isOwnProfile = user?.id === currentUserId

  const toggleTag = (tag: Tag) => {
    setEditTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    )
  }

  const handleSave = async () => {
    if (!user) return
    setSaveError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          tags: editTags,
        }),
      })

      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }

      const payload = ((await readJsonSafe<{ user?: User; error?: string }>(response)) ??
        {}) as { user?: User; error?: string }
      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Unable to update profile")
      }

      setUser(payload.user)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const startEditListing = (listing: Listing) => {
    setEditingListingId(listing.id)
    setListingTitle(listing.title)
    setListingDescription(listing.description)
    setListingLocation(listing.location)
    setListingStatus(listing.status)
    setListingError(null)
  }

  const cancelEditListing = () => {
    setEditingListingId(null)
    setListingError(null)
  }

  const saveListing = async () => {
    if (!editingListingId) return
    setListingError(null)
    setIsListingSaving(true)

    try {
      const response = await fetch(`/api/listings/${editingListingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: listingTitle.trim(),
          description: listingDescription.trim(),
          location: listingLocation.trim(),
          status: listingStatus,
        }),
      })

      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }

      const payload = ((await readJsonSafe<{ listing?: Listing; error?: string }>(response)) ??
        {}) as { listing?: Listing; error?: string }
      if (!response.ok || !payload.listing) {
        throw new Error(payload.error ?? "Unable to update listing")
      }

      setUserListings((prev) =>
        prev.map((item) => (item.id === payload.listing?.id ? payload.listing : item))
      )
      setEditingListingId(null)
    } catch (err) {
      setListingError(err instanceof Error ? err.message : "Unable to update listing")
    } finally {
      setIsListingSaving(false)
    }
  }

  const deleteListing = async (listingId: string) => {
    const confirmed = window.confirm("Delete this listing?")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
        },
      })

      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }

      if (!response.ok) {
        const payload = ((await readJsonSafe<{ error?: string }>(response)) ?? {}) as {
          error?: string
        }
        throw new Error(payload.error ?? "Unable to delete listing")
      }

      setUserListings((prev) => prev.filter((item) => item.id !== listingId))
    } catch (err) {
      setListingError(err instanceof Error ? err.message : "Unable to delete listing")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-semibold text-foreground">Unable to load profile</h2>
        <p className="mt-2 text-sm text-destructive">
          {error ?? "Profile not found"}
        </p>
        <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/">Browse Listings</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-6 animate-float-up stagger-1">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground flex-shrink-0">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>

        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-xs"
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            )}
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing((prev) => !prev)
                  setSaveError(null)
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            )}
          </div>

          {isEditing ? (
            <Textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="mt-2 max-w-md"
              rows={4}
            />
          ) : (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
              {user.bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <School className="h-4 w-4" />
              {user.university.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Joined {formatDate(user.createdAt)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-1.5">
            {(isEditing ? editTags : user.tags).map((tag) => (
              <Badge key={tag.id} className={cn("text-xs font-medium border", getTagColor(tag.id))}>
                {tag.label}
              </Badge>
            ))}
          </div>

          {isEditing && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Select your tags</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = editTags.some((t) => t.id === tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      )}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={handleSave} disabled={isSaving || !editName.trim()}>
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
                {saveError && (
                  <p className="text-sm text-destructive" role="alert">
                    {saveError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Tabs */}
      <Tabs defaultValue="listings" className="animate-float-up stagger-3">
        <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-2">
          <TabsTrigger
            value="listings"
            className="flex-1 md:flex-none rounded-md border border-border bg-white px-4 py-2 text-foreground hover:bg-white/90 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            {isOwnProfile ? "My Listings" : "Listings"} ({userListings.length})
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger
              value="claimed"
              className="flex-1 md:flex-none rounded-md border border-border bg-white px-4 py-2 text-foreground hover:bg-white/90 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Claimed Items ({claimedItems.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          {userListings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userListings.map((listing, i) => (
                <div key={listing.id} className={`flex flex-col gap-3 animate-float-up stagger-${Math.min(i + 1, 8)}`}>
                  <ListingCard listing={listing} currentUserId={currentUserId} />
                  {isOwnProfile && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                        onClick={() => startEditListing(listing)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent text-destructive border-destructive/40 hover:text-destructive"
                        onClick={() => deleteListing(listing.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                No listings yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isOwnProfile
                  ? "You haven't posted any items yet."
                  : "This user hasn't posted any items yet."}
              </p>
              {isOwnProfile && (
                <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/post">Post an Item</Link>
                </Button>
              )}
            </div>
          )}
          {isOwnProfile && editingListingId && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Edit listing</h3>
              <div className="mt-3 grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={listingTitle}
                    onChange={(e) => setListingTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={listingDescription}
                    onChange={(e) => setListingDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <Input
                    value={listingLocation}
                    onChange={(e) => setListingLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={listingStatus}
                    onChange={(e) => setListingStatus(e.target.value as Listing["status"])}
                  >
                    <option value="Available">Available</option>
                    <option value="Claimed">Claimed</option>
                    <option value="Gone">Gone</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={saveListing} disabled={isListingSaving || !listingTitle.trim()}>
                    {isListingSaving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={cancelEditListing}>
                    Cancel
                  </Button>
                  {listingError && (
                    <p className="text-sm text-destructive" role="alert">
                      {listingError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="claimed" className="mt-6">
            {claimedItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {claimedItems.map((listing, i) => (
                  <div key={`claimed-${listing.id}`} className={`animate-float-up stagger-${Math.min(i + 1, 8)}`}>
                    <ListingCard
                      listing={listing}
                      currentUserId={currentUserId}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  No claimed items
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You haven't claimed any items yet.
                </p>
                <Button asChild variant="outline" className="mt-4 bg-transparent">
                  <Link href="/">Browse Listings</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
