from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user_id
from app.models.entities import Claim, Listing
from app.schemas.listings import ClaimantInfo, ListingCreateRequest, ListingFeedItem, MyListingDetails
from app.services.store import store

router = APIRouter()


def to_feed_item(listing: Listing) -> ListingFeedItem:
    poster = store.users.get(listing.poster_id)
    return ListingFeedItem(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        image_url=listing.image_url,
        posted_by=poster.full_name if poster else "Unknown",
        poster_id=listing.poster_id,
        tags=listing.tags,
        residence_hall=listing.residence_hall,
        condition=listing.condition,
        delivery_available=listing.delivery_available,
        pickup_only=listing.pickup_only,
        created_at=listing.created_at,
        claim_count=len(listing.claims),
        claimed=listing.claimed_by_user_id is not None,
    )


@router.get("", response_model=list[ListingFeedItem])
def get_feed() -> list[ListingFeedItem]:
    ordered = sorted(store.listings.values(), key=lambda l: l.created_at, reverse=True)
    return [to_feed_item(item) for item in ordered]


@router.post("", response_model=ListingFeedItem)
def create_listing(payload: ListingCreateRequest, user_id: str = Depends(get_current_user_id)) -> ListingFeedItem:
    if user_id not in store.users:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    listing = Listing(
        id=str(uuid4()),
        title=payload.title,
        description=payload.description,
        image_url=payload.image_url,
        poster_id=user_id,
        tags=payload.tags,
        residence_hall=payload.residence_hall,
        condition=payload.condition,
        delivery_available=payload.delivery_available,
        pickup_only=payload.pickup_only,
    )
    store.listings[listing.id] = listing
    return to_feed_item(listing)


@router.post("/{listing_id}/claim")
def claim_listing(listing_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    listing = store.listings.get(listing_id)
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.claimed_by_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing already claimed")

    listing.claimed_by_user_id = user_id
    listing.claims.insert(0, Claim(user_id=user_id))
    return {"status": "claimed"}


@router.get("/claimed/me", response_model=list[ListingFeedItem])
def my_claimed_items(user_id: str = Depends(get_current_user_id)) -> list[ListingFeedItem]:
    items = [l for l in store.listings.values() if l.claimed_by_user_id == user_id]
    items.sort(key=lambda l: l.created_at, reverse=True)
    return [to_feed_item(i) for i in items]


@router.get("/mine", response_model=list[MyListingDetails])
def my_postings(user_id: str = Depends(get_current_user_id)) -> list[MyListingDetails]:
    mine = [l for l in store.listings.values() if l.poster_id == user_id]
    mine.sort(key=lambda l: l.created_at, reverse=True)

    output: list[MyListingDetails] = []
    for listing in mine:
        claimants: list[ClaimantInfo] = []
        claims_sorted = sorted(listing.claims, key=lambda c: c.created_at, reverse=True)
        for claim in claims_sorted:
            u = store.users.get(claim.user_id)
            if not u:
                continue
            claimants.append(
                ClaimantInfo(
                    user_id=u.id,
                    full_name=u.full_name,
                    residence_hall=u.residence_hall,
                    pickup_preference=u.pickup_preference,
                    claimed_at=claim.created_at,
                )
            )

        feed_item = to_feed_item(listing)
        output.append(MyListingDetails(**feed_item.model_dump(), claimants=claimants))

    return output

