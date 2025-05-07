-- Drop skills_required column since we're using required_skills (JSONB) instead
ALTER TABLE jobs DROP COLUMN IF EXISTS skills_required;
