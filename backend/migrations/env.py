import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Add project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Load environment variables
load_dotenv()

# Import Base and all models
from app.models.base import Base
from app.models.bom import BOMFile
from app.models.product import Product
from app.models.user import User
from app.models.workflow import Workflow, WorkflowEdge, WorkflowNode
from app.models.vendor_task import VendorTask

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Get database URL from environment variables
database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise ValueError("No DATABASE_URL set in environment variables")

# Ensure the URL includes +psycopg2
if database_url.startswith("postgresql://") and not database_url.startswith("postgresql+psycopg2://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Ensure sslmode is set to require
if "sslmode=" not in database_url:
    database_url += "&sslmode=require" if "?" in database_url else "?sslmode=require"

print(f"Using database URL: {database_url}")
# Set SQLAlchemy URL
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = database_url
    
    # Update SSL configuration
    configuration["sqlalchemy.connect_args"] = {
        "sslmode": "require",
        "connect_timeout": 30,
        "application_name": "alembic",
        "gssencmode": "disable"  # Disable GSSAPI authentication
    }

    # Use NullPool to avoid connection issues during migrations
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
