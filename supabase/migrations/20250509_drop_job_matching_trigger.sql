-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_cv_job_matching ON cvs;
DROP TRIGGER IF EXISTS trigger_job_cv_matching ON jobs;

-- Drop functions
DROP FUNCTION IF EXISTS process_job_matches();
DROP FUNCTION IF EXISTS calculate_match_score(jsonb, jsonb);

-- Drop indexes
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_cvs_user_id;
DROP INDEX IF EXISTS idx_matches_scores;

-- Delete existing matches (optional - comment out if you want to keep match history)
-- TRUNCATE matches;
