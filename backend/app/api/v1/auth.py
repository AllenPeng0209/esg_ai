from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from supabase.client import Client

from app.api import deps
from app.schemas.user import UserCreate, User
from app.core.config import settings

router = APIRouter()
supabase: Client = deps.supabase

@router.post("/signup", response_model=User)
async def signup(*, db: Session = Depends(deps.get_db), user_in: UserCreate):
    try:
        # Create user in Supabase
        auth_response = supabase.auth.sign_up({
            "email": user_in.email,
            "password": user_in.password,
            "options": {
                "data": {
                    "full_name": user_in.full_name,
                    "company": user_in.company
                }
            }
        })
        
        # Create user in our database
        db_user = User(
            id=auth_response.user.id,
            email=user_in.email,
            full_name=user_in.full_name,
            company=user_in.company,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/login")
async def login(*, email: str, password: str):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return response.session
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/logout")
async def logout():
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        ) 