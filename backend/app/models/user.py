from sqlalchemy import Boolean, Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    # Now id is a foreign key to auth.users table
    id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    company = Column(String)
    is_active = Column(Boolean(), default=True, nullable=False)
    is_superuser = Column(Boolean(), default=False, nullable=False)

    # Keep relationships for our application logic
    workflows = relationship("Workflow", back_populates="user")
    products = relationship("Product", back_populates="user")
    bom_files = relationship("BOMFile", back_populates="user")
