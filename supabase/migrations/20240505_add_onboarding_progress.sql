-- Add onboarding_progress column to employers table
ALTER TABLE employers ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{
  "company_info": false,
  "contact_details": false,
  "company_logo": false
}'::jsonb;

-- Add a function to update onboarding_progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
  employer_id UUID,
  step TEXT,
  completed BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE employers
  SET onboarding_progress = onboarding_progress || jsonb_build_object(step, completed)
  WHERE id = employer_id;
END;
$$ LANGUAGE plpgsql;
