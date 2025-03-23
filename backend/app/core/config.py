import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ESG AI"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

    def validate_supabase_config(self):
        """Validate Supabase configuration"""
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is not set")
        if not self.SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is not set")
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is not set")
        if not self.SUPABASE_URL.startswith(("http://", "https://")):
            raise ValueError("Invalid SUPABASE_URL format")
        if len(self.SUPABASE_KEY) < 20:
            raise ValueError("Invalid SUPABASE_KEY format")

# Initialize settings
settings = Settings()

# Validate Supabase configuration
settings.validate_supabase_config() 