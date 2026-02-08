import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import type { Conversation, Listing, Message, User } from "./types"
import {
  conversations as seedConversations,
  listings as seedListings,
  users as seedUsers,
  university,
  ugaUniversity,
} from "./mock-data"

type UserRecord = User & { password: string }

type ListingRecord = {
  id: string
  title: string
  description: string
  images: string[]
  category: Listing["category"]
  condition: Listing["condition"]
  tags: Listing["tags"]
  status: Listing["status"]
  location: string
  sellerId: string
  claimedById: string | null
  createdAt: string
  expiresAt: string
}

type SessionRecord = {
  token: string
  userId: string
  createdAt: string
}

type MessageRecord = {
  id: string
  conversationId: string
  senderId: string
  body: string
  attachments: string[]
  read: boolean
  createdAt: string
}

type ConversationRecord = {
  id: string
  listingId: string
  participantIds: string[]
  messages: MessageRecord[]
}

type DemoDb = {
  users: UserRecord[]
  listings: ListingRecord[]
  sessions: SessionRecord[]
  conversations: ConversationRecord[]
}

const dbPath = path.join(process.cwd(), "data", "demo-db.json")

const toUserRecord = (user: User, password = "password"): UserRecord => ({
  ...user,
  password,
})

const toListingRecord = (listing: Listing): ListingRecord => ({
  id: listing.id,
  title: listing.title,
  description: listing.description,
  images: listing.images,
  category: listing.category,
  condition: listing.condition,
  tags: listing.tags,
  status: listing.status,
  location: listing.location,
  sellerId: listing.seller.id,
  claimedById: listing.claimedBy?.id ?? null,
  createdAt: listing.createdAt,
  expiresAt: listing.expiresAt,
})

const toPublicUser = (user: UserRecord): User => {
  const { password: _password, ...rest } = user
  return rest
}

const inflateListing = (record: ListingRecord, users: UserRecord[]): Listing => {
  const seller = users.find((user) => user.id === record.sellerId)
  if (!seller) {
    throw new Error(`Seller ${record.sellerId} not found`)
  }

  const claimedBy = record.claimedById
    ? users.find((user) => user.id === record.claimedById) ?? null
    : null

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    images: record.images,
    category: record.category,
    condition: record.condition,
    tags: record.tags,
    status: record.status,
    location: record.location,
    seller: toPublicUser(seller),
    claimedBy: claimedBy ? toPublicUser(claimedBy) : null,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  }
}

const inflateMessage = (record: MessageRecord, users: UserRecord[]): Message => {
  const sender = users.find((user) => user.id === record.senderId)
  if (!sender) {
    throw new Error(`Sender ${record.senderId} not found`)
  }
  return {
    id: record.id,
    conversationId: record.conversationId,
    sender: toPublicUser(sender),
    body: record.body,
    attachments: record.attachments ?? [],
    read: record.read,
    createdAt: record.createdAt,
  }
}

const inflateConversation = (
  record: ConversationRecord,
  users: UserRecord[],
  listings: ListingRecord[]
): Conversation => {
  const listingRecord = listings.find((listing) => listing.id === record.listingId)

  const participants = record.participantIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is UserRecord => Boolean(user))
    .map(toPublicUser)

  const fallbackSellerRecord =
    users.find((user) => user.id === record.participantIds[0]) ?? users[0] ?? null
  const fallbackSeller = fallbackSellerRecord
    ? toPublicUser(fallbackSellerRecord)
    : {
        id: "deleted-user",
        email: "deleted@university.edu",
        name: "Deleted User",
        avatarUrl: "",
        university,
        tags: [],
        bio: "",
        createdAt: new Date().toISOString(),
      }

  const listing = listingRecord
    ? inflateListing(listingRecord, users)
    : {
        id: record.listingId,
        title: "Deleted listing",
        description: "This listing was deleted.",
        images: [],
        category: "Other" as const,
        condition: "Good" as const,
        tags: [],
        status: "Gone" as const,
        location: "Deleted",
        seller: fallbackSeller,
        claimedBy: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      }

  const messages = record.messages.map((message) => inflateMessage(message, users))

  return {
    id: record.id,
    listing,
    participants,
    messages,
    lastMessage: messages[messages.length - 1] ?? null,
  }
}

