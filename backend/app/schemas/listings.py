from datetime import datetime

from pydantic import BaseModel


class ListingCreateRequest(BaseModel):
    title: str
    description: str
    image_url: str
    tags: list[str] = []
    residence_hall: str
    condition: str
    delivery_available: bool = False
    pickup_only: bool = True


class ListingFeedItem(BaseModel):
    id: str
    title: str
    description: str
    image_url: str
    posted_by: str
    poster_id: str
    tags: list[str]
    residence_hall: str
    condition: str
    delivery_available: bool
    pickup_only: bool
    created_at: datetime
    claim_count: int
    claimed: bool


class ClaimantInfo(BaseModel):
    user_id: str
    full_name: str
    residence_hall: str
    pickup_preference: str
    claimed_at: datetime


class MyListingDetails(ListingFeedItem):
    claimants: list[ClaimantInfo]

