from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserUpdate
from app.services.user_service import get_user_by_id, update_user
from app.core.security import get_current_active_user, get_current_active_superuser

router = APIRouter()

@router.get("/me", response_model=UserSchema)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    """
    获取当前登录用户信息
    """
    return current_user

@router.put("/me", response_model=UserSchema)
def update_current_user(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    更新当前登录用户信息
    """
    updated_user = update_user(db, current_user.id, user_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="用户未找到")
    return updated_user

@router.get("/{user_id}", response_model=UserSchema)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """
    获取指定用户信息（仅超级管理员）
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户未找到")
    return user 