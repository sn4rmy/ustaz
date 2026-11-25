"""add items ordered

Revision ID: 5531f838aea2
Revises: 758e00678320
Create Date: 2026-11-23 18:13:51.835514

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5531f838aea2"
down_revision: str | Sequence[str] | None = "758e00678320"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column(
            "ordered", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("items", "ordered")
