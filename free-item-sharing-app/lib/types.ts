export type Category = "Furniture" | "Textbooks" | "Electronics" | "Clothing" | "Kitchen" | "Other"

export type Condition = "New" | "Like New" | "Good" | "Fair"

export type ListingStatus = "Available" | "Claimed" | "Gone"

export type TagType = "Dorm" | "Preference" | "Custom"

export interface Tag {
  id: string
  label: string
  type: TagType
}

export interface University {
  id: string
  name: string
  emailDomain: string
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
  university: University
  tags: Tag[]
  bio: string
  createdAt: string
}

export interface Listing {
  id: string
  title: string
  description: string
  images: string[]
  category: Category
  condition: Condition
  tags: Tag[]
  status: ListingStatus
  location: string
  seller: User
  claimedBy: User | null
  createdAt: string
  expiresAt: string
}

export interface Message {
  id: string
  conversationId: string
  sender: User
  body: string
  attachments: string[]
  read: boolean
  createdAt: string
}

export interface Conversation {
  id: string
  listing: Listing
  participants: User[]
  messages: Message[]
  lastMessage: Message | null
}
