from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP', nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP', onupdate='CURRENT_TIMESTAMP', nullable=False)

class UUIDMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False) 