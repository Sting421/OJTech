export type UserRole = "student" | "employer" | "admin";

export interface Profile {
  id: string;
  updated_at: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  github_profile: string | null;
  has_completed_onboarding?: boolean;
  has_uploaded_cv?: boolean;
  cv_data?: Record<string, any> | null;
}

export interface CV {
  id: string;
  user_id: string;
  file_url: string;
  skills: Record<string, any> | null;
  upload_date: string;
  created_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  required_skills: Record<string, any> | null;
  created_at: string;
  is_active: boolean;
}

export interface Match {
  id: string;
  cv_id: string;
  job_id: string;
  match_score: number;
  created_at: string;
}

// Type for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
} 