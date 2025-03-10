from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BOMFileBase(BaseModel):
    title: str
    file_type: str

class BOMFileCreate(BOMFileBase):
    content: str

class BOMFileUpdate(BaseModel):
    title: Optional[str] = None
    standardized_content: Optional[str] = None

class BOMFile(BOMFileBase):
    id: int
    user_id: int
    file_path: str
    content: str
    standardized_content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 