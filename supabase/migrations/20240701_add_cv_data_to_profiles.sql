-- Add cv_data column to profiles table for storing extracted resume data
DO $$
BEGIN
    -- Add cv_data column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'cv_data') THEN
        ALTER TABLE profiles ADD COLUMN cv_data JSONB;
        
        -- Add comment explaining the purpose of this column
        COMMENT ON COLUMN profiles.cv_data IS 'Stores structured data extracted from the user''s CV including skills, education, experience, and keywords';
    END IF;
END
$$; 