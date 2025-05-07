-- Migration to backfill student profiles for any users that are missing them

-- Create student profiles for students who don't have one yet
DO $$
DECLARE
  v_profile RECORD;
  v_profile_id UUID;
BEGIN
  -- Loop through all profiles marked as students
  FOR v_profile IN (
    SELECT p.id, p.email, p.full_name 
    FROM profiles p
    LEFT JOIN student_profiles sp ON sp.profile_id = p.id
    WHERE p.role = 'student' AND sp.id IS NULL
  ) LOOP
    -- Create a new student profile
    v_profile_id := uuid_generate_v4();
    
    INSERT INTO student_profiles (
      id, 
      profile_id, 
      school_email, 
      full_name, 
      university, 
      course, 
      year_level, 
      country
    ) VALUES (
      v_profile_id,
      v_profile.id,
      v_profile.email,
      v_profile.full_name,
      '',
      '',
      1,
      'Philippines'
    );
    
    RAISE NOTICE 'Created student profile for user %', v_profile.id;
  END LOOP;
END $$; 