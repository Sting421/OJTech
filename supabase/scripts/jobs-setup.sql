-- Create jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB,
    preferred_skills JSONB,
    salary_range VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check if foreign key constraint already exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_employer_id_fkey' 
    AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs 
    ADD CONSTRAINT jobs_employer_id_fkey 
    FOREIGN KEY (employer_id) REFERENCES employers(id);
  END IF;
END
$$;

-- Update structure of existing jobs table if needed
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS required_skills JSONB,
ADD COLUMN IF NOT EXISTS preferred_skills JSONB;

-- Create function to update updated_at timestamp if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create job applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL,
    student_id UUID NOT NULL,
    cv_id UUID,
    cover_letter TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    employer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security (RLS) for development
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY; 