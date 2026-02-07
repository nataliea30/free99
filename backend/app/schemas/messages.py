from datetime import datetime

from pydantic import BaseModel


class ThreadSummary(BaseModel):
    id: str
    participant_ids: list[str]
    listing_id: str | None = None
    last_message_at: datetime


class MessageCreateRequest(BaseModel):
    thread_id: str
    text: str


class MessageItem(BaseModel):
    id: str
    thread_id: str
    sender_id: str
    text: str
    created_at: datetime

