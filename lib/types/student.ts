export interface StudentProfile {
  id: string;
  photo_url: string | null;
  full_name: string;
  university: string;
  course: string;
  year_level: number;
  bio: string | null;
  github_profile: string | null;
  school_email: string;
  personal_email: string | null;
  phone_number: string | null;
  country: string;
  region_province: string | null;
  city: string | null;
  postal_code: string | null;
  street_address: string | null;
  cv_url: string | null;
  created_at: string;
  updated_at: string;
}
