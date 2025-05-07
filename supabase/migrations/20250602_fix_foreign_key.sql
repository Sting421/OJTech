-- Migration to fix the foreign key constraint issue with jobs and matches tables
-- This will allow deletion of jobs by automatically deleting related matches

-- First, drop the existing constraint
ALTER TABLE IF EXISTS "matches" 
DROP CONSTRAINT IF EXISTS "matches_job_id_fkey";

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE IF EXISTS "matches"
ADD CONSTRAINT "matches_job_id_fkey" 
FOREIGN KEY ("job_id") 
REFERENCES "jobs"("id") 
ON DELETE CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraint updated with ON DELETE CASCADE for matches_job_id_fkey';
END $$; 