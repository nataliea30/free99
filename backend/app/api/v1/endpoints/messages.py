from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.db import MessageDB, ThreadDB, ThreadParticipantDB, UserDB
from app.schemas.messages import MessageCreateRequest, MessageItem, ThreadSummary

router = APIRouter()


@router.get("/threads", response_model=list[ThreadSummary])
def get_threads(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)) -> list[ThreadSummary]:
    participant_rows = db.execute(
        select(ThreadParticipantDB).where(ThreadParticipantDB.user_id == user_id)
    ).scalars().all()
    thread_ids = [p.thread_id for p in participant_rows]
    if not thread_ids:
        return []

    threads = db.execute(
        select(ThreadDB).where(ThreadDB.id.in_(thread_ids)).order_by(ThreadDB.last_message_at.desc())
    ).scalars().all()

    output: list[ThreadSummary] = []
    for thread in threads:
        ids = db.execute(
            select(ThreadParticipantDB.user_id).where(ThreadParticipantDB.thread_id == thread.id)
        ).scalars().all()
        output.append(
            ThreadSummary(
                id=thread.id,
                participant_ids=ids,
                listing_id=thread.listing_id,
                last_message_at=thread.last_message_at,
            )
        )
    return output


@router.post("/threads")
def create_thread(
    participant_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    participant = db.get(UserDB, participant_id)
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    user_thread_ids = db.execute(
        select(ThreadParticipantDB.thread_id).where(ThreadParticipantDB.user_id == user_id)
    ).scalars().all()
    participant_thread_ids = db.execute(
        select(ThreadParticipantDB.thread_id).where(ThreadParticipantDB.user_id == participant_id)
    ).scalars().all()
    common_ids = set(user_thread_ids).intersection(participant_thread_ids)
    if common_ids:
        existing_thread = db.execute(select(ThreadDB).where(ThreadDB.id.in_(list(common_ids)))).scalars().first()
        if existing_thread:
            return {"thread_id": existing_thread.id}

    thread = ThreadDB(id=str(uuid4()))
    db.add(thread)
    db.flush()
    db.add(ThreadParticipantDB(thread_id=thread.id, user_id=user_id))
    db.add(ThreadParticipantDB(thread_id=thread.id, user_id=participant_id))
    db.commit()
    return {"thread_id": thread.id}


@router.get("/{thread_id}", response_model=list[MessageItem])
def get_messages(
    thread_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> list[MessageItem]:
    participant = db.execute(
        select(ThreadParticipantDB)
        .where(ThreadParticipantDB.thread_id == thread_id)
        .where(ThreadParticipantDB.user_id == user_id)
    ).scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    msgs = db.execute(
        select(MessageDB)
        .where(MessageDB.thread_id == thread_id)
        .where(MessageDB.deleted_at.is_(None))
        .order_by(MessageDB.created_at.asc())
    ).scalars().all()
    return [
        MessageItem(
            id=m.id,
            thread_id=m.thread_id,
            sender_id=m.sender_id,
            text=m.text,
            created_at=m.created_at,
        )
        for m in msgs
    ]


@router.post("", response_model=MessageItem)
def send_message(
    payload: MessageCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> MessageItem:
    participant = db.execute(
        select(ThreadParticipantDB)
        .where(ThreadParticipantDB.thread_id == payload.thread_id)
        .where(ThreadParticipantDB.user_id == user_id)
    ).scalar_one_or_none()
    thread = db.get(ThreadDB, payload.thread_id)
    if not thread or not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    now = datetime.utcnow()
    message = MessageDB(
        id=str(uuid4()),
        thread_id=payload.thread_id,
        sender_id=user_id,
        text=payload.text,
        created_at=now,
    )
    db.add(message)
    thread.last_message_at = now
    db.add(thread)
    db.commit()

    return MessageItem(
        id=message.id,
        thread_id=message.thread_id,
        sender_id=message.sender_id,
        text=message.text,
        created_at=message.created_at,
    )
