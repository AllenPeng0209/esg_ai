from datetime import datetime
from typing import Dict, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    product_type: str
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    materials: Optional[Dict] = None
    carbon_footprint: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    name: Optional[str] = None
    product_type: Optional[str] = None


class Product(ProductBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
