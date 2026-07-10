"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-09 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
        sa.Column("token_version", sa.Integer(), server_default="1", nullable=True),
    )

    # 2. audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(), nullable=True),
        sa.Column("project_id", sa.String(), nullable=True),
        sa.Column("details", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 3. api_keys table
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("key_hash", sa.String(), unique=True, nullable=True),
        sa.Column("prefix", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_api_keys_hash", "api_keys", ["key_hash"])

    # 4. repositories table
    op.create_table(
        "repositories",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("repository_name", sa.String(), nullable=True),
        sa.Column("repository_path", sa.String(), nullable=True),
        sa.Column("branch", sa.String(), nullable=True),
        sa.Column(
            "indexed_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column(
            "last_accessed",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
        sa.Column("files_indexed", sa.Integer(), server_default="0", nullable=True),
        sa.Column("chunks_indexed", sa.Integer(), server_default="0", nullable=True),
    )

    # 5. graph_nodes table
    op.create_table(
        "graph_nodes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "repo_id",
            sa.String(),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("path", sa.String(), nullable=True),
        sa.Column("meta", sa.String(), nullable=True),
    )

    # 6. graph_edges table
    op.create_table(
        "graph_edges",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "repo_id",
            sa.String(),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "source_node_id",
            sa.String(),
            sa.ForeignKey("graph_nodes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "target_node_id",
            sa.String(),
            sa.ForeignKey("graph_nodes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("relation_type", sa.String(), nullable=True),
    )

    # 7. organizations table
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 8. projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "org_id",
            sa.String(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "repository_id",
            sa.String(),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 9. project_members table
    op.create_table(
        "project_members",
        sa.Column(
            "project_id",
            sa.String(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(), nullable=True),
    )

    # 10. comments table
    op.create_table(
        "comments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("file", sa.String(), nullable=True),
        sa.Column("line", sa.Integer(), nullable=True),
        sa.Column("comment_text", sa.String(), nullable=True),
        sa.Column("author", sa.String(), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 11. embedding_cache table
    op.create_table(
        "embedding_cache",
        sa.Column("text_hash", sa.String(), primary_key=True),
        sa.Column("embedding", sa.String(), nullable=True),
    )

    # 12. llm_cache table
    op.create_table(
        "llm_cache",
        sa.Column("prompt_hash", sa.String(), primary_key=True),
        sa.Column("response", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 13. analytics_cache table
    op.create_table(
        "analytics_cache",
        sa.Column("repo_path", sa.String(), primary_key=True),
        sa.Column("analytics_data", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )

    # 14. telemetry_logs table
    op.create_table(
        "telemetry_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_type", sa.String(), nullable=True),
        sa.Column("latency", sa.Float(), server_default="0", nullable=True),
        sa.Column("success", sa.Integer(), server_default="1", nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("token_count", sa.Integer(), server_default="0", nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("telemetry_logs")
    op.drop_table("analytics_cache")
    op.drop_table("llm_cache")
    op.drop_table("embedding_cache")
    op.drop_table("comments")
    op.drop_table("project_members")
    op.drop_table("projects")
    op.drop_table("organizations")
    op.drop_table("graph_edges")
    op.drop_table("graph_nodes")
    op.drop_table("repositories")
    op.drop_index("idx_api_keys_hash", "api_keys")
    op.drop_table("api_keys")
    op.drop_table("audit_logs")
    op.drop_table("users")
