"""add recovery codes table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision      = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'recovery_codes',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code_hash',   sa.String(255), nullable=False),   # SHA-256 of the plain code
        sa.Column('is_used',     sa.Boolean(),   nullable=False, server_default='false'),
        sa.Column('used_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_recovery_codes_user_id',   'recovery_codes', ['user_id'])
    op.create_index('ix_recovery_codes_code_hash', 'recovery_codes', ['code_hash'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_recovery_codes_code_hash', table_name='recovery_codes')
    op.drop_index('ix_recovery_codes_user_id',   table_name='recovery_codes')
    op.drop_table('recovery_codes')