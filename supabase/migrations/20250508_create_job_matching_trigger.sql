-- Create function to process job matches using basic algorithm
CREATE OR REPLACE FUNCTION calculate_match_score(
    cv_skills jsonb,
    required_skills jsonb
) RETURNS integer AS $$
DECLARE
    match_count integer := 0;
    total_required integer := 0;
BEGIN
    -- Handle null cases
    IF cv_skills IS NULL OR required_skills IS NULL THEN
        RETURN 0;
    END IF;

    -- Convert skills to lowercase for case-insensitive matching
    WITH cv_skills_lower AS (
        SELECT LOWER(value::text) as skill
        FROM jsonb_array_elements(cv_skills->'skills')
    ),
    job_skills_lower AS (
        SELECT LOWER(value::text) as skill
        FROM jsonb_array_elements(required_skills)
    )
    SELECT COUNT(DISTINCT js.skill) INTO match_count
    FROM job_skills_lower js
    WHERE EXISTS (
        SELECT 1 FROM cv_skills_lower cvs
        WHERE cvs.skill LIKE '%' || js.skill || '%'
        OR js.skill LIKE '%' || cvs.skill || '%'
    );

    -- Get total required skills
    SELECT jsonb_array_length(required_skills) INTO total_required;

    -- Calculate percentage match
    IF total_required > 0 THEN
        RETURN (match_count * 100 / total_required)::integer;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to process job matches
CREATE OR REPLACE FUNCTION process_job_matches()
RETURNS TRIGGER AS $$
DECLARE
    match_score integer;
BEGIN
    IF TG_TABLE_NAME = 'cvs' THEN
        -- A new CV was added or updated
        -- Match this CV against all active jobs
        INSERT INTO matches (student_id, job_id, match_score, status)
        SELECT 
            NEW.user_id,
            j.id,
            calculate_match_score(NEW.skills, j.required_skills),
            'pending'
        FROM jobs j
        WHERE j.status = 'open'
        ON CONFLICT (student_id, job_id) 
        DO UPDATE SET 
            match_score = EXCLUDED.match_score,
            updated_at = NOW();

    ELSIF TG_TABLE_NAME = 'jobs' THEN
        -- A new job was added or updated
        -- Match this job against all active CVs
        INSERT INTO matches (student_id, job_id, match_score, status)
        SELECT 
            c.user_id,
            NEW.id,
            calculate_match_score(c.skills, NEW.required_skills),
            'pending'
        FROM cvs c
        WHERE c.id IN (
            SELECT DISTINCT ON (user_id) id
            FROM cvs
            ORDER BY user_id, created_at DESC
        )
        AND c.is_active = true
        ON CONFLICT (student_id, job_id) 
        DO UPDATE SET 
            match_score = EXCLUDED.match_score,
            updated_at = NOW();

        -- Notify the Edge Function to run AI matching
        PERFORM pg_notify(
            'run_ai_job_matching',
            json_build_object(
                'job_id', NEW.id,
                'type', 'job_update'
            )::text
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in process_job_matches: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_cv_job_matching ON cvs;
DROP TRIGGER IF EXISTS trigger_job_cv_matching ON jobs;

-- Create trigger for CV changes
CREATE TRIGGER trigger_cv_job_matching
    AFTER INSERT OR UPDATE OF skills
    ON cvs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION process_job_matches();

-- Create trigger for job changes
CREATE TRIGGER trigger_job_cv_matching
    AFTER INSERT OR UPDATE OF required_skills
    ON jobs
    FOR EACH ROW
    WHEN (NEW.status = 'open')
    EXECUTE FUNCTION process_job_matches();

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs (user_id);
CREATE INDEX IF NOT EXISTS idx_matches_scores ON matches (match_score);

-- Update all existing matches by updating all open jobs
DO $$
BEGIN
    UPDATE jobs 
    SET updated_at = NOW()
    WHERE status = 'open';
END $$;
