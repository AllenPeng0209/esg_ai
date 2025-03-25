from typing import Optional
from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
