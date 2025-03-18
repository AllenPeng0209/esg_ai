from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.product import Product as ProductSchema
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.product_service import (
    create_product,
    delete_product,
    get_product_by_id,
    get_user_products,
    update_product,
)

router = APIRouter()


@router.get("/", response_model=List[ProductSchema])
async def read_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取当前用户的所有产品
    """
    products = get_user_products(db, current_user.id, skip, limit)
    return products


@router.get("/{product_id}", response_model=ProductSchema)
async def read_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取指定产品
    """
    product = get_product_by_id(db, product_id, current_user.id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")
    return product


@router.post("/", response_model=ProductSchema)
async def create_product_endpoint(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    创建新产品
    """
    return create_product(db, product, current_user.id)


@router.put("/{product_id}", response_model=ProductSchema)
async def update_product_endpoint(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    更新产品
    """
    product = update_product(db, product_id, product_data, current_user.id)
    if not product:
        raise HTTPException(status_code=404, detail="产品未找到")
    return product


@router.delete("/{product_id}")
async def delete_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    删除产品
    """
    result = delete_product(db, product_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="产品未找到")
    return {"message": "产品已删除"}
