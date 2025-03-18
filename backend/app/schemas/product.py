from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    product_type: str
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    materials: Optional[Dict[str, Any]] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    product_type: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    materials: Optional[Dict[str, Any]] = None
    carbon_footprint: Optional[float] = None


class Product(ProductBase):
    id: int
    user_id: int
    carbon_footprint: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
