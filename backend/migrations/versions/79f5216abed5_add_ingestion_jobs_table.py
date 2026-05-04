"""add ingestion jobs table
Revision ID: 79f5216abed5
Revises: 9ebfe13492ed
Create Date: 2026-05-03 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '79f5216abed5'
down_revision: Union[str, Sequence[str], None] = '9ebfe13492ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'ingestion_jobs',
        sa.Column('id',           sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column('job_name',     sa.String(255),   nullable=False),
        sa.Column('source_name',  sa.String(255),   nullable=False),
        sa.Column('file_name',    sa.String(500),   nullable=True),
        sa.Column('status',       sa.String(50),    nullable=False, server_default='pending'),
        sa.Column('total_rows',   sa.Integer(),     nullable=True, server_default='0'),
        sa.Column('inserted',     sa.Integer(),     nullable=True, server_default='0'),
        sa.Column('updated',      sa.Integer(),     nullable=True, server_default='0'),
        sa.Column('skipped',      sa.Integer(),     nullable=True, server_default='0'),
        sa.Column('error_msg',    sa.Text(),        nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )

def downgrade() -> None:
    op.drop_table('ingestion_jobs')
