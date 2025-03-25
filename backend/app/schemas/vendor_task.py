from datetime import datetime
from typing import Dict, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class VendorTaskBase(BaseModel):
    workflow_id: UUID
    product_id: str
    product_name: str
    vendor: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: str = "pending"

    model_config = ConfigDict(from_attributes=True)


class VendorTaskCreate(VendorTaskBase):
    pass


class VendorTaskUpdate(BaseModel):
    product_name: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VendorTaskSubmit(BaseModel):
    data: Dict
    comments: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VendorTask(VendorTaskBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
