from app.models.entities import Listing, Message, Thread, User


class InMemoryStore:
    def __init__(self) -> None:
        self.users: dict[str, User] = {}
        self.listings: dict[str, Listing] = {}
        self.threads: dict[str, Thread] = {}
        self.messages: dict[str, list[Message]] = {}
        self.verification_codes: dict[str, str] = {}


store = InMemoryStore()

