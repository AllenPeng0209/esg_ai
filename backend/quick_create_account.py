from passlib.context import CryptContext
from sqlalchemy import create_engine, text

from app.core.supabase import get_supabase_client
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# 創建數據庫連接
engine = create_engine(settings.DATABASE_URL)

# 準備用戶數據
hashed_password = get_password_hash("password123")

# SQL 插入語句
sql = text(
    """
    INSERT INTO users (
        email, username, hashed_password, is_active,
        full_name, company, is_superuser
    ) VALUES (
        :email, :username, :hashed_password, :is_active,
        :full_name, :company, :is_superuser
    )
"""
)

try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(
                sql,
                {
                    "email": "test@example.com",
                    "username": "test",
                    "hashed_password": hashed_password,
                    "is_active": True,
                    "full_name": "Test User",
                    "company": "Test Company",
                    "is_superuser": True,
                },
            )
        print("測試用戶創建成功！")
except Exception as e:
    print(f"創建用戶時發生錯誤: {str(e)}")
