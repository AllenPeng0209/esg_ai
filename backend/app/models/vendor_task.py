from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class VendorTask(Base):
    __tablename__ = "vendor_tasks"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    product_id = Column(String, nullable=False)  # 产品节点ID
    product_name = Column(String, nullable=False)  # 产品名称
    vendor = Column(String, nullable=False)  # 供应商名称
    description = Column(Text, nullable=True)  # 任务描述
    status = Column(Enum("pending", "completed", "overdue", name="task_status"), default="pending")  # 任务状态
    deadline = Column(DateTime, nullable=True)  # 截止日期
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 创建时间
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # 更新时间
    
    # 关联
    workflow = relationship("Workflow", back_populates="vendor_tasks") 