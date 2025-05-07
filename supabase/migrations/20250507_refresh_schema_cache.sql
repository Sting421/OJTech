-- Refresh schema cache
ALTER TABLE jobs DISABLE TRIGGER ALL;
ALTER TABLE jobs ENABLE TRIGGER ALL;

-- Also add preferred_skills column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'preferred_skills'
    ) THEN
        ALTER TABLE jobs ADD COLUMN preferred_skills JSONB;
    END IF;
END $$;