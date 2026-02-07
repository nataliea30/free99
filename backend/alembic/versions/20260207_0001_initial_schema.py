"""initial schema

Revision ID: 20260207_0001
Revises:
Create Date: 2026-02-07 23:25:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260207_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


listing_status_enum = sa.Enum("ACTIVE", "CLAIMED", "CLOSED", name="listingstatus")
claim_status_enum = sa.Enum("PENDING", "ACCEPTED", "REJECTED", "CANCELLED", name="claimstatus")
listing_status_column_enum = postgresql.ENUM(
    "ACTIVE", "CLAIMED", "CLOSED", name="listingstatus", create_type=False
)
claim_status_column_enum = postgresql.ENUM(
    "PENDING", "ACCEPTED", "REJECTED", "CANCELLED", name="claimstatus", create_type=False
)


def upgrade() -> None:
    listing_status_enum.create(op.get_bind(), checkfirst=True)
    claim_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("residence_hall", sa.String(length=120), nullable=False),
        sa.Column("pickup_preference", sa.String(length=120), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "verification_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_verification_tokens_user_id"), "verification_tokens", ["user_id"], unique=False)

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_refresh_sessions_user_id"), "refresh_sessions", ["user_id"], unique=False)

    op.create_table(
        "listings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("poster_id", sa.String(length=36), nullable=False),
        sa.Column("residence_hall", sa.String(length=120), nullable=False),
        sa.Column("condition", sa.String(length=80), nullable=False),
        sa.Column("delivery_available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("pickup_only", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", listing_status_column_enum, nullable=False, server_default="ACTIVE"),
        sa.Column("claimed_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["claimed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["poster_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listings_poster_id"), "listings", ["poster_id"], unique=False)
    op.create_index(op.f("ix_listings_claimed_by_user_id"), "listings", ["claimed_by_user_id"], unique=False)
    op.create_index(op.f("ix_listings_created_at"), "listings", ["created_at"], unique=False)

    op.create_table(
        "listing_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("tag", sa.String(length=80), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listing_tags_listing_id"), "listing_tags", ["listing_id"], unique=False)

    op.create_table(
        "claims",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("claimant_id", sa.String(length=36), nullable=False),
        sa.Column("status", claim_status_column_enum, nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["claimant_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "claimant_id", name="uq_claim_listing_claimant"),
    )
    op.create_index(op.f("ix_claims_listing_id"), "claims", ["listing_id"], unique=False)
    op.create_index(op.f("ix_claims_claimant_id"), "claims", ["claimant_id"], unique=False)
    op.create_index(op.f("ix_claims_created_at"), "claims", ["created_at"], unique=False)

    op.create_table(
        "listing_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("actor_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listing_events_listing_id"), "listing_events", ["listing_id"], unique=False)
    op.create_index(op.f("ix_listing_events_actor_id"), "listing_events", ["actor_id"], unique=False)

    op.create_table(
        "threads",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_threads_listing_id"), "threads", ["listing_id"], unique=False)
    op.create_index(op.f("ix_threads_last_message_at"), "threads", ["last_message_at"], unique=False)

    op.create_table(
        "thread_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("last_read_at", sa.DateTime(), nullable=True),
        sa.Column("muted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("thread_id", "user_id", name="uq_thread_user"),
    )
    op.create_index(op.f("ix_thread_participants_thread_id"), "thread_participants", ["thread_id"], unique=False)
    op.create_index(op.f("ix_thread_participants_user_id"), "thread_participants", ["user_id"], unique=False)

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("sender_id", sa.String(length=36), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_thread_id"), "messages", ["thread_id"], unique=False)
    op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)
    op.create_index(op.f("ix_messages_created_at"), "messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_messages_created_at"), table_name="messages")
    op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_thread_id"), table_name="messages")
    op.drop_table("messages")

    op.drop_index(op.f("ix_thread_participants_user_id"), table_name="thread_participants")
    op.drop_index(op.f("ix_thread_participants_thread_id"), table_name="thread_participants")
    op.drop_table("thread_participants")

    op.drop_index(op.f("ix_threads_last_message_at"), table_name="threads")
    op.drop_index(op.f("ix_threads_listing_id"), table_name="threads")
    op.drop_table("threads")

    op.drop_index(op.f("ix_listing_events_actor_id"), table_name="listing_events")
    op.drop_index(op.f("ix_listing_events_listing_id"), table_name="listing_events")
    op.drop_table("listing_events")

    op.drop_index(op.f("ix_claims_created_at"), table_name="claims")
    op.drop_index(op.f("ix_claims_claimant_id"), table_name="claims")
    op.drop_index(op.f("ix_claims_listing_id"), table_name="claims")
    op.drop_table("claims")

    op.drop_index(op.f("ix_listing_tags_listing_id"), table_name="listing_tags")
    op.drop_table("listing_tags")

    op.drop_index(op.f("ix_listings_created_at"), table_name="listings")
    op.drop_index(op.f("ix_listings_claimed_by_user_id"), table_name="listings")
    op.drop_index(op.f("ix_listings_poster_id"), table_name="listings")
    op.drop_table("listings")

    op.drop_index(op.f("ix_refresh_sessions_user_id"), table_name="refresh_sessions")
    op.drop_table("refresh_sessions")

    op.drop_index(op.f("ix_verification_tokens_user_id"), table_name="verification_tokens")
    op.drop_table("verification_tokens")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    claim_status_enum.drop(op.get_bind(), checkfirst=True)
    listing_status_enum.drop(op.get_bind(), checkfirst=True)
