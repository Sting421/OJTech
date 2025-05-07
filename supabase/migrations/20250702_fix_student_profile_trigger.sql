-- Migration to ensure the student profile creation trigger is working correctly

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_student_profile_created ON public.profiles;

-- Create or replace the function to handle student profile creation
CREATE OR REPLACE FUNCTION public.handle_student_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create student_profile for student role
  IF NEW.role = 'student' THEN
    -- Check if a student profile already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.student_profiles 
      WHERE profile_id = NEW.id
    ) THEN
      -- Create new student profile
      INSERT INTO public.student_profiles (
        id, 
        profile_id, 
        school_email,
        full_name,
        university,
        course,
        year_level,
        country
      )
      VALUES (
        gen_random_uuid(), 
        NEW.id,
        NEW.email,
        NEW.full_name,
        '',
        '',
        1,
        'Philippines'
      );
      
      RAISE NOTICE 'Created student profile for user %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new or updated profiles
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