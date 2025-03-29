from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opensearch.api import router as opensearch_router

app = FastAPI(title="ESG AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(opensearch_router, prefix="/api/opensearch", tags=["opensearch"])


@app.get("/")
async def root():
    return {"message": "Welcome to ESG AI API"}
