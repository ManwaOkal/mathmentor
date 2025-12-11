/**
 * Authentication and user role types for Teacher & Student Platform
 */

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  classroom_ids?: string[];
  preferences?: {
    learning_style?: string;
    difficulty_preference?: string;
    notification_settings?: any;
  };
}

export interface Classroom {
  classroom_id: string;
  teacher_id: string;
  name: string;
  description?: string;
  join_code: string;
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  enrollment_id: string;
  classroom_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface TeacherDocument {
  document_id: string;
  teacher_id: string;
  classroom_id?: string;
  title: string;
  description?: string;
  filename?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
  status: 'processing' | 'ready' | 'failed';
  metadata?: Record<string, any>;
}

export interface LearningActivity {
  activity_id: string;
  document_id?: string;
  teacher_id: string;
  title: string;
  description?: string;
  activity_type: 'quiz' | 'qna' | 'interactive' | 'reflection';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time_minutes?: number;
  learning_objectives?: string[];
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StudentActivity {
  student_activity_id: string;
  activity_id: string;
  student_id: string;
  document_id?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'graded';
  started_at?: string;
  completed_at?: string;
  total_questions?: number;
  correct_answers?: number;
  score?: number;
  assessment?: 'pass' | 'fail' | 'needs_review';
  feedback?: string;
  responses?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ActivityQuestion {
  question_id: string;
  activity_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false' | 'explanation';
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  points?: number;
  context_chunk_ids?: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface StudentResponse {
  response_id: string;
  student_activity_id: string;
  question_id: string;
  student_answer?: string;
  is_correct?: boolean;
  confidence_score?: number;
  feedback?: string;
  corrected_answer?: string;
  metadata?: Record<string, any>;
  responded_at: string;
}

export interface ClassroomAnalytics {
  analytics_id: string;
  teacher_id: string;
  classroom_id?: string;
  date: string;
  total_students?: number;
  active_students?: number;
  total_activities_assigned?: number;
  completed_activities?: number;
  average_score?: number;
  struggling_concepts?: string[];
  top_performers?: Record<string, any>;
  insights?: string;
  created_at: string;
}

export interface StudentProgressSnapshot {
  snapshot_id: string;
  student_id: string;
  document_id?: string;
  activity_id?: string;
  overall_understanding_score?: number;
  concept_breakdown?: Record<string, number>;
  ai_assessment?: string;
  recommendations?: string[];
  captured_at: string;
}








