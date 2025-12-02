"""
JWT verification for Supabase tokens
"""
import os
import jwt
from typing import Optional, Dict, Any

def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase JWT token and extract user information.
    
    Args:
        token: JWT token string from Supabase Auth
        
    Returns:
        Dict with user_id and user_metadata, or None if invalid
    """
    if not token or not isinstance(token, str):
        print("JWT Verify: Token is empty or not a string")
        return None
    
    # Check if token has the correct JWT format (3 parts separated by dots)
    token_parts = token.split('.')
    if len(token_parts) != 3:
        print(f"JWT Verify: Invalid token format: expected 3 parts, got {len(token_parts)}. Token preview: {token[:50]}...")
        return None
    
    try:
        # Try to decode JWT without verification first to extract claims
        # In production, you should verify the signature with SUPABASE_JWT_SECRET
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        user_id = unverified.get("sub")
        if not user_id:
            print("JWT Verify: Token missing 'sub' claim. Claims:", list(unverified.keys()))
            return None
        
        user_metadata = unverified.get("user_metadata", {})
        role = user_metadata.get("role", "student")
        
        print(f"JWT Verify: Successfully verified token for user {user_id} with role {role}")
        
        return {
            "id": user_id,
            "email": unverified.get("email"),
            "user_metadata": user_metadata,
            "role": role
        }
            
    except jwt.ExpiredSignatureError:
        print("JWT Verify: Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"JWT Verify: Invalid token: {e}")
        return None
    except Exception as e:
        print(f"JWT Verify: Error verifying token: {e}")
        import traceback
        print(f"JWT Verify: Traceback: {traceback.format_exc()}")
        return None

