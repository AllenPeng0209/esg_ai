from sqlalchemy import JSON, Boolean, Column, ForeignKey, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Workflow(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "workflows"

    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    data = Column(JSON, nullable=False)  # Store workflow data as JSON
    is_public = Column(Boolean, default=False, nullable=False)
    total_carbon_footprint = Column(Float, default=0.0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="workflows")
    nodes = relationship(
        "WorkflowNode", back_populates="workflow", cascade="all, delete-orphan"
    )
    edges = relationship(
        "WorkflowEdge", back_populates="workflow", cascade="all, delete-orphan"
    )
    vendor_tasks = relationship(
        "VendorTask", back_populates="workflow", cascade="all, delete-orphan"
    )


class WorkflowNode(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "workflow_nodes"

    node_id = Column(String, index=True, nullable=False)  # Frontend-generated node ID
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    node_type = Column(
        String, nullable=False
    )  # Node type (product, manufacturing, distribution, usage, disposal)
    label = Column(String, nullable=False)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    data = Column(JSON, nullable=False)  # Node data

    # Relationships
    workflow = relationship("Workflow", back_populates="nodes")


class WorkflowEdge(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "workflow_edges"

    edge_id = Column(String, index=True, nullable=False)  # Frontend-generated edge ID
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    source = Column(String, nullable=False)  # Source node ID
    target = Column(String, nullable=False)  # Target node ID

    # Relationships
    workflow = relationship("Workflow", back_populates="edges")
