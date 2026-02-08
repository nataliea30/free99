import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import type { Conversation, Listing, Message, Tag, University, User } from "./types"
import { ugaUniversity, university } from "./mock-data"

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

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.POSTGRES_SSL === "require"
      ? { rejectUnauthorized: false }
      : undefined,
})

const toIsoString = (value: string | Date) =>
  (value instanceof Date ? value : new Date(value)).toISOString()

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []

const ensureUniversity = (value: unknown): University => {
  if (!value || typeof value !== "object") {
    return university
  }

  const candidate = value as Partial<University>
  return {
    id: candidate.id ?? university.id,
    name: candidate.name ?? university.name,
    emailDomain: candidate.emailDomain ?? university.emailDomain,
  }
}

const ensureTags = (value: unknown): Tag[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry) => Boolean(entry) && typeof entry === "object")
    .map((entry) => {
      const tag = entry as Partial<Tag>
      return {
        id: tag.id ?? randomUUID(),
        label: tag.label ?? "",
        type: tag.type === "Dorm" || tag.type === "Custom" ? tag.type : "Preference",
      }
    })
}

const mapUserRow = (
  row: {
    id: string
    email: string
    name: string
    avatar_url: string
    university: unknown
    tags: unknown
    bio: string
    created_at: string | Date
    password: string
  }
): UserRecord => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url ?? "",
  university: ensureUniversity(row.university),
  tags: ensureTags(row.tags),
  bio: row.bio ?? "",
  createdAt: toIsoString(row.created_at),
  password: row.password,
})

const toPublicUser = (user: UserRecord): User => {
  const { password: _password, ...rest } = user
  return rest
}

const mapListingRow = (
  row: {
    id: string
    title: string
    description: string
    images: unknown
    category: Listing["category"]
    condition: Listing["condition"]
    tags: unknown
    status: Listing["status"]
    location: string
    seller_id: string
    claimed_by_id: string | null
    created_at: string | Date
    expires_at: string | Date
  }
): ListingRecord => ({
  id: row.id,
  title: row.title,
  description: row.description,
  images: ensureStringArray(row.images),
  category: row.category,
  condition: row.condition,
  tags: ensureTags(row.tags),
  status: row.status,
  location: row.location,
  sellerId: row.seller_id,
  claimedById: row.claimed_by_id,
  createdAt: toIsoString(row.created_at),
  expiresAt: toIsoString(row.expires_at),
})

const mapMessageRow = (
  row: {
    id: string
    conversation_id: string
    sender_id: string
    body: string
    attachments: unknown
    read: boolean
    created_at: string | Date
  }
): MessageRecord => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  body: row.body,
  attachments: ensureStringArray(row.attachments),
  read: Boolean(row.read),
  createdAt: toIsoString(row.created_at),
})

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
    attachments: record.attachments,
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

const loadUsersById = async (ids: string[]) => {
  if (ids.length === 0) {
    return [] as UserRecord[]
  }

  const result = await pool.query(
    `
      SELECT id, email, name, avatar_url, university, tags, bio, created_at, password
      FROM users
      WHERE id = ANY($1::text[])
    `,
    [ids]
  )
  return result.rows.map(mapUserRow)
}

const loadListingsById = async (ids: string[]) => {
  if (ids.length === 0) {
    return [] as ListingRecord[]
  }

  const result = await pool.query(
    `
      SELECT
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
      FROM listings
      WHERE id = ANY($1::text[])
    `,
    [ids]
  )

  return result.rows.map(mapListingRow)
}

const loadMessagesForConversationIds = async (conversationIds: string[]) => {
  if (conversationIds.length === 0) {
    return new Map<string, MessageRecord[]>()
  }

  const result = await pool.query(
    `
      SELECT id, conversation_id, sender_id, body, attachments, read, created_at
      FROM messages
      WHERE conversation_id = ANY($1::text[])
      ORDER BY created_at ASC, id ASC
    `,
    [conversationIds]
  )

  const grouped = new Map<string, MessageRecord[]>()
  for (const row of result.rows) {
    const message = mapMessageRow(row)
    const messages = grouped.get(message.conversationId) ?? []
    messages.push(message)
    grouped.set(message.conversationId, messages)
  }

  return grouped
}

