-- Recreate all RLS policies for the OJTech application
-- This script enables RLS and recreates all security policies for production use
-- WARNING: This will overwrite any existing policies!

-- First, enable RLS on all tables
\i toggle_rls.sql

-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Only administrators can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- CVs table policies
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own CVs" ON public.cvs;
CREATE POLICY "Users can view own CVs"
ON public.cvs
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own CVs" ON public.cvs;
CREATE POLICY "Users can insert own CVs"
ON public.cvs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own CVs" ON public.cvs;
CREATE POLICY "Users can update own CVs"
ON public.cvs
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own CVs" ON public.cvs;
CREATE POLICY "Users can delete own CVs"
ON public.cvs
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all CVs
DROP POLICY IF EXISTS "Admins can manage all CVs" ON public.cvs;
CREATE POLICY "Admins can manage all CVs"
ON public.cvs
FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Skill assessments table policies
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own skill assessments" ON public.skill_assessments;
CREATE POLICY "Users can view own skill assessments"
ON public.skill_assessments
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own skill assessments" ON public.skill_assessments;
CREATE POLICY "Users can insert own skill assessments"
ON public.skill_assessments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own skill assessments" ON public.skill_assessments;
CREATE POLICY "Users can update own skill assessments"
ON public.skill_assessments
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own skill assessments" ON public.skill_assessments;
CREATE POLICY "Users can delete own skill assessments"
ON public.skill_assessments
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all skill assessments" ON public.skill_assessments;
CREATE POLICY "Admins can view all skill assessments"
ON public.skill_assessments
FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all skill assessments" ON public.skill_assessments;
CREATE POLICY "Admins can manage all skill assessments"
ON public.skill_assessments
FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Jobs table policies (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Employers can manage own jobs" ON public.jobs;
        EXECUTE format('
        CREATE POLICY "Employers can manage own jobs"
        ON public.jobs
        FOR ALL
        USING (auth.uid() = employer_id)
        ');
        
        DROP POLICY IF EXISTS "Students can view active jobs" ON public.jobs;
        EXECUTE format('
        CREATE POLICY "Students can view active jobs"
        ON public.jobs
        FOR SELECT
        USING (is_active = true)
        ');
        
        DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
        EXECUTE format('
        CREATE POLICY "Admins can manage all jobs"
        ON public.jobs
        FOR ALL
        USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')
        ');
    END IF;
END
$$;

-- Matches table policies (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can see matches for their CVs" ON public.matches;
        EXECUTE format('
        CREATE POLICY "Users can see matches for their CVs"
        ON public.matches
        FOR SELECT
        USING (
            cv_id IN (
                SELECT id FROM cvs WHERE user_id = auth.uid()
            )
        )
        ');
        
        DROP POLICY IF EXISTS "Employers can see matches for their jobs" ON public.matches;
        EXECUTE format('
        CREATE POLICY "Employers can see matches for their jobs"
        ON public.matches
        FOR SELECT
        USING (
            job_id IN (
                SELECT id FROM jobs WHERE employer_id = auth.uid()
            )
        )
        ');
        
        DROP POLICY IF EXISTS "Admins can manage all matches" ON public.matches;
        EXECUTE format('
        CREATE POLICY "Admins can manage all matches"
        ON public.matches
        FOR ALL
        USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')
        ');
    END IF;
END
$$;

-- Student profiles table policies (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_profiles') THEN
        ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
        EXECUTE format('
        CREATE POLICY "Students can view own profile"
        ON public.student_profiles
        FOR SELECT
        USING (auth.uid() = id)
        ');
        
        DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
        EXECUTE format('
        CREATE POLICY "Students can update own profile"
        ON public.student_profiles
        FOR UPDATE
        USING (auth.uid() = id)
        ');
        
        DROP POLICY IF EXISTS "Admins can view all student profiles" ON public.student_profiles;
        EXECUTE format('
        CREATE POLICY "Admins can view all student profiles"
        ON public.student_profiles
        FOR SELECT
        USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')
        ');
    END IF;
END
$$;

-- Log completion message
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been recreated for all tables';
END
$$; 