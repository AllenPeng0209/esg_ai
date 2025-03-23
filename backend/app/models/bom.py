from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class BOMFile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bom_files"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    standardized_content = Column(Text)
    file_type = Column(String, nullable=False)  # CSV, Excel

    # Relationships
    user = relationship("User", back_populates="bom_files")
