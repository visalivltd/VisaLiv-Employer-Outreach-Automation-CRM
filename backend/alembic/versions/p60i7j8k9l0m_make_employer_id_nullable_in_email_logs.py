"""make_employer_id_nullable_in_email_logs

Revision ID: p60i7j8k9l0m
Revises: n50h6i7j8k9l
Create Date: 2026-10-06 12:54:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'p60i7j8k9l0m'
down_revision: Union[str, Sequence[str], None] = 'n50h6i7j8k9l'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('email_logs', 'employer_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column('email_logs', 'employer_id', existing_type=sa.Integer(), nullable=False)
