from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class VendorTaskBase(BaseModel):
    product_id: str
    product_name: str
    vendor: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None


class VendorTaskCreate(VendorTaskBase):
    workflow_id: int


class VendorTaskUpdate(BaseModel):
    product_name: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class VendorTaskInDB(VendorTaskBase):
    id: int
    workflow_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VendorTask(VendorTaskInDB):
    pass


class VendorTaskSubmit(BaseModel):
    """用於提交供應商任務結果的模式"""

    data: dict
    notes: Optional[str] = None
