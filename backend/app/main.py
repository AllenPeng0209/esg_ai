import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from app.api.api import api_router
from app.core.config import settings
from app.core.supabase import initialize_supabase

# Initialize Supabase client
initialize_supabase()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
def root():
    return {"message": "Welcome to ESG AI Platform API"}


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    try:
        # Test Supabase connection
        supabase = initialize_supabase()
        return {
            "status": "healthy",
            "version": "1.0.0",
            "supabase_url": settings.SUPABASE_URL,
            "database_connected": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "version": "1.0.0",
            "error": str(e),
            "database_connected": False
        }


@app.get("/api-test")
async def api_test():
    """
    Return API test page
    """
    with open(os.path.join(static_dir, "test.html"), "r", encoding="utf-8") as f:
        html_content = f.read()

    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
