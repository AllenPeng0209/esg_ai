from supabase import create_client, Client
from app.core.config import settings


def validate_supabase_config():
    """
    Validate Supabase configuration
    """
    if not settings.SUPABASE_URL:
        raise ValueError("Missing Supabase URL configuration")
    if not settings.SUPABASE_KEY:
        raise ValueError("Missing Supabase anon key configuration")
    if not settings.SUPABASE_URL.startswith(("http://", "https://")):
        raise ValueError("Invalid Supabase URL format")
    if len(settings.SUPABASE_KEY) < 20:  # Basic validation for key format
        raise ValueError("Invalid Supabase anon key format")


def get_supabase_client() -> Client:
    """
    Get a configured Supabase client.
    For admin operations, use service_role_key instead of anon key.
    """
    validate_supabase_config()
    try:
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
        )
    except Exception as e:
        raise ValueError(f"Failed to create Supabase client: {str(e)}")


def get_supabase_admin_client() -> Client:
    """
    Get a Supabase client with admin privileges using service role key.
    Only use this for admin operations that require elevated privileges.
    """
    validate_supabase_config()
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing Supabase service role key configuration")
    if len(settings.SUPABASE_SERVICE_ROLE_KEY) < 20:
        raise ValueError("Invalid Supabase service role key format")

    try:
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    except Exception as e:
        raise ValueError(f"Failed to create Supabase admin client: {str(e)}")


# Initialize client lazily to allow configuration to be loaded first
supabase = None


def initialize_supabase():
    """
    Initialize the default Supabase client.
    Call this after all configurations are loaded.
    """
    global supabase
    try:
        if supabase is None:
            supabase = get_supabase_client()
        return supabase
    except Exception as e:
        raise ValueError(f"Failed to initialize Supabase: {str(e)}")
