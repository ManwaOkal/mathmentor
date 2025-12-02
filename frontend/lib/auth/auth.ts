/**
 * Authentication helpers for Teacher & Student Platform
 */

import { UserRole, UserProfile } from './types';

/**
 * Get current user's role from Supabase auth metadata
 */
export function getUserRole(userMetadata: Record<string, any> | null): UserRole {
  if (!userMetadata) {
    return UserRole.STUDENT; // Default role
  }
  
  const role = userMetadata.role as string;
  
  switch (role) {
    case 'teacher':
      return UserRole.TEACHER;
    case 'admin':
      return UserRole.ADMIN;
    case 'student':
    default:
      return UserRole.STUDENT;
  }
}

/**
 * Check if user is a teacher
 */
export function isTeacher(userMetadata: Record<string, any> | null): boolean {
  return getUserRole(userMetadata) === UserRole.TEACHER;
}

/**
 * Check if user is an admin
 */
export function isAdmin(userMetadata: Record<string, any> | null): boolean {
  return getUserRole(userMetadata) === UserRole.ADMIN;
}

/**
 * Check if user is a student
 */
export function isStudent(userMetadata: Record<string, any> | null): boolean {
  return getUserRole(userMetadata) === UserRole.STUDENT;
}

/**
 * Get user profile from Supabase auth user
 */
export function getUserProfile(user: any): UserProfile | null {
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email || '',
    role: getUserRole(user.user_metadata),
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    avatar_url: user.user_metadata?.avatar_url,
    classroom_ids: user.user_metadata?.classroom_ids || [],
    preferences: user.user_metadata?.preferences || {}
  };
}

/**
 * Update user role in Supabase (admin only)
 */
export async function updateUserRole(
  supabase: any,
  userId: string,
  role: UserRole
): Promise<boolean> {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    });
    
    if (error) {
      console.error('Error updating user role:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

/**
 * Check if user has access to classroom
 */
export async function hasClassroomAccess(
  supabase: any,
  userId: string,
  classroomId: string
): Promise<boolean> {
  try {
    // Check if user is teacher of classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('classroom_id', classroomId)
      .single();
    
    if (classroom?.teacher_id === userId) {
      return true;
    }
    
    // Check if user is enrolled student
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('enrollment_id')
      .eq('classroom_id', classroomId)
      .eq('student_id', userId)
      .single();
    
    return !!enrollment;
  } catch (error) {
    console.error('Error checking classroom access:', error);
    return false;
  }
}






