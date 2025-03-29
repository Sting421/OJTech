-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create student profiles table
CREATE TABLE student_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    photo_url TEXT CHECK (length(photo_url) <= 1000),
    full_name VARCHAR(255) NOT NULL,
    university VARCHAR(255) NOT NULL,
    course VARCHAR(255) NOT NULL,
    year_level INTEGER CHECK (year_level >= 1 AND year_level <= 6),
    bio TEXT,
    github_profile TEXT CHECK (length(github_profile) <= 500),
    school_email VARCHAR(255) UNIQUE NOT NULL,
    personal_email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    region_province VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    street_address TEXT,
    cv_url TEXT CHECK (length(cv_url) <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster searches
CREATE INDEX idx_student_profiles_full_name ON student_profiles(full_name);
CREATE INDEX idx_student_profiles_university ON student_profiles(university);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to read student profiles
CREATE POLICY "Allow public read access" ON student_profiles
    FOR SELECT USING (true);

-- Allow authenticated users to create their own profile
CREATE POLICY "Allow authenticated users to create their profile" ON student_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = school_email -- Assuming school_email matches auth.uid
    );

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON student_profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = school_email
    )
    WITH CHECK (
        auth.uid()::text = school_email
    );
