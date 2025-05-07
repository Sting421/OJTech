-- Fix for job matching - creating missing student profiles for users with CVs
-- This script will create student profiles for users who have CVs but don't have student profiles

-- First, let's check if a specific user profile exists, otherwise create it
DO $$
DECLARE
  v_user_id UUID := '6717a9d7-0487-40cb-963f-9ed61432f9d9';
  v_email TEXT;
  v_full_name TEXT;
  v_exists BOOLEAN;
  v_profile_id UUID;
BEGIN
  -- Check if user has a student profile already
  SELECT EXISTS(SELECT 1 FROM student_profiles WHERE profile_id = v_user_id) INTO v_exists;
  
  IF NOT v_exists THEN
    -- Get user profile details
    SELECT email, full_name INTO v_email, v_full_name 
    FROM profiles WHERE id = v_user_id;
    
    IF v_email IS NOT NULL THEN
      -- Create a new student profile
      v_profile_id := uuid_generate_v4();
      
      INSERT INTO student_profiles (
        id, 
        profile_id, 
        full_name, 
        school_email, 
        university, 
        course, 
        year_level, 
        country
      ) VALUES (
        v_profile_id,
        v_user_id,
        v_full_name,
        v_email,
        'Cebu Institute of Technology - University',
        'Information Technology',
        4,
        'Philippines'
      );
      
      RAISE NOTICE 'Created student profile for user %', v_user_id;
    ELSE
      RAISE NOTICE 'User profile not found for ID %', v_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Student profile already exists for user %', v_user_id;
  END IF;
END $$;

-- Now let's handle all other users with CVs but without student profiles
DO $$
DECLARE
  v_cv RECORD;
  v_profile RECORD;
  v_profile_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Loop through all CVs
  FOR v_cv IN (SELECT DISTINCT user_id FROM cvs WHERE user_id IS NOT NULL) LOOP
    -- Check if user has a student profile already
    SELECT EXISTS(SELECT 1 FROM student_profiles WHERE profile_id = v_cv.user_id) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Get user profile details
      SELECT id, email, full_name INTO v_profile
      FROM profiles WHERE id = v_cv.user_id;
      
      IF v_profile.email IS NOT NULL THEN
        -- Create a new student profile
        v_profile_id := uuid_generate_v4();
        
        INSERT INTO student_profiles (
          id, 
          profile_id, 
          full_name, 
          school_email, 
          university, 
          course, 
          year_level, 
          country
        ) VALUES (
          v_profile_id,
          v_cv.user_id,
          v_profile.full_name,
          v_profile.email,
          'University', -- Default value
          'Course',     -- Default value
          4,            -- Default to senior year
          'Philippines'
        );
        
        RAISE NOTICE 'Created student profile for user %', v_cv.user_id;
      ELSE
        RAISE NOTICE 'User profile not found for ID %', v_cv.user_id;
      END IF;
    ELSE
      RAISE NOTICE 'Student profile already exists for user %', v_cv.user_id;
    END IF;
  END LOOP;
END $$; 