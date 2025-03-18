from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    data = Column(JSON)  # 存储工作流程的JSON数据
    is_public = Column(Boolean, default=False)
    total_carbon_footprint = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联关系
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


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, index=True)  # 前端生成的节点ID
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    node_type = Column(
        String
    )  # 节点类型 (product, manufacturing, distribution, usage, disposal)
    label = Column(String)
    position_x = Column(Float)
    position_y = Column(Float)
    data = Column(JSON)  # 节点数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联关系
    workflow = relationship("Workflow", back_populates="nodes")


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"

    id = Column(Integer, primary_key=True, index=True)
    edge_id = Column(String, index=True)  # 前端生成的边ID
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    source = Column(String)  # 源节点ID
    target = Column(String)  # 目标节点ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关联关系
    workflow = relationship("Workflow", back_populates="edges")
