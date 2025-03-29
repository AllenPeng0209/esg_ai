from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class VendorTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vendor_tasks"

    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    product_id = Column(String, nullable=False)  # Product node ID
    product_name = Column(String, nullable=False)  # Product name
    vendor = Column(String, nullable=False)  # Vendor name
    description = Column(Text)  # Task description
    status = Column(
        Enum("pending", "completed", "overdue", name="task_status"),
        default="pending",
        nullable=False,
    )  # Task status
    deadline = Column(DateTime(timezone=True))  # Deadline

    # Relationships
    workflow = relationship("Workflow", back_populates="vendor_tasks")
