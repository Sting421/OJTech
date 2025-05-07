-- Create function to handle student profile creation
CREATE OR REPLACE FUNCTION public.handle_student_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create student_profile for student role
  IF NEW.role = 'student' THEN
    INSERT INTO public.student_profiles (id, profile_id)
    VALUES (gen_random_uuid(), NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS on_student_profile_created ON public.profiles;
CREATE TRIGGER on_student_profile_created
  AFTER INSERT OR UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_student_profile_creation();

-- Add profile_id unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'student_profiles_profile_id_key'
  ) THEN
    ALTER TABLE public.student_profiles 
    ADD CONSTRAINT student_profiles_profile_id_key 
    UNIQUE (profile_id);
  END IF;
END $$;

-- Backfill student_profiles for existing student profiles
INSERT INTO public.student_profiles (id, profile_id)
SELECT 
  gen_random_uuid(),
  p.id
FROM public.profiles p
LEFT JOIN public.student_profiles sp ON sp.profile_id = p.id
WHERE p.role = 'student'
  AND sp.id IS NULL;
