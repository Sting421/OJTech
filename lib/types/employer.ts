import { Profile } from './database';

export interface Employer {
  id: string;
  name: string;
  industry: string;
  verified: boolean;
  created_at: string;
  updated_at?: string;
  verification_date?: string;
  company_size: string; // Added
  company_website?: string; // Added
  company_description: string; // Added
  company_logo_url?: string; // Added
  company_address: string; // Added
  contact_person: string; // Added
  position: string; // Added
  contact_email: string; // Added
  contact_phone?: string; // Added
  onboarding_progress?: {
    company_info: boolean;
    contact_details: boolean;
    company_logo: boolean;
  };
  // Make profile optional as it's not always fetched with the employer data
  profile?: {
    id: string;
    full_name: string;
    email: string;
  } | Profile;
  job_count?: number; // Add job_count property
}

// EmployerWithProfile should include all Employer fields plus the full Profile type
export interface EmployerWithProfile extends Employer {
  profile?: Profile;
}

// Type for the data returned by getAllEmployers in admin actions
export interface EmployerListItem {
  id: string;
  name: string; // Renamed from company_name in the action
  industry: string;
  verified: boolean;
  created_at: string;
  updated_at?: string;
  verification_date?: string;
  profile?: { // Profile subset included in the action
    id: string;
    email: string;
    full_name: string;
  };
  job_count: number; // Job count is included
}

export type JobStatus = "open" | "closed" | "draft";

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  required_skills: string[];
  preferred_skills?: string[];
  min_salary?: number;
  max_salary?: number;
  company_id: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
  application_deadline?: string;
  application_count?: number; // Add application count property
  company_name?: string; // Add company name property
}

export interface JobWithEmployer {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  required_skills: string[];
  preferred_skills?: string[];
  salary_range?: { min: number; max: number };
  company_id: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
  application_deadline?: string;
  company?: {
    name: string;
    logo_url?: string;
  };
}

export interface ApplicationStatus {
  pending: 'pending';
  reviewed: 'reviewed';
  shortlisted: 'shortlisted';
  rejected: 'rejected';
}

export interface JobApplication {
  id: string;
  job_id: string;
  student_id: string;
  cv_id: string;
  cover_letter?: string;
  status: keyof ApplicationStatus;
  employer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JobApplicationWithRelations extends JobApplication {
  job?: Job;
  student?: Profile;
}

// Input types for create/update operations
export interface CreateEmployerInput {
  profile_id: string;
  company_name: string;
  company_size: string;
  industry: string;
  company_website?: string;
  company_description?: string;
  company_logo_url?: string;
  company_address: string;
  contact_person: string;
  position: string;
  contact_email: string;
  contact_phone?: string;
}

export interface UpdateEmployerInput {
  company_name?: string;
  company_size?: string;
  industry?: string;
  company_website?: string;
  company_description?: string;
  company_logo_url?: string;
  company_address?: string;
  contact_person?: string;
  position?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateJobInput {
  title: string;
  description: string;
  location: string;
  job_type: string;
  required_skills: string[];
  preferred_skills?: string[];
  salary_range?: { min: number; max: number };
  status?: JobStatus;
  application_deadline?: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  location?: string;
  job_type?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  salary_range?: { min: number; max: number };
  status?: JobStatus;
  application_deadline?: string;
}
