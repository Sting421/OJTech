-- Remove automatic profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Update the check constraint on profiles table to ensure valid email format
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_email_check,
ADD CONSTRAINT profiles_email_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$');
