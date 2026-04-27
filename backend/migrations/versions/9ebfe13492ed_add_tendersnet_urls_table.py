"""add tendersnet urls table
Revision ID: 9ebfe13492ed
Revises: 762a34f21fd2
Create Date: 2026-04-25 11:49:36.896377
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '9ebfe13492ed'
down_revision: Union[str, Sequence[str], None] = '762a34f21fd2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'tendersnet_urls',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('url', sa.String(2000), nullable=False, unique=True),
        sa.Column('label', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_fetched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('record_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('tendersnet_urls')
