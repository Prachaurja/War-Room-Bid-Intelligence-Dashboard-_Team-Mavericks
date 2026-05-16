"""phase3_sessions_apikeys_teams_totp

Revision ID: a1b2c3d4e5f6
Revises: 79f5216abed5
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = '79f5216abed5'
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── 1. Add 2FA columns to users ───────────────────────────
    op.add_column('users', sa.Column('totp_secret',  sa.String(64),  nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(),   nullable=False, server_default='false'))

    # ── 2. sessions ───────────────────────────────────────────
    op.create_table(
        'sessions',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id',        postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash',     sa.String(255), nullable=False, unique=True),
        sa.Column('ip_address',     sa.String(45),  nullable=True),
        sa.Column('user_agent',     sa.Text(),       nullable=True),
        sa.Column('is_active',      sa.Boolean(),    nullable=False, server_default='true'),
        sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_active_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_sessions_user_id',    'sessions', ['user_id'])
    op.create_index('ix_sessions_token_hash', 'sessions', ['token_hash'], unique=True)

    # ── 3. api_keys ───────────────────────────────────────────
    op.create_table(
        'api_keys',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name',         sa.String(100), nullable=False),
        sa.Column('key_hash',     sa.String(255), nullable=False, unique=True),
        sa.Column('prefix',       sa.String(12),  nullable=False),
        sa.Column('is_active',    sa.Boolean(),   nullable=False, server_default='true'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_api_keys_user_id',  'api_keys', ['user_id'])
    op.create_index('ix_api_keys_key_hash', 'api_keys', ['key_hash'], unique=True)

    # ── 4. teams ──────────────────────────────────────────────
    op.create_table(
        'teams',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name',       sa.String(100), nullable=False),
        sa.Column('owner_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── 5. invitations ────────────────────────────────────────
    op.create_table(
        'invitations',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('team_id',    postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email',      sa.String(255), nullable=False),
        sa.Column('role',       sa.String(50),  nullable=False, server_default='analyst'),
        sa.Column('token',      sa.String(255), nullable=False, unique=True),
        sa.Column('status',     sa.Enum('pending','accepted','expired','revoked', name='invitationstatus'),
                  nullable=False, server_default='pending'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_invitations_team_id', 'invitations', ['team_id'])
    op.create_index('ix_invitations_email',   'invitations', ['email'])
    op.create_index('ix_invitations_token',   'invitations', ['token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_invitations_token',   table_name='invitations')
    op.drop_index('ix_invitations_email',   table_name='invitations')
    op.drop_index('ix_invitations_team_id', table_name='invitations')
    op.drop_table('invitations')

    op.drop_table('teams')

    op.drop_index('ix_api_keys_key_hash', table_name='api_keys')
    op.drop_index('ix_api_keys_user_id',  table_name='api_keys')
    op.drop_table('api_keys')

    op.drop_index('ix_sessions_token_hash', table_name='sessions')
    op.drop_index('ix_sessions_user_id',    table_name='sessions')
    op.drop_table('sessions')

    op.drop_column('users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
    op.execute("DROP TYPE IF EXISTS invitationstatus")