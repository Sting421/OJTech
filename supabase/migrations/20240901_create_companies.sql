-- Create companies table for employers
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    website TEXT,
    industry TEXT,
    location TEXT,
    size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_employer_id ON companies(employer_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Employers can read their own company"
    ON companies
    FOR SELECT
    USING (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own company"
    ON companies
    FOR UPDATE
    USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own company"
    ON companies
    FOR INSERT
    WITH CHECK (auth.uid() = employer_id);

-- Admins can do anything with companies
CREATE POLICY "Admins can do anything with companies"
    ON companies
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Anyone can view companies
CREATE POLICY "Anyone can view companies"
    ON companies
    FOR SELECT
    USING (true); 