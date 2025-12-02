"""
Authentication helpers for Teacher & Student Platform
"""
from typing import Optional, Dict, Any
from enum import Enum
from lib.supabase_client import get_supabase_client


class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


def get_user_role(user_metadata: Optional[Dict[str, Any]]) -> UserRole:
    """
    Get user role from metadata.
    
    Args:
        user_metadata: User metadata dict from Supabase auth
        
    Returns:
        UserRole enum value
    """
    if not user_metadata:
        return UserRole.STUDENT
    
    role = user_metadata.get('role', 'student')
    
    try:
        return UserRole(role.lower())
    except ValueError:
        return UserRole.STUDENT


def is_teacher(user_metadata: Optional[Dict[str, Any]]) -> bool:
    """Check if user is a teacher."""
    return get_user_role(user_metadata) == UserRole.TEACHER


def is_admin(user_metadata: Optional[Dict[str, Any]]) -> bool:
    """Check if user is an admin."""
    return get_user_role(user_metadata) == UserRole.ADMIN


def is_student(user_metadata: Optional[Dict[str, Any]]) -> bool:
    """Check if user is a student."""
    return get_user_role(user_metadata) == UserRole.STUDENT


async def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Get user from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User dict or None
    """
    try:
        supabase = get_supabase_client()
        # Note: In production, verify JWT properly
        # For now, this is a placeholder
        # You should use Supabase's JWT verification
        return None
    except Exception as e:
        print(f"Error getting user from token: {e}")
        return None


def check_classroom_access(
    user_id: str,
    classroom_id: str,
    user_role: UserRole
) -> bool:
    """
    Check if user has access to classroom.
    
    Args:
        user_id: User ID
        classroom_id: Classroom ID
        user_role: User's role
        
    Returns:
        True if user has access
    """
    try:
        supabase = get_supabase_client()
        
        # Admins have access to all classrooms
        if user_role == UserRole.ADMIN:
            return True
        
        # Check if user is teacher of classroom
        if user_role == UserRole.TEACHER:
            result = supabase.table('classrooms').select('teacher_id').eq(
                'classroom_id', classroom_id
            ).execute()
            
            if result.data and result.data[0]['teacher_id'] == user_id:
                return True
        
        # Check if user is enrolled student
        if user_role == UserRole.STUDENT:
            result = supabase.table('student_enrollments').select('enrollment_id').eq(
                'classroom_id', classroom_id
            ).eq('student_id', user_id).execute()
            
            if result.data:
                return True
        
        return False
    except Exception as e:
        print(f"Error checking classroom access: {e}")
        return False


