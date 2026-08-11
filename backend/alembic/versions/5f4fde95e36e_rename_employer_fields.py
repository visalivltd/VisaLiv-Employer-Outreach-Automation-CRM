"""rename employer fields

Revision ID: 5f4fde95e36e
Revises: 852938dd0269
Create Date: 2026-08-11 12:23:20.352588

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5f4fde95e36e"
down_revision: Union[str, Sequence[str], None] = "852938dd0269"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.alter_column(
        "employers",
        "company_name",
        new_column_name="service_name",
    )

    op.alter_column(
        "employers",
        "website",
        new_column_name="service_website",
    )

    op.drop_column(
        "employers",
        "contact_person",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.add_column(
        "employers",
        sa.Column(
            "contact_person",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.alter_column(
        "employers",
        "service_website",
        new_column_name="website",
    )

    op.alter_column(
        "employers",
        "service_name",
        new_column_name="company_name",
    )