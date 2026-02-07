from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user_id
from app.models.entities import Message, Thread
from app.schemas.messages import MessageCreateRequest, MessageItem, ThreadSummary
from app.services.store import store

router = APIRouter()


@router.get("/threads", response_model=list[ThreadSummary])
def get_threads(user_id: str = Depends(get_current_user_id)) -> list[ThreadSummary]:
    threads = [t for t in store.threads.values() if user_id in t.participant_ids]
    threads.sort(key=lambda t: t.last_message_at, reverse=True)
    return [
        ThreadSummary(
            id=t.id,
            participant_ids=t.participant_ids,
            listing_id=t.listing_id,
            last_message_at=t.last_message_at,
        )
        for t in threads
    ]


@router.post("/threads")
def create_thread(participant_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    if participant_id not in store.users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    existing = next(
        (
            t
            for t in store.threads.values()
            if sorted(t.participant_ids) == sorted([user_id, participant_id])
        ),
        None,
    )
    if existing:
        return {"thread_id": existing.id}

    thread = Thread(id=str(uuid4()), participant_ids=[user_id, participant_id])
    store.threads[thread.id] = thread
    store.messages[thread.id] = []
    return {"thread_id": thread.id}


@router.get("/{thread_id}", response_model=list[MessageItem])
def get_messages(thread_id: str, user_id: str = Depends(get_current_user_id)) -> list[MessageItem]:
    thread = store.threads.get(thread_id)
    if not thread or user_id not in thread.participant_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    msgs = store.messages.get(thread_id, [])
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
def send_message(payload: MessageCreateRequest, user_id: str = Depends(get_current_user_id)) -> MessageItem:
    thread = store.threads.get(payload.thread_id)
    if not thread or user_id not in thread.participant_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    message = Message(id=str(uuid4()), thread_id=payload.thread_id, sender_id=user_id, text=payload.text)
    store.messages.setdefault(payload.thread_id, []).append(message)
    thread.last_message_at = message.created_at

    return MessageItem(
        id=message.id,
        thread_id=message.thread_id,
        sender_id=message.sender_id,
        text=message.text,
        created_at=message.created_at,
    )

