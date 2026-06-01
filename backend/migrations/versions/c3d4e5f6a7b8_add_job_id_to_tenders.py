"""add job_id to tenders table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-11

"""
from alembic import op
import sqlalchemy as sa

revision      = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # Add job_id column — nullable so existing tenders aren't broken
    op.add_column(
        'tenders',
        sa.Column(
            'job_id',
            sa.Integer(),
            sa.ForeignKey('ingestion_jobs.id', ondelete='SET NULL'),
            nullable=True,
        )
    )
    op.create_index('ix_tenders_job_id', 'tenders', ['job_id'])


def downgrade() -> None:
    op.drop_index('ix_tenders_job_id', table_name='tenders')
    op.drop_column('tenders', 'job_id')