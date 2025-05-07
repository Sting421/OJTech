-- Create employers table
CREATE TABLE IF NOT EXISTS employers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- Link to auth profile
    company_name TEXT NOT NULL,
    company_size TEXT NOT NULL,               -- e.g., '1-10', '11-50', '51-200', etc.
    industry TEXT NOT NULL,
    company_website TEXT,
    company_description TEXT,
    company_logo_url TEXT,
    company_address TEXT NOT NULL,
    contact_person TEXT NOT NULL,             -- Name of primary contact
    position TEXT NOT NULL,                   -- Position of contact person
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    verified BOOLEAN DEFAULT false,           -- Set to true by admin
    verification_date TIMESTAMP WITH TIME ZONE,
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
CREATE TRIGGER update_employers_updated_at
    BEFORE UPDATE ON employers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster searches
CREATE INDEX idx_employers_profile_id ON employers(profile_id);
CREATE INDEX idx_employers_company_name ON employers(company_name);
CREATE INDEX idx_employers_industry ON employers(industry);
CREATE INDEX idx_employers_verified ON employers(verified);