const seedDb = async (): Promise<DemoDb> => {
  const seedUsersWithPasswords = seedUsers.map((user) => toUserRecord(user))
  const seedListingRecords = seedListings.map((listing) => toListingRecord(listing))
  const seedConversationRecords = seedConversations.map((conversation) => ({
    id: conversation.id,
    listingId: conversation.listing.id,
    participantIds: conversation.participants.map((participant) => participant.id),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.sender.id,
      body: message.body,
      attachments: [],
      read: message.read,
      createdAt: message.createdAt,
    })),
  }))

  const data: DemoDb = {
    users: seedUsersWithPasswords,
    listings: seedListingRecords,
    sessions: [],
    conversations: seedConversationRecords,
  }

  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8")
  return data
}

const readDb = async (): Promise<DemoDb> => {
  try {
    const raw = await fs.readFile(dbPath, "utf-8")
    return JSON.parse(raw) as DemoDb
  } catch (error) {
    return seedDb()
  }
}

const writeDb = async (data: DemoDb) => {
  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8")
}

export const listUsers = async () => {
  const db = await readDb()
  return db.users.map(toPublicUser)
}

export const findUserByEmail = async (email: string) => {
  const db = await readDb()
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
}

export const findUserById = async (id: string) => {
  const db = await readDb()
  return db.users.find((user) => user.id === id) ?? null
}

export const updateUserProfile = async ({
  userId,
  data,
}: {
  userId: string
  data: Partial<Pick<UserRecord, "name" | "avatarUrl" | "bio" | "tags">>
}) => {
  const db = await readDb()
  const index = db.users.findIndex((user) => user.id === userId)
  if (index === -1) {
    return null
  }

  db.users[index] = {
    ...db.users[index],
    ...data,
  }

  await writeDb(db)
  return toPublicUser(db.users[index])
}

export const createUser = async ({
  email,
  name,
  password,
  avatarUrl,
  bio,
}: {
  email: string
  name: string
  password: string
  avatarUrl?: string
  bio?: string
}) => {
  const db = await readDb()
  const exists = db.users.some((user) => user.email.toLowerCase() === email.toLowerCase())
  if (exists) {
    throw new Error("Email already in use")
  }

  const now = new Date().toISOString()
  const normalizedEmail = email.toLowerCase()
  const assignedUniversity = normalizedEmail.endsWith("@uga.edu")
    ? ugaUniversity
    : university

  const newUser: UserRecord = {
    id: randomUUID(),
    email,
    name,
    avatarUrl: avatarUrl ?? "",
    university: assignedUniversity,
    tags: [],
    bio: bio ?? "",
    createdAt: now,
    password,
  }

  db.users.push(newUser)
  await writeDb(db)
  return toPublicUser(newUser)
}

export const validatePassword = (user: UserRecord, password: string) =>
  user.password === password

export const createSession = async (userId: string) => {
  const db = await readDb()
  const token = randomUUID()
  db.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
  })
  await writeDb(db)
  return token
}

export const findUserBySession = async (token: string) => {
  const db = await readDb()
  const session = db.sessions.find((entry) => entry.token === token)
  if (!session) {
    return null
  }
  return db.users.find((user) => user.id === session.userId) ?? null
}

export const listListings = async () => {
  const db = await readDb()
  return db.listings.map((listing) => inflateListing(listing, db.users))
}

export const findListingById = async (id: string) => {
  const db = await readDb()
  const record = db.listings.find((listing) => listing.id === id)
  if (!record) {
    return null
  }
  return inflateListing(record, db.users)
}

