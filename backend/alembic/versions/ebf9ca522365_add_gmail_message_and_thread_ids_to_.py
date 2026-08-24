"""add gmail message and thread ids to email logs

Revision ID: ebf9ca522365
Revises: h89b0c1d2e3f
Create Date: 2026-08-24 12:50:28.744390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebf9ca522365'
down_revision: Union[str, Sequence[str], None] = 'h89b0c1d2e3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "email_logs",
        sa.Column("gmail_message_id", sa.String(), nullable=True),
    )
    op.add_column(
        "email_logs",
        sa.Column("gmail_thread_id", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("email_logs", "gmail_thread_id")
    op.drop_column("email_logs", "gmail_message_id")