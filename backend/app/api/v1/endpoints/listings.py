from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.db import ClaimDB, ClaimStatus, ListingDB, ListingEventDB, ListingStatus, ListingTagDB, UserDB
from app.schemas.listings import ClaimantInfo, ListingCreateRequest, ListingFeedItem, MyListingDetails

router = APIRouter()


def to_feed_item(listing: ListingDB, posted_by: str, tags: list[str], claim_count: int) -> ListingFeedItem:
    return ListingFeedItem(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        image_url=listing.image_url,
        posted_by=posted_by,
        poster_id=listing.poster_id,
        tags=tags,
        residence_hall=listing.residence_hall,
        condition=listing.condition,
        delivery_available=listing.delivery_available,
        pickup_only=listing.pickup_only,
        created_at=listing.created_at,
        claim_count=claim_count,
        claimed=listing.claimed_by_user_id is not None,
    )


@router.get("", response_model=list[ListingFeedItem])
def get_feed(db: Session = Depends(get_db)) -> list[ListingFeedItem]:
    listings = db.execute(select(ListingDB).order_by(ListingDB.created_at.desc())).scalars().all()
    output: list[ListingFeedItem] = []
    for listing in listings:
        poster = db.get(UserDB, listing.poster_id)
        tags = db.execute(select(ListingTagDB.tag).where(ListingTagDB.listing_id == listing.id)).scalars().all()
        claim_count = db.execute(select(ClaimDB).where(ClaimDB.listing_id == listing.id)).scalars().all()
        output.append(
            to_feed_item(
                listing=listing,
                posted_by=poster.full_name if poster else "Unknown",
                tags=tags,
                claim_count=len(claim_count),
            )
        )
    return output


@router.post("", response_model=ListingFeedItem)
def create_listing(
    payload: ListingCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> ListingFeedItem:
    user = db.get(UserDB, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    listing = ListingDB(
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
        status=ListingStatus.ACTIVE,
    )
    db.add(listing)
    db.flush()
    for tag in payload.tags:
        db.add(ListingTagDB(listing_id=listing.id, tag=tag))
    db.add(
        ListingEventDB(
            listing_id=listing.id,
            actor_id=user_id,
            event_type="listing_created",
            payload=None,
        )
    )
    db.commit()
    return to_feed_item(listing, posted_by=user.full_name, tags=payload.tags, claim_count=0)


@router.post("/{listing_id}/claim")
def claim_listing(
    listing_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    listing = db.execute(
        select(ListingDB)
        .where(ListingDB.id == listing_id)
        .with_for_update()
    ).scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.claimed_by_user_id or listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing already claimed")

    listing.claimed_by_user_id = user_id
    listing.status = ListingStatus.CLAIMED
    db.add(ClaimDB(listing_id=listing_id, claimant_id=user_id, status=ClaimStatus.ACCEPTED))
    db.add(ListingEventDB(listing_id=listing_id, actor_id=user_id, event_type="listing_claimed", payload=None))
    db.add(listing)
    db.commit()
    return {"status": "claimed"}


@router.get("/claimed/me", response_model=list[ListingFeedItem])
def my_claimed_items(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)) -> list[ListingFeedItem]:
    listings = db.execute(
        select(ListingDB).where(ListingDB.claimed_by_user_id == user_id).order_by(ListingDB.created_at.desc())
    ).scalars().all()
    output: list[ListingFeedItem] = []
    for listing in listings:
        poster = db.get(UserDB, listing.poster_id)
        tags = db.execute(select(ListingTagDB.tag).where(ListingTagDB.listing_id == listing.id)).scalars().all()
        claim_count = db.execute(select(ClaimDB).where(ClaimDB.listing_id == listing.id)).scalars().all()
        output.append(to_feed_item(listing, poster.full_name if poster else "Unknown", tags, len(claim_count)))
    return output


@router.get("/mine", response_model=list[MyListingDetails])
def my_postings(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)) -> list[MyListingDetails]:
    mine = db.execute(
        select(ListingDB).where(ListingDB.poster_id == user_id).order_by(ListingDB.created_at.desc())
    ).scalars().all()

    output: list[MyListingDetails] = []
    for listing in mine:
        poster = db.get(UserDB, listing.poster_id)
        tags = db.execute(select(ListingTagDB.tag).where(ListingTagDB.listing_id == listing.id)).scalars().all()
        claimants: list[ClaimantInfo] = []
        claims_sorted = db.execute(
            select(ClaimDB)
            .where(ClaimDB.listing_id == listing.id)
            .order_by(ClaimDB.created_at.desc())
        ).scalars().all()
        for claim in claims_sorted:
            u = db.get(UserDB, claim.claimant_id)
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

        feed_item = to_feed_item(
            listing,
            poster.full_name if poster else "Unknown",
            tags,
            len(claims_sorted),
        )
        output.append(MyListingDetails(**feed_item.model_dump(), claimants=claimants))

    return output
