from fastapi import APIRouter, HTTPException
from app.core.supabase import get_supabase_client

router = APIRouter()

@router.get("/test-supabase")
async def test_supabase_connection():
    """
    Test endpoint to verify Supabase connection.
    Returns the Supabase client version and connection status.
    """
    try:
        supabase = get_supabase_client()
        # Try to fetch a simple query to test the connection
        result = await supabase.rpc('version').execute()
        return {
            "status": "success",
            "message": "Successfully connected to Supabase",
            "version": result.data if result.data else "Unknown"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Supabase: {str(e)}"
        ) 