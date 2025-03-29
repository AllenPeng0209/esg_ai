from typing import Generator, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.supabase import get_supabase_client, get_supabase_admin_client
from app.schemas.user import UserResponse

security = HTTPBearer()


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    """
    Get current authenticated user from Supabase token
    """
    try:
        # Verify JWT with Supabase
        supabase = get_supabase_client()

        try:
            user_response = supabase.auth.get_user(token.credentials)
        except Exception as auth_error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(auth_error)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user from Supabase
        response = supabase.table("users").select("*").eq("id", str(user.id)).execute()
        return UserResponse(**response.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Verify user is active
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: UserResponse = Depends(get_current_active_user),
) -> UserResponse:
    """
    Verify user is superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user


def get_supabase_admin(
    current_user: UserResponse = Depends(get_current_active_superuser),
) -> Generator:
    """
    Get Supabase admin client for privileged operations
    """
    try:
        client = get_supabase_admin_client()
        yield client
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initialize Supabase admin client: {str(e)}",
        )
