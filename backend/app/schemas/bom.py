from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BOMFileBase(BaseModel):
    title: str
    file_path: str
    content: str
    file_type: str
    standardized_content: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BOMFileCreate(BOMFileBase):
    pass


class BOMFile(BOMFileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