export const listUsers = async () => {
  const result = await pool.query(
    `
      SELECT id, email, name, avatar_url, university, tags, bio, created_at, password
      FROM users
      ORDER BY created_at DESC
    `
  )
  return result.rows.map(mapUserRow).map(toPublicUser)
}

export const findUserByEmail = async (email: string) => {
  const result = await pool.query(
    `
      SELECT id, email, name, avatar_url, university, tags, bio, created_at, password
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email]
  )

  if (result.rowCount === 0) {
    return null
  }

  return mapUserRow(result.rows[0])
}

export const findUserById = async (id: string) => {
  const result = await pool.query(
    `
      SELECT id, email, name, avatar_url, university, tags, bio, created_at, password
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  if (result.rowCount === 0) {
    return null
  }

  return mapUserRow(result.rows[0])
}

export const updateUserProfile = async ({
  userId,
  data,
}: {
  userId: string
  data: Partial<Pick<UserRecord, "name" | "avatarUrl" | "bio" | "tags">>
}) => {
  const current = await findUserById(userId)
  if (!current) {
    return null
  }

  const name = data.name ?? current.name
  const avatarUrl = data.avatarUrl ?? current.avatarUrl
  const bio = data.bio ?? current.bio
  const tags = data.tags ?? current.tags

  const result = await pool.query(
    `
      UPDATE users
      SET name = $2, avatar_url = $3, bio = $4, tags = $5::jsonb
      WHERE id = $1
      RETURNING id, email, name, avatar_url, university, tags, bio, created_at, password
    `,
    [userId, name, avatarUrl, bio, JSON.stringify(tags)]
  )

  if (result.rowCount === 0) {
    return null
  }

  return toPublicUser(mapUserRow(result.rows[0]))
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
  const normalizedEmail = email.toLowerCase()
  const assignedUniversity = normalizedEmail.endsWith("@uga.edu") ? ugaUniversity : university

  try {
    const result = await pool.query(
      `
        INSERT INTO users (id, email, name, avatar_url, university, tags, bio, created_at, password)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
        RETURNING id, email, name, avatar_url, university, tags, bio, created_at, password
      `,
      [
        randomUUID(),
        email,
        name,
        avatarUrl ?? "",
        JSON.stringify(assignedUniversity),
        JSON.stringify([]),
        bio ?? "",
        new Date().toISOString(),
        password,
      ]
    )

    return toPublicUser(mapUserRow(result.rows[0]))
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new Error("Email already in use")
    }
    throw error
  }
}

export const validatePassword = (user: UserRecord, password: string) => user.password === password

export const createSession = async (userId: string) => {
  const token = randomUUID()
  await pool.query(
    `
      INSERT INTO sessions (token, user_id, created_at)
      VALUES ($1, $2, $3)
    `,
    [token, userId, new Date().toISOString()]
  )
  return token
}

export const findUserBySession = async (token: string) => {
  const result = await pool.query(
    `
      SELECT u.id, u.email, u.name, u.avatar_url, u.university, u.tags, u.bio, u.created_at, u.password
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = $1
      LIMIT 1
    `,
    [token]
  )

  if (result.rowCount === 0) {
    return null
  }

  return mapUserRow(result.rows[0])
}

