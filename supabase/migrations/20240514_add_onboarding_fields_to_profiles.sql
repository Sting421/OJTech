-- Add onboarding tracking columns to profiles table
DO $$
BEGIN
    -- Add github_profile column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'github_profile') THEN
        ALTER TABLE profiles ADD COLUMN github_profile TEXT;
    END IF;

    -- Add has_completed_onboarding column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding') THEN
        ALTER TABLE profiles ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add has_uploaded_cv column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'has_uploaded_cv') THEN
        ALTER TABLE profiles ADD COLUMN has_uploaded_cv BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Create a trigger to ensure onboarding flags consistency
    DROP TRIGGER IF EXISTS ensure_onboarding_consistency ON profiles;
    
    -- Create the trigger function if it doesn't exist
    CREATE OR REPLACE FUNCTION ensure_onboarding_consistency_fn()
    RETURNS TRIGGER AS $$
    BEGIN
        -- If CV is uploaded, ensure onboarding is marked as complete
        IF NEW.has_uploaded_cv = TRUE AND NEW.has_completed_onboarding = FALSE THEN
            NEW.has_completed_onboarding := TRUE;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create the trigger
    CREATE TRIGGER ensure_onboarding_consistency
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_onboarding_consistency_fn();
    
    -- Fix any existing inconsistencies
    UPDATE profiles 
    SET has_completed_onboarding = TRUE 
    WHERE has_uploaded_cv = TRUE AND has_completed_onboarding = FALSE;
END
$$; 