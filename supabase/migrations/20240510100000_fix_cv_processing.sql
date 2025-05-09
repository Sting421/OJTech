-- This migration adds CV processing status tracking to both profiles and cvs tables
-- It uses safe conditional logic to avoid errors if columns already exist

-- Step 1: Add fields to profiles table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cv_processing_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cv_processing_status text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cv_processing_error'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cv_processing_error text;
  END IF;
END $$;

-- Step 2: Add fields to cvs table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'cvs' AND column_name = 'status'
  ) THEN
    ALTER TABLE cvs ADD COLUMN status text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'cvs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE cvs ADD COLUMN error_message text;
  END IF;
END $$;

-- Step 3: Add constraints safely (dropping any existing constraints first)
DO $$ 
BEGIN
  -- Drop existing constraints if they exist
  BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cv_processing_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE cvs DROP CONSTRAINT IF EXISTS cvs_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  -- Add new constraints
  ALTER TABLE profiles 
    ADD CONSTRAINT profiles_cv_processing_status_check 
    CHECK (cv_processing_status IS NULL OR cv_processing_status IN (
      'uploading', 'parsing', 'analyzing', 'matching', 'complete', 'error',
      'uploaded', 'processing', 'completed'
    ));
  
  ALTER TABLE cvs 
    ADD CONSTRAINT cvs_status_check 
    CHECK (status IS NULL OR status IN (
      'uploading', 'parsing', 'analyzing', 'matching', 'complete', 'error',
      'uploaded', 'processing', 'completed'
    ));
END $$;

-- Step 4: Update existing records with default values
UPDATE cvs
SET status = 'completed'
WHERE status IS NULL;

-- Step 5: Create or replace the trigger function for status synchronization
CREATE OR REPLACE FUNCTION update_cv_processing_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status is not null
  IF NEW.status IS NOT NULL THEN
    -- Map CV status to profile status
    UPDATE profiles
    SET cv_processing_status = 
      CASE NEW.status
        WHEN 'uploaded' THEN 'uploading'
        WHEN 'processing' THEN 'parsing'
        WHEN 'completed' THEN 'complete'
        ELSE NEW.status
      END,
      cv_processing_error = CASE 
        WHEN NEW.status = 'error' THEN NEW.error_message 
        ELSE NULL 
      END
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the trigger if it doesn't exist
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS cv_processing_status_trigger ON cvs;
  
  -- Create the trigger
  CREATE TRIGGER cv_processing_status_trigger
  AFTER INSERT OR UPDATE ON cvs
  FOR EACH ROW
  EXECUTE FUNCTION update_cv_processing_status();
END $$; 