"""update users id to uuid

Revision ID: 002
Revises: 001
Create Date: 2024-03-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a new UUID column
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # First, drop the foreign key constraints
    op.drop_constraint('workflows_user_id_fkey', 'workflows', type_='foreignkey')
    op.drop_constraint('products_user_id_fkey', 'products', type_='foreignkey')
    op.drop_constraint('bom_files_user_id_fkey', 'bom_files', type_='foreignkey')
    
    # Add new UUID columns
    op.add_column('users', sa.Column('uuid_id', postgresql.UUID(as_uuid=True)))
    op.add_column('workflows', sa.Column('uuid_user_id', postgresql.UUID(as_uuid=True)))
    op.add_column('products', sa.Column('uuid_user_id', postgresql.UUID(as_uuid=True)))
    op.add_column('bom_files', sa.Column('uuid_user_id', postgresql.UUID(as_uuid=True)))
    
    # Update the UUID column in users table with values from auth.users
    op.execute("""
        UPDATE public.users u
        SET uuid_id = CAST(au.id AS UUID)
        FROM auth.users au
        WHERE u.email = au.email
    """)
    
    # Create a temporary mapping table
    op.execute("""
        CREATE TEMP TABLE user_id_mapping AS
        SELECT id as old_id, uuid_id as new_id
        FROM users;
    """)
    
    # Update the new UUID columns in related tables
    op.execute("""
        UPDATE workflows w
        SET uuid_user_id = m.new_id
        FROM user_id_mapping m
        WHERE w.user_id = m.old_id;
    """)
    
    op.execute("""
        UPDATE products p
        SET uuid_user_id = m.new_id
        FROM user_id_mapping m
        WHERE p.user_id = m.old_id;
    """)
    
    op.execute("""
        UPDATE bom_files b
        SET uuid_user_id = m.new_id
        FROM user_id_mapping m
        WHERE b.user_id = m.old_id;
    """)
    
    # Drop old columns and rename new ones
    op.drop_column('workflows', 'user_id')
    op.drop_column('products', 'user_id')
    op.drop_column('bom_files', 'user_id')
    op.alter_column('workflows', 'uuid_user_id', new_column_name='user_id')
    op.alter_column('products', 'uuid_user_id', new_column_name='user_id')
    op.alter_column('bom_files', 'uuid_user_id', new_column_name='user_id')
    
    # Drop the old id column and rename uuid_id to id in users table
    op.drop_column('users', 'id')
    op.alter_column('users', 'uuid_id', new_column_name='id')
    
    # Drop the temporary mapping table
    op.execute("DROP TABLE user_id_mapping;")
    
    # Add primary key constraint
    op.create_primary_key('users_pkey', 'users', ['id'])
    
    # Recreate the foreign key constraints
    op.create_foreign_key('workflows_user_id_fkey', 'workflows', 'users', ['user_id'], ['id'])
    op.create_foreign_key('products_user_id_fkey', 'products', 'users', ['user_id'], ['id'])
    op.create_foreign_key('bom_files_user_id_fkey', 'bom_files', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key constraints
    op.drop_constraint('workflows_user_id_fkey', 'workflows', type_='foreignkey')
    op.drop_constraint('products_user_id_fkey', 'products', type_='foreignkey')
    op.drop_constraint('bom_files_user_id_fkey', 'bom_files', type_='foreignkey')
    
    # Add new integer columns
    op.add_column('users', sa.Column('int_id', sa.Integer()))
    op.add_column('workflows', sa.Column('int_user_id', sa.Integer()))
    op.add_column('products', sa.Column('int_user_id', sa.Integer()))
    op.add_column('bom_files', sa.Column('int_user_id', sa.Integer()))
    
    # Create a temporary mapping table for the downgrade
    op.execute("""
        CREATE TEMP TABLE user_id_mapping AS
        SELECT id as uuid_id, row_number() OVER (ORDER BY id) as new_id
        FROM users;
    """)
    
    # Update users table with sequential IDs
    op.execute("""
        UPDATE users u
        SET int_id = m.new_id
        FROM user_id_mapping m
        WHERE u.id = m.uuid_id;
    """)
    
    # Update related tables with the new integer IDs
    op.execute("""
        UPDATE workflows w
        SET int_user_id = m.new_id
        FROM user_id_mapping m
        WHERE w.user_id = m.uuid_id;
    """)
    
    op.execute("""
        UPDATE products p
        SET int_user_id = m.new_id
        FROM user_id_mapping m
        WHERE p.user_id = m.uuid_id;
    """)
    
    op.execute("""
        UPDATE bom_files b
        SET int_user_id = m.new_id
        FROM user_id_mapping m
        WHERE b.user_id = m.uuid_id;
    """)
    
    # Drop old columns and rename new ones
    op.drop_column('workflows', 'user_id')
    op.drop_column('products', 'user_id')
    op.drop_column('bom_files', 'user_id')
    op.alter_column('workflows', 'int_user_id', new_column_name='user_id')
    op.alter_column('products', 'int_user_id', new_column_name='user_id')
    op.alter_column('bom_files', 'int_user_id', new_column_name='user_id')
    
    # Drop the UUID column and rename int_id back to id in users table
    op.drop_column('users', 'id')
    op.alter_column('users', 'int_id', new_column_name='id')
    
    # Drop the temporary mapping table
    op.execute("DROP TABLE user_id_mapping;")
    
    # Add primary key constraint
    op.create_primary_key('users_pkey', 'users', ['id'])
    
    # Recreate the foreign key constraints
    op.create_foreign_key('workflows_user_id_fkey', 'workflows', 'users', ['user_id'], ['id'])
    op.create_foreign_key('products_user_id_fkey', 'products', 'users', ['user_id'], ['id'])
    op.create_foreign_key('bom_files_user_id_fkey', 'bom_files', 'users', ['user_id'], ['id'])
    
    # Drop the uuid-ossp extension if no other tables need it
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"') 