export const listListings = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
      FROM listings
      ORDER BY created_at DESC
    `
  )

  const listingRecords = result.rows.map(mapListingRow)
  const userIds = Array.from(
    new Set(listingRecords.flatMap((listing) => [listing.sellerId, listing.claimedById].filter(Boolean)))
  ) as string[]
  const users = await loadUsersById(userIds)
  return listingRecords.map((record) => inflateListing(record, users))
}

export const findListingById = async (id: string) => {
  const result = await pool.query(
    `
      SELECT
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
      FROM listings
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  if (result.rowCount === 0) {
    return null
  }

  const listingRecord = mapListingRow(result.rows[0])
  const userIds = [listingRecord.sellerId, listingRecord.claimedById].filter(Boolean) as string[]
  const users = await loadUsersById(userIds)
  return inflateListing(listingRecord, users)
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
  const seller = await findUserById(sellerId)
  if (!seller) {
    throw new Error("Seller not found")
  }

  const now = new Date()
  const createdAt = now.toISOString()
  const effectiveExpiresAt = expiresAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const result = await pool.query(
    `
      INSERT INTO listings (
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
    `,
    [
      randomUUID(),
      title,
      description,
      JSON.stringify(images ?? []),
      category,
      condition,
      JSON.stringify(tags ?? []),
      "Available",
      location,
      sellerId,
      null,
      createdAt,
      effectiveExpiresAt,
    ]
  )

  return inflateListing(mapListingRow(result.rows[0]), [seller])
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
  const existing = await pool.query(
    `
      SELECT
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
      FROM listings
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  if (existing.rowCount === 0) {
    return null
  }

  const current = mapListingRow(existing.rows[0])
  if (current.sellerId !== sellerId) {
    throw new Error("Not allowed to edit this listing")
  }

  const result = await pool.query(
    `
      UPDATE listings
      SET
        title = $2,
        description = $3,
        images = $4::jsonb,
        category = $5,
        condition = $6,
        tags = $7::jsonb,
        status = $8,
        location = $9,
        claimed_by_id = $10,
        expires_at = $11
      WHERE id = $1
      RETURNING
        id,
        title,
        description,
        images,
        category,
        condition,
        tags,
        status,
        location,
        seller_id,
        claimed_by_id,
        created_at,
        expires_at
    `,
    [
      id,
      data.title ?? current.title,
      data.description ?? current.description,
      JSON.stringify(data.images ?? current.images),
      data.category ?? current.category,
      data.condition ?? current.condition,
      JSON.stringify(data.tags ?? current.tags),
      data.status ?? current.status,
      data.location ?? current.location,
      data.claimedById === undefined ? current.claimedById : data.claimedById,
      data.expiresAt ?? current.expiresAt,
    ]
  )

  const saved = mapListingRow(result.rows[0])
  const userIds = [saved.sellerId, saved.claimedById].filter(Boolean) as string[]
  const users = await loadUsersById(userIds)
  return inflateListing(saved, users)
}

export const deleteListing = async ({ id, sellerId }: { id: string; sellerId: string }) => {
  const existing = await pool.query(
    `
      SELECT seller_id
      FROM listings
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  if (existing.rowCount === 0) {
    return false
  }

  if (existing.rows[0].seller_id !== sellerId) {
    throw new Error("Not allowed to delete this listing")
  }

  await pool.query("DELETE FROM listings WHERE id = $1", [id])
  return true
}

export const listConversationsForUser = async (userId: string) => {
  const conversationResult = await pool.query(
    `
      SELECT id, listing_id, participant_ids
      FROM conversations
      WHERE participant_ids ? $1
      ORDER BY created_at DESC, id DESC
    `,
    [userId]
  )

  const conversationRows = conversationResult.rows.map((row) => ({
    id: row.id as string,
    listingId: row.listing_id as string,
    participantIds: ensureStringArray(row.participant_ids),
  }))

  if (conversationRows.length === 0) {
    return []
  }

  const conversationIds = conversationRows.map((conversation) => conversation.id)
  const messagesByConversation = await loadMessagesForConversationIds(conversationIds)

  const listingIds = Array.from(new Set(conversationRows.map((conversation) => conversation.listingId)))
  const listings = await loadListingsById(listingIds)

  const userIds = Array.from(
    new Set([
      ...conversationRows.flatMap((conversation) => conversation.participantIds),
      ...listings.flatMap((listing) => [listing.sellerId, listing.claimedById].filter(Boolean)),
      ...Array.from(messagesByConversation.values()).flatMap((messages) => messages.map((message) => message.senderId)),
    ])
  ) as string[]
  const users = await loadUsersById(userIds)

  const records: ConversationRecord[] = conversationRows.map((conversation) => ({
    id: conversation.id,
    listingId: conversation.listingId,
    participantIds: conversation.participantIds,
    messages: messagesByConversation.get(conversation.id) ?? [],
  }))

  return records.map((record) => inflateConversation(record, users, listings))
}

