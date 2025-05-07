-- Add github_profile column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'github_profile') THEN
        ALTER TABLE profiles ADD COLUMN github_profile TEXT;
    END IF;
END
$$; 