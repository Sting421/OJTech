-- Allow required_skills to be NULL in database but enforce in frontend
ALTER TABLE jobs ALTER COLUMN required_skills DROP NOT NULL;

-- Ensure company_name is still NOT NULL
ALTER TABLE jobs ALTER COLUMN company_name SET NOT NULL;