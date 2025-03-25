from sqlalchemy import JSON, Column, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    product_type = Column(String, nullable=False)
    weight = Column(Float)
    dimensions = Column(String)
    materials = Column(JSON)  # Store materials information as JSON
    carbon_footprint = Column(Float, default=0.0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="products")
