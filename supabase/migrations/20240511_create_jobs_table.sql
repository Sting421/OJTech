-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB NOT NULL,          -- Array of required skills
    preferred_skills JSONB,                  -- Array of preferred skills
    job_type TEXT NOT NULL,                  -- 'Full-time', 'Part-time', 'Internship'
    location TEXT NOT NULL,
    salary_range JSONB,                      -- { "min": number, "max": number }
    status TEXT DEFAULT 'draft',             -- 'draft', 'active', 'closed', 'filled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster searches
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