export const findConversationById = async (id: string) => {
  const conversationResult = await pool.query(
    `
      SELECT id, listing_id, participant_ids
      FROM conversations
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  )

  if (conversationResult.rowCount === 0) {
    return null
  }

  const row = conversationResult.rows[0]
  const baseRecord = {
    id: row.id as string,
    listingId: row.listing_id as string,
    participantIds: ensureStringArray(row.participant_ids),
  }

  const messagesByConversation = await loadMessagesForConversationIds([baseRecord.id])
  const listings = await loadListingsById([baseRecord.listingId])

  const userIds = Array.from(
    new Set([
      ...baseRecord.participantIds,
      ...listings.flatMap((listing) => [listing.sellerId, listing.claimedById].filter(Boolean)),
      ...(messagesByConversation.get(baseRecord.id) ?? []).map((message) => message.senderId),
    ])
  ) as string[]
  const users = await loadUsersById(userIds)

  const conversation: ConversationRecord = {
    ...baseRecord,
    messages: messagesByConversation.get(baseRecord.id) ?? [],
  }

  return inflateConversation(conversation, users, listings)
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
  const conversationResult = await pool.query(
    `
      SELECT id, listing_id, participant_ids
      FROM conversations
      WHERE id = $1
      LIMIT 1
    `,
    [conversationId]
  )

  if (conversationResult.rowCount === 0) {
    return null
  }

  const row = conversationResult.rows[0]
  const participantIds = ensureStringArray(row.participant_ids)
  if (!participantIds.includes(senderId)) {
    throw new Error("Not allowed to message this conversation")
  }

  const listingResult = await pool.query(
    `
      SELECT status
      FROM listings
      WHERE id = $1
      LIMIT 1
    `,
    [row.listing_id]
  )

  if (listingResult.rowCount === 0) {
    throw new Error("This listing was deleted. Messaging is closed.")
  }

  const status = listingResult.rows[0].status as Listing["status"]
  if (status === "Claimed" || status === "Gone") {
    throw new Error("This listing is sold. Messaging is closed.")
  }

  const messageId = randomUUID()
  const createdAt = new Date().toISOString()
  await pool.query(
    `
      INSERT INTO messages (
        id,
        conversation_id,
        sender_id,
        body,
        attachments,
        read,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
    `,
    [messageId, conversationId, senderId, body, JSON.stringify(attachments ?? []), false, createdAt]
  )

  const conversation = await findConversationById(conversationId)
  if (!conversation) {
    return null
  }

  const message = conversation.messages.find((entry) => entry.id === messageId)
  if (!message) {
    throw new Error("Unable to load saved message")
  }

  return { message, conversation }
}

export const markConversationRead = async ({
  conversationId,
  userId,
}: {
  conversationId: string
  userId: string
}) => {
  const conversationResult = await pool.query(
    `
      SELECT participant_ids
      FROM conversations
      WHERE id = $1
      LIMIT 1
    `,
    [conversationId]
  )

  if (conversationResult.rowCount === 0) {
    return null
  }

  const participantIds = ensureStringArray(conversationResult.rows[0].participant_ids)
  if (!participantIds.includes(userId)) {
    throw new Error("Not allowed to access this conversation")
  }

  await pool.query(
    `
      UPDATE messages
      SET read = true
      WHERE conversation_id = $1 AND sender_id <> $2 AND read = false
    `,
    [conversationId, userId]
  )

  return findConversationById(conversationId)
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
  const listingResult = await pool.query(
    `
      SELECT seller_id
      FROM listings
      WHERE id = $1
      LIMIT 1
    `,
    [listingId]
  )

  if (listingResult.rowCount === 0) {
    throw new Error("Listing not found")
  }

  const sellerId = listingResult.rows[0].seller_id as string
  if (sellerId === requesterId) {
    throw new Error("You cannot message yourself about your own listing")
  }

  const existingResult = await pool.query(
    `
      SELECT id
      FROM conversations
      WHERE listing_id = $1 AND participant_ids ? $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [listingId, requesterId]
  )

  if (existingResult.rowCount > 0) {
    const existing = await findConversationById(existingResult.rows[0].id as string)
    if (!existing) {
      throw new Error("Unable to load conversation")
    }
    return existing
  }

  const conversationId = randomUUID()
  await pool.query(
    `
      INSERT INTO conversations (id, listing_id, participant_ids, created_at)
      VALUES ($1, $2, $3::jsonb, $4)
    `,
    [conversationId, listingId, JSON.stringify([sellerId, requesterId]), new Date().toISOString()]
  )

  const conversation = await findConversationById(conversationId)
  if (!conversation) {
    throw new Error("Unable to create conversation")
  }

  return conversation
}

