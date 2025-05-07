-- Enable version control for CVs
-- This migration adds versioning capabilities to CV records

-- Add version column to track CV versions
ALTER TABLE IF EXISTS public.cvs
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Add is_active column to identify the currently active CV version
ALTER TABLE IF EXISTS public.cvs
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create an index for faster queries on active versions
CREATE INDEX IF NOT EXISTS idx_cvs_is_active ON cvs(user_id, is_active);

-- Add comments for documentation
COMMENT ON COLUMN public.cvs.version IS 'Version number of the CV, increments with each new upload for the same user';
COMMENT ON COLUMN public.cvs.is_active IS 'Whether this CV version is the currently active one. Only one CV per user should be active';

-- Create a function to ensure only one active CV per user
CREATE OR REPLACE FUNCTION ensure_single_active_cv()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated CV is active, deactivate all other CVs for this user
    IF NEW.is_active = TRUE THEN
        UPDATE cvs
        SET is_active = FALSE
        WHERE user_id = NEW.user_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to maintain active CV consistency
DROP TRIGGER IF EXISTS trg_ensure_single_active_cv ON cvs;
CREATE TRIGGER trg_ensure_single_active_cv
BEFORE INSERT OR UPDATE OF is_active ON cvs
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_cv();

-- Function to generate the next version number for a user's CV
CREATE OR REPLACE FUNCTION get_next_cv_version(user_id_param UUID)
RETURNS INT AS $$
DECLARE
    next_version INT;
BEGIN
    -- Get the highest version number for this user and add 1
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM cvs
    WHERE user_id = user_id_param;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql; 