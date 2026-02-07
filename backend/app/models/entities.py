from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    id: str
    full_name: str
    email: str
    residence_hall: str
    pickup_preference: str
    is_verified: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Claim:
    user_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Listing:
    id: str
    title: str
    description: str
    image_url: str
    poster_id: str
    tags: list[str]
    residence_hall: str
    condition: str
    delivery_available: bool
    pickup_only: bool
    created_at: datetime = field(default_factory=datetime.utcnow)
    claimed_by_user_id: str | None = None
    claims: list[Claim] = field(default_factory=list)


@dataclass
class Message:
    id: str
    thread_id: str
    sender_id: str
    text: str
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Thread:
    id: str
    participant_ids: list[str]
    listing_id: str | None = None
    last_message_at: datetime = field(default_factory=datetime.utcnow)

