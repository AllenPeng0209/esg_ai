from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api import deps
from app.core.supabase import get_supabase_client
from app.schemas.user import UserResponse
from app.schemas.product import Product, ProductCreate, ProductUpdate

router = APIRouter()


@router.get("/", response_model=List[Product])
def get_products(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Get all products"""
    supabase = get_supabase_client()
    response = (
        supabase.table("products").select("*").range(skip, skip + limit).execute()
    )
    return response.data


@router.get("/{product_id}", response_model=Product)
def get_product(
    product_id: UUID,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Get specific product"""
    supabase = get_supabase_client()
    response = (
        supabase.table("products")
        .select("*")
        .eq("id", str(product_id))
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return response.data


@router.post("/", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Create new product"""
    supabase = get_supabase_client()

    # Add user_id to product data
    product_data = product.dict()
    product_data["user_id"] = str(current_user.id)

    response = supabase.table("products").insert(product_data).execute()
    return response.data[0]


@router.put("/{product_id}", response_model=Product)
def update_product(
    product_id: UUID,
    product_update: ProductUpdate,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Update product"""
    supabase = get_supabase_client()

    # Get product
    product = (
        supabase.table("products")
        .select("*")
        .eq("id", str(product_id))
        .single()
        .execute()
    )
    if not product.data:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if user has permission to update product
    if product.data["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=403, detail="You don't have permission to update this product"
        )

    # Update product
    update_data = product_update.dict(exclude_unset=True)
    response = (
        supabase.table("products")
        .update(update_data)
        .eq("id", str(product_id))
        .execute()
    )
    return response.data[0]


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Delete product"""
    supabase = get_supabase_client()

    # Get product
    product = (
        supabase.table("products")
        .select("*")
        .eq("id", str(product_id))
        .single()
        .execute()
    )
    if not product.data:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if user has permission to delete product
    if product.data["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=403, detail="You don't have permission to delete this product"
        )

    supabase.table("products").delete().eq("id", str(product_id)).execute()
    return None
