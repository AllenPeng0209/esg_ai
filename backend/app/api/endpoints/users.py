from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.core.supabase import get_supabase_client, get_supabase_admin_client
from app.schemas.user import User, UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(deps.get_current_active_superuser),
):
    """Get all users (superuser only)"""
    supabase = get_supabase_client()
    response = supabase.table('users').select('*').range(skip, skip + limit).execute()
    return response.data


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: UserResponse = Depends(deps.get_current_active_user),
):
    """Get current user info"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(deps.get_current_active_user),
):
    """Update current user"""
    supabase = get_supabase_client()
    
    # Update user data
    update_data = user_update.dict(exclude_unset=True)
    response = supabase.table('users').update(update_data).eq('id', str(current_user.id)).execute()
    
    # Also update user metadata in auth if needed
    if user_update.full_name or user_update.company:
        admin = get_supabase_admin_client()
        metadata = {}
        if user_update.full_name:
            metadata['full_name'] = user_update.full_name
        if user_update.company:
            metadata['company'] = user_update.company
        admin.auth.admin.update_user_by_id(current_user.id, {'user_metadata': metadata})
    
    return response.data[0]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    current_user: UserResponse = Depends(deps.get_current_active_superuser),
):
    """Get user by ID (superuser only)"""
    supabase = get_supabase_client()
    response = supabase.table('users').select('*').eq('id', str(user_id)).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    return response.data


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: UserResponse = Depends(deps.get_current_active_superuser),
):
    """Update user (superuser only)"""
    supabase = get_supabase_client()
    
    # Check if user exists
    user = supabase.table('users').select('*').eq('id', str(user_id)).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user data
    update_data = user_update.dict(exclude_unset=True)
    response = supabase.table('users').update(update_data).eq('id', str(user_id)).execute()
    
    # Also update user metadata in auth if needed
    if user_update.full_name or user_update.company:
        admin = get_supabase_admin_client()
        metadata = {}
        if user_update.full_name:
            metadata['full_name'] = user_update.full_name
        if user_update.company:
            metadata['company'] = user_update.company
        admin.auth.admin.update_user_by_id(user_id, {'user_metadata': metadata})
    
    return response.data[0]
