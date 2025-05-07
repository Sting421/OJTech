import { JobStatus } from './employer';

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
  version?: number;
  is_active?: boolean;
  analysis_results?: Record<string, any> | null;
  last_analyzed_at?: string;
  updated_at?: string;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  required_skills: string[];
  preferred_skills: Record<string, any> | null;
  application_deadline: string | null;
  created_at: string;
  updated_at: string | null;
  status: JobStatus;
  company_name?: string | null; // Added as it's used in opportunities page
}

export interface Match {
  id: string;
  cv_id: string;
  job_id: string;
  match_score: number;
  created_at: string;
}

export interface SkillAssessment {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency_level: number; // 1-5: Beginner, Elementary, Intermediate, Advanced, Expert
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Type for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}
