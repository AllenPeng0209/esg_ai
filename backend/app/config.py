from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv

load_dotenv()  # 加载 .env 文件

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ESG AI Platform"
    
    # 数据库
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/esg_ai")
    
    # 安全
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    
    # OpenAI
    OPENAI_API_KEY: str = "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"
    DEEPSEEK_API_KEY: str = "sk-79d506b1919f4fdb9a1009a2962dccda"  # 请替换为您的
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        case_sensitive = True

settings = Settings() 