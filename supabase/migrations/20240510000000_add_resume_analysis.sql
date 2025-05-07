-- Add analysis_results column to store AI-generated resume analysis
ALTER TABLE IF EXISTS public.cvs
ADD COLUMN IF NOT EXISTS analysis_results JSONB;

-- Add last_analyzed_at column to track when the resume was last analyzed
ALTER TABLE IF EXISTS public.cvs
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Add comment to the table
COMMENT ON TABLE public.cvs IS 'Stores resume data, files, and AI analysis results';

-- Add comments to the columns
COMMENT ON COLUMN public.cvs.analysis_results IS 'AI-generated analysis results including suggestions, strengths, and weaknesses';
COMMENT ON COLUMN public.cvs.last_analyzed_at IS 'Timestamp of the last resume analysis'; 