-- Disable Row Level Security (RLS) on all tables for development purposes
-- WARNING: This should only be used in development environments

-- Disable RLS on cvs table
ALTER TABLE public.cvs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on student_profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_profiles') THEN
        ALTER TABLE public.student_profiles DISABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Disable RLS on skill_assessments table
ALTER TABLE public.skill_assessments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on jobs table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Disable RLS on matches table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Log that RLS has been disabled
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been disabled on all tables for development purposes';
END
$$; 