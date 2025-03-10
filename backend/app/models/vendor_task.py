from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class VendorTask(Base):
    __tablename__ = "vendor_tasks"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    product_id = Column(String, nullable=False)  # 產品節點ID
    product_name = Column(String, nullable=False)  # 產品名稱
    vendor = Column(String, nullable=False)  # 供應商名稱
    description = Column(Text, nullable=True)  # 任務描述
    status = Column(Enum("pending", "completed", "overdue", name="task_status"), default="pending")  # 任務狀態
    deadline = Column(DateTime, nullable=True)  # 截止日期
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 創建時間
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # 更新時間
    
    # 關聯
    workflow = relationship("Workflow", back_populates="vendor_tasks") 