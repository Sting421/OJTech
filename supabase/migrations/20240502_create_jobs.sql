-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create jobs table
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_logo_url TEXT,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    salary_range VARCHAR(100),
    requirements TEXT[] NOT NULL,
    responsibilities TEXT[] NOT NULL,
    required_skills JSONB, -- Allow NULL in database but enforce in frontend
    employer_id UUID NOT NULL REFERENCES profiles(id),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
    application_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster searches
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company_name ON jobs(company_name);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at); 