export const createListing = async ({
  sellerId,
  title,
  description,
  images,
  category,
  condition,
  tags,
  location,
  expiresAt,
}: {
  sellerId: string
  title: string
  description: string
  images?: string[]
  category: Listing["category"]
  condition: Listing["condition"]
  tags?: Listing["tags"]
  location: string
  expiresAt?: string
}) => {
  const db = await readDb()
  const seller = db.users.find((user) => user.id === sellerId)
  if (!seller) {
    throw new Error("Seller not found")
  }

  const now = new Date()
  const listing: ListingRecord = {
    id: randomUUID(),
    title,
    description,
    images: images ?? [],
    category,
    condition,
    tags: tags ?? [],
    status: "Available",
    location,
    sellerId,
    claimedById: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  db.listings.unshift(listing)
  await writeDb(db)
  return inflateListing(listing, db.users)
}

export const updateListing = async ({
  id,
  sellerId,
  data,
}: {
  id: string
  sellerId: string
  data: Partial<
    Pick<
      ListingRecord,
      | "title"
      | "description"
      | "images"
      | "category"
      | "condition"
      | "tags"
      | "status"
      | "location"
      | "expiresAt"
      | "claimedById"
    >
  >
}) => {
  const db = await readDb()
  const index = db.listings.findIndex((listing) => listing.id === id)
  if (index === -1) {
    return null
  }
  if (db.listings[index].sellerId !== sellerId) {
    throw new Error("Not allowed to edit this listing")
  }

  db.listings[index] = {
    ...db.listings[index],
    ...data,
  }

  await writeDb(db)
  return inflateListing(db.listings[index], db.users)
}

export const deleteListing = async ({ id, sellerId }: { id: string; sellerId: string }) => {
  const db = await readDb()
  const index = db.listings.findIndex((listing) => listing.id === id)
  if (index === -1) {
    return false
  }
  if (db.listings[index].sellerId !== sellerId) {
    throw new Error("Not allowed to delete this listing")
  }
  db.listings.splice(index, 1)
  await writeDb(db)
  return true
}

export const listConversationsForUser = async (userId: string) => {
  const db = await readDb()
  return db.conversations
    .filter((conversation) => conversation.participantIds.includes(userId))
    .map((conversation) => inflateConversation(conversation, db.users, db.listings))
}

export const findConversationById = async (id: string) => {
  const db = await readDb()
  const record = db.conversations.find((conversation) => conversation.id === id)
  if (!record) {
    return null
  }
  return inflateConversation(record, db.users, db.listings)
}

export const appendMessage = async ({
  conversationId,
  senderId,
  body,
  attachments,
}: {
  conversationId: string
  senderId: string
  body: string
  attachments?: string[]
}) => {
  const db = await readDb()
  const conversation = db.conversations.find((c) => c.id === conversationId)
  if (!conversation) {
    return null
  }

  if (!conversation.participantIds.includes(senderId)) {
    throw new Error("Not allowed to message this conversation")
  }

  const listing = db.listings.find((entry) => entry.id === conversation.listingId)
  if (!listing) {
    throw new Error("This listing was deleted. Messaging is closed.")
  }
  if (listing.status === "Claimed" || listing.status === "Gone") {
    throw new Error("This listing is sold. Messaging is closed.")
  }

  const message: MessageRecord = {
    id: randomUUID(),
    conversationId,
    senderId,
    body,
    attachments: attachments ?? [],
    read: false,
    createdAt: new Date().toISOString(),
  }

  conversation.messages.push(message)
  await writeDb(db)

  return {
    message: inflateMessage(message, db.users),
    conversation: inflateConversation(conversation, db.users, db.listings),
  }
}

export const markConversationRead = async ({
  conversationId,
  userId,
}: {
  conversationId: string
  userId: string
}) => {
  const db = await readDb()
  const conversation = db.conversations.find((c) => c.id === conversationId)
  if (!conversation) {
    return null
  }

  if (!conversation.participantIds.includes(userId)) {
    throw new Error("Not allowed to access this conversation")
  }

  let changed = false
  conversation.messages = conversation.messages.map((message) => {
    if (message.senderId !== userId && !message.read) {
      changed = true
      return {
        ...message,
        read: true,
      }
    }
    return message
  })

  if (changed) {
    await writeDb(db)
  }

  return inflateConversation(conversation, db.users, db.listings)
}

export const createConversationForListing = async ({
  listingId,
  requesterId,
  messageOnly: _messageOnly = false,
}: {
  listingId: string
  requesterId: string
  messageOnly?: boolean
}) => {
  const db = await readDb()
  const listing = db.listings.find((entry) => entry.id === listingId)
  if (!listing) {
    throw new Error("Listing not found")
  }

  if (listing.sellerId === requesterId) {
    throw new Error("You cannot message yourself about your own listing")
  }

  const existing = db.conversations.find(
    (conversation) =>
      conversation.listingId === listingId &&
      conversation.participantIds.includes(requesterId)
  )

  if (existing) {
    return inflateConversation(existing, db.users, db.listings)
  }

  const newConversation: ConversationRecord = {
    id: randomUUID(),
    listingId,
    participantIds: [listing.sellerId, requesterId],
    messages: [],
  }

  db.conversations.unshift(newConversation)

  await writeDb(db)
  return inflateConversation(newConversation, db.users, db.listings)
}
