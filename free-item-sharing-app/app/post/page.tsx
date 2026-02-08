"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, X, Eye, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { categories, conditions, tags } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { getTagColor } from "@/lib/tag-colors"
import Link from "next/link"
import { authHeaders } from "@/lib/demo-client"
import { useRouter } from "next/navigation"

export default function CreateListingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [condition, setCondition] = useState("")
  const [location, setLocation] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  function addDemoImage() {
    const demoImages = [
      "/listings/couch.jpg",
      "/listings/textbooks.jpg",
      "/listings/lamp.jpg",
      "/listings/keyboard.jpg",
      "/listings/blender.jpg",
    ]
    if (previewImages.length < 5) {
      const nextImage = demoImages[previewImages.length % demoImages.length]
      setPreviewImages((prev) => [...prev, nextImage])
    }
  }

  function removeImage(index: number) {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            ...authHeaders(),
          },
        })
        if (isMounted) {
          setIsGuest(!response.ok)
        }
      } catch (err) {
        if (isMounted) {
          setIsGuest(true)
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    checkAuth()
    return () => {
      isMounted = false
    }
  }, [])

  if (isCheckingAuth) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Sign in to post</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Guests can browse listings but need an account to post items.
        </p>
        <Button
          className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => router.push("/auth/login")}
        >
          Sign in
        </Button>
      </div>
    )
  }

  async function uploadImages(files: FileList) {
    const remainingSlots = 5 - previewImages.length
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

      setPreviewImages((prev) => [...prev, ...uploadedUrls])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload image")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function publishListing() {
    if (!title.trim() || !description.trim() || !category || !condition || !location.trim()) {
      setError("Please fill out all required fields before publishing.")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const selectedTagObjects = selectedTags
        .map((id) => tags.find((tag) => tag.id === id))
        .filter((tag): tag is (typeof tags)[number] => Boolean(tag))

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title,
          description,
          category,
          condition,
          location,
          images: previewImages,
          tags: selectedTagObjects,
        }),
      })

      const payload = (await response.json()) as { listing?: { id: string }; error?: string }

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      if (!response.ok || !payload.listing) {
        throw new Error(payload.error ?? "Unable to publish listing")
      }

      router.push(`/listing/${payload.listing.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish listing")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function generateDescription() {
    if (!title.trim()) {
      setAiError("Add a title first so AI can generate a description.")
      return
    }

    setAiError(null)
    setError(null)
    setIsGeneratingDescription(true)

    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: title.trim(),
          category: category || undefined,
          condition: condition || undefined,
        }),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      const payload = (await response.json()) as {
        description?: string
        error?: string
      }

      if (!response.ok || !payload.description) {
        throw new Error(payload.error ?? "Unable to generate description")
      }

      setDescription(payload.description.slice(0, 500))
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Unable to generate description"
      )
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  if (showPreview) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editing
        </button>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {previewImages.length > 0 && (
            <div className="relative aspect-[4/3] bg-muted">
              <Image
                src={previewImages[0] || "/placeholder.svg"}
                alt={title || "Listing preview"}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                Available
              </Badge>
              {condition && (
                <Badge variant="outline" className="text-xs">
                  {condition}
                </Badge>
              )}
            </div>

            <h2 className="text-2xl font-bold text-card-foreground text-balance">
              {title || "Untitled Listing"}
            </h2>

            {location && (
              <p className="mt-2 text-sm text-muted-foreground">
                {location}
              </p>
            )}

            <Separator className="my-4" />

            <p className="text-sm text-card-foreground leading-relaxed">
              {description || "No description provided."}
            </p>

            {(category || selectedTags.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {category && (
                  <Badge variant="secondary">{category}</Badge>
                )}
              {selectedTags.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId)
                return tag ? (
                  <Badge key={tag.id} className={cn("text-xs font-medium border", getTagColor(tag.id))}>
                    {tag.label}
                  </Badge>
                ) : null
              })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => setShowPreview(false)}
          >
            Edit
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={publishListing}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish Listing"}
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Post an Item</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          List something for free for your campus community.
        </p>
      </div>

      <div className="flex flex-col gap-6 animate-float-up stagger-2">
        {/* Image upload */}
        <div>
          <Label className="text-sm font-medium text-foreground">
            Photos ({previewImages.length}/5)
          </Label>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {previewImages.map((img, i) => (
              <div
                key={`img-${i}`}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={img || "/placeholder.svg"}
                  alt={`Upload ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm text-card-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label={`Remove image ${i + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {previewImages.length < 5 && (
              <button
                type="button"
                onClick={addDemoImage}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                void uploadImages(e.target.files)
              }
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || previewImages.length >= 5}
            >
              {isUploading ? "Uploading..." : "Upload photos"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Add up to {Math.max(0, 5 - previewImages.length)} more
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            You can still add demo images or upload from your device.
          </p>
          {uploadError && (
            <p className="mt-1.5 text-xs text-destructive" role="alert">
              {uploadError}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </Label>
          <Input
            id="title"
            placeholder="What are you giving away?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5"
            maxLength={80}
          />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {title.length}/80
          </p>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={generateDescription}
              disabled={isGeneratingDescription}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {isGeneratingDescription ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            id="description"
            placeholder="Describe the item, any issues, and why you're giving it away..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 min-h-[120px]"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {description.length}/500
          </p>
          {aiError && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {aiError}
            </p>
          )}
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => c !== "All")
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((cond) => (
                  <SelectItem key={cond} value={cond}>
                    {cond}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="text-sm font-medium text-foreground">
            Pickup Location
          </Label>
          <Input
            id="location"
            placeholder="e.g., Outside North Ave lobby"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Tags */}
        <div>
          <Label className="text-sm font-medium text-foreground">Tags</Label>
          <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
            Select all that apply
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedTags.includes(tag.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => setShowPreview(true)}
            disabled={!title.trim()}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={publishListing}
            disabled={!title.trim() || !category || !condition || isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
