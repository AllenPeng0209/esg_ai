"""Initialize database schema

Revision ID: 001
Revises: 
Create Date: 2025-03-23 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create UUID extension if not exists
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Create task_status enum type
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE task_status AS ENUM ('pending', 'completed', 'overdue');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)
    
    # Create users table with reference to auth.users
    op.execute("""
        CREATE TABLE users (
            id UUID NOT NULL PRIMARY KEY,
            email VARCHAR NOT NULL,
            full_name VARCHAR,
            company VARCHAR,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
        )
    """)
    
    op.execute("""
        CREATE INDEX ix_users_email ON users (email)
    """)
    
    # Create workflows table
    op.execute("""
        CREATE TABLE workflows (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            name VARCHAR NOT NULL,
            description TEXT,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            total_carbon_footprint FLOAT NOT NULL DEFAULT 0.0,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create workflow_nodes table
    op.execute("""
        CREATE TABLE workflow_nodes (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            node_id VARCHAR NOT NULL,
            workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            node_type VARCHAR NOT NULL,
            label VARCHAR NOT NULL,
            position_x FLOAT NOT NULL,
            position_y FLOAT NOT NULL,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create workflow_edges table
    op.execute("""
        CREATE TABLE workflow_edges (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            edge_id VARCHAR NOT NULL,
            workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            source VARCHAR NOT NULL,
            target VARCHAR NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create products table
    op.execute("""
        CREATE TABLE products (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT,
            product_type VARCHAR NOT NULL,
            weight FLOAT,
            dimensions VARCHAR,
            materials JSONB DEFAULT '{}'::jsonb,
            carbon_footprint FLOAT NOT NULL DEFAULT 0.0,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create bom_files table
    op.execute("""
        CREATE TABLE bom_files (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR NOT NULL,
            file_path VARCHAR NOT NULL,
            content TEXT NOT NULL,
            standardized_content TEXT,
            file_type VARCHAR NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create vendor_tasks table
    op.execute("""
        CREATE TABLE vendor_tasks (
            id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
            workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            product_id VARCHAR NOT NULL,
            product_name VARCHAR NOT NULL,
            vendor VARCHAR NOT NULL,
            description TEXT,
            status task_status NOT NULL DEFAULT 'pending',
            deadline TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes
    op.execute('CREATE INDEX ix_workflows_user_id ON workflows (user_id)')
    op.execute('CREATE INDEX ix_workflow_nodes_workflow_id ON workflow_nodes (workflow_id)')
    op.execute('CREATE INDEX ix_workflow_edges_workflow_id ON workflow_edges (workflow_id)')
    op.execute('CREATE INDEX ix_products_user_id ON products (user_id)')
    op.execute('CREATE INDEX ix_bom_files_user_id ON bom_files (user_id)')
    op.execute('CREATE INDEX ix_vendor_tasks_workflow_id ON vendor_tasks (workflow_id)')


def downgrade() -> None:
    # Drop tables in reverse order
    op.execute('DROP TABLE IF EXISTS vendor_tasks CASCADE')
    op.execute('DROP TABLE IF EXISTS bom_files CASCADE')
    op.execute('DROP TABLE IF EXISTS products CASCADE')
    op.execute('DROP TABLE IF EXISTS workflow_edges CASCADE')
    op.execute('DROP TABLE IF EXISTS workflow_nodes CASCADE')
    op.execute('DROP TABLE IF EXISTS workflows CASCADE')
    op.execute('DROP TABLE IF EXISTS users CASCADE')
    
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS task_status')
    
    # Drop UUID extension
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"') 