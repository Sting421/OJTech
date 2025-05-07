-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cvs table
CREATE TABLE cvs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    file_url TEXT NOT NULL,
    extracted_skills JSONB,
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
CREATE TRIGGER update_cvs_updated_at
    BEFORE UPDATE ON cvs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster searches
CREATE INDEX idx_cvs_user_id ON cvs(user_id);
CREATE INDEX idx_cvs_extracted_skills ON cvs USING GIN (extracted_skills); 