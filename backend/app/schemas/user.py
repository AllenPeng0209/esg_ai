from typing import Optional, Union
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: Union[UUID, str]
    is_active: bool = True
    is_superuser: bool = False

    @validator("id", pre=True)
    def validate_id(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

    model_config = ConfigDict(from_attributes=True)


# Full user model for internal use
class User(UserResponse):
    pass
