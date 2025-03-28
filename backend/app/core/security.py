from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.user import UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    """
    Get current user from JWT token using Supabase
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify JWT with Supabase
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise credentials_exception

        # Get user from our users table
        response = (
            supabase.table("users").select("*").eq("id", user.id).single().execute()
        )
        if not response.data:
            raise credentials_exception

        return UserResponse(**response.data)

    except Exception as e:
        raise credentials_exception


async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Verify user is active
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_active_superuser(
    current_user: UserResponse = Depends(get_current_active_user),
) -> UserResponse:
    """
    Verify user is superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user
