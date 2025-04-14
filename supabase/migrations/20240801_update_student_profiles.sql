-- Update student_profiles table to add missing columns

DO $$
BEGIN
    -- Check and add university column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'university') THEN
        ALTER TABLE student_profiles ADD COLUMN university VARCHAR(255);
    END IF;

    -- Check and add course column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'course') THEN
        ALTER TABLE student_profiles ADD COLUMN course VARCHAR(255);
    END IF;

    -- Check and add year_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'year_level') THEN
        ALTER TABLE student_profiles ADD COLUMN year_level INTEGER CHECK (year_level >= 1 AND year_level <= 6);
    END IF;

    -- Check and add bio column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'bio') THEN
        ALTER TABLE student_profiles ADD COLUMN bio TEXT;
    END IF;

    -- Check and add github_profile column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'github_profile') THEN
        ALTER TABLE student_profiles ADD COLUMN github_profile TEXT CHECK (length(github_profile) <= 500);
    END IF;

    -- Check and add personal_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'personal_email') THEN
        ALTER TABLE student_profiles ADD COLUMN personal_email VARCHAR(255);
    END IF;

    -- Check and add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE student_profiles ADD COLUMN phone_number VARCHAR(20);
    END IF;

    -- Check and add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'country') THEN
        ALTER TABLE student_profiles ADD COLUMN country VARCHAR(100) DEFAULT 'Philippines';
    END IF;

    -- Check and add region_province column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'region_province') THEN
        ALTER TABLE student_profiles ADD COLUMN region_province VARCHAR(100);
    END IF;

    -- Check and add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'city') THEN
        ALTER TABLE student_profiles ADD COLUMN city VARCHAR(100);
    END IF;

    -- Check and add postal_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'postal_code') THEN
        ALTER TABLE student_profiles ADD COLUMN postal_code VARCHAR(20);
    END IF;

    -- Check and add street_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'street_address') THEN
        ALTER TABLE student_profiles ADD COLUMN street_address TEXT;
    END IF;

    -- Check and add cv_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'cv_url') THEN
        ALTER TABLE student_profiles ADD COLUMN cv_url TEXT CHECK (length(cv_url) <= 1000);
    END IF;

    -- Check and add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'created_at') THEN
        ALTER TABLE student_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Check and add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'student_profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE student_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Create or update the update_updated_at_column function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Drop and recreate the trigger to ensure it's the latest version
    DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
    CREATE TRIGGER update_student_profiles_updated_at
        BEFORE UPDATE ON student_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_profiles_full_name') THEN
        CREATE INDEX idx_student_profiles_full_name ON student_profiles(full_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_profiles_university') THEN
        CREATE INDEX idx_student_profiles_university ON student_profiles(university);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_profiles_school_email') THEN
        CREATE INDEX idx_student_profiles_school_email ON student_profiles(school_email);
    END IF;

    -- Enable RLS if it's not already enabled
    ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_profiles' AND policyname = 'Users can read their own profiles') THEN
        CREATE POLICY "Users can read their own profiles"
            ON student_profiles
            FOR SELECT
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_profiles' AND policyname = 'Users can update their own profiles') THEN
        CREATE POLICY "Users can update their own profiles"
            ON student_profiles
            FOR UPDATE
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_profiles' AND policyname = 'Users can insert their own profiles') THEN
        CREATE POLICY "Users can insert their own profiles"
            ON student_profiles
            FOR INSERT
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$; 