"""
Supabase client configuration for Python backend
"""
import os
from supabase import create_client, Client
from typing import Optional

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    
    Uses service role key for backend operations (bypasses RLS).
    For user-facing operations, use the anon key instead.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
        )
    
    return create_client(supabase_url, supabase_key)


def get_supabase_anon_client() -> Client:
    """
    Create and return a Supabase client with anon key.
    
    Use this for client-side operations that respect RLS policies.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables"
        )
    
    return create_client(supabase_url, supabase_key)

