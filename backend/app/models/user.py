from sqlalchemy import Boolean, Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    company = Column(String)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean(), default=True, nullable=False)
    is_superuser = Column(Boolean(), default=False, nullable=False)

    # Keep relationships for our application logic
    workflows = relationship("Workflow", back_populates="user")
    products = relationship("Product", back_populates="user")
    bom_files = relationship("BOMFile", back_populates="user")
