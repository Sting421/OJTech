# OJTech

OJTech is a platform that connects students with on-the-job training opportunities.

## Database Schema

The database schema consists of the following tables:

### `profiles`
- Stores user profiles with basic information
- Links to Supabase Auth for authentication
- Includes fields for email, full name, role, and avatar URL

### `cvs`
- Stores CV (resume) information for students
- Links to a user profile via `user_id`
- Includes the file URL and extracted skills (as JSONB)

### `jobs`
- Stores job listings posted by employers
- Links to an employer profile via `employer_id`
- Includes job title, description, and required skills (as JSONB)

### `matches`
- Stores matches between CVs and jobs with a match score
- Used for AI-based recommendation system
- Links to both CVs and jobs via foreign keys

## Migration Process

The database migrations are located in `supabase/migrations/` and should be run in the following order:

1. `20240502_create_user_role_enum.sql` - Creates the user role enum type and trigger
2. `20240502_create_profiles.sql` - Creates the profiles table
3. `20240502_create_cvs.sql` - Creates the CVs table
4. `20240502_create_jobs.sql` - Creates the jobs table
5. `20240502_create_matches.sql` - Creates the matches table

The `order` directory contains files that specify the correct execution order for the migrations.

## Running Migrations

To run the migrations:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Start Supabase local development
supabase start

# Apply migrations
supabase db reset
```

## API Actions

Server actions for interacting with the database are located in:

- `lib/actions/profile.ts` - Profile-related operations
- `lib/actions/cv.ts` - CV-related operations
- `lib/actions/jobs.ts` - Job-related operations
- `lib/actions/matches.ts` - Match-related operations

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CLOUDINARY_URL=your_cloudinary_url
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
``` 