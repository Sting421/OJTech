-- Add skills column to cvs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cvs' AND column_name = 'skills') THEN
        ALTER TABLE cvs ADD COLUMN skills JSONB;
    END IF;
END
$$;

-- Create index on skills for faster search if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'cvs' AND indexname = 'idx_cvs_skills') THEN
        CREATE INDEX idx_cvs_skills ON cvs USING GIN (skills);
    END IF;
END
$$; 