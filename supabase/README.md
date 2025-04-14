# Supabase Migration Instructions

This folder contains migration files that define the database schema for your OJTech application. The migrations need to be applied to your Supabase project to ensure that the database structure matches what the application expects.

## Applying Migrations

### Option 1: Using Supabase CLI (Recommended)

1. **Install the Supabase CLI** if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. **Link your local project to your Supabase project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Replace `your-project-ref` with your actual Supabase project reference ID)

3. **Push the migrations to your Supabase project**:
   ```bash
   supabase db push
   ```

### Option 2: Manual SQL Execution (Alternative)

If you can't use the Supabase CLI, you can manually apply migrations:

1. **Access the SQL Editor** in your Supabase dashboard.

2. **Execute migration files in order**:
   - Navigate to the Supabase Dashboard
   - Select your project
   - Go to the SQL Editor
   - Open each migration file in the `/supabase/migrations` folder
   - Copy the SQL from each file and execute it in the SQL Editor
   - Follow the order of the files (by date prefix)

## Latest Migration: Add cv_data Column

The latest migration `20240701_add_cv_data_to_profiles.sql` adds a JSONB column called `cv_data` to store structured data extracted from CVs.

To apply only this migration:

```sql
-- Add cv_data column to profiles table for storing extracted resume data
DO $$
BEGIN
    -- Add cv_data column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'cv_data') THEN
        ALTER TABLE profiles ADD COLUMN cv_data JSONB;
        
        -- Add comment explaining the purpose of this column
        COMMENT ON COLUMN profiles.cv_data IS 'Stores structured data extracted from the user''s CV including skills, education, experience, and keywords';
    END IF;
END
$$;
```

## Troubleshooting

If you encounter errors like "Column 'cv_data' does not exist", it means the migration hasn't been applied properly. Try the following:

1. Confirm whether the column exists:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'cv_data';
   ```

2. If it doesn't exist, apply the migration manually as described above.

3. If you're still having issues, check for any errors in the SQL Editor's logs and ensure that your Supabase role has the necessary permissions to alter tables. 