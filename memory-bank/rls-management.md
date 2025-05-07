# Row Level Security Management

This document outlines how Row Level Security (RLS) is managed in the OJTech application.

## Overview

Row Level Security is a feature in PostgreSQL that allows restricting access to rows in a table based on the user executing the query. In our application, we use RLS to ensure that:

1. Users can only access their own data
2. Employers can only access their own job listings
3. Administrators have full access to all data

## Development vs. Production

During development, we typically disable RLS to make testing and development easier. In production, RLS must be enabled to protect user data.

## SQL Scripts

We have created several SQL scripts to manage RLS policies:

### 1. `supabase/migrations/20240903_disable_rls_policies.sql`

This migration disables RLS on all tables for development purposes. It should NOT be used in production.

### 2. `supabase/scripts/check_rls_status.sql`

Administrators can run this script to check:
- Which tables have RLS enabled/disabled
- What policies are currently applied to tables with RLS enabled

### 3. `supabase/scripts/toggle_rls.sql`

This utility script allows toggling RLS on or off for all tables in a single operation.

Usage:
```sql
-- To enable RLS on all tables
DO $$ BEGIN PERFORM toggle_rls('ENABLE'); END $$;

-- To disable RLS on all tables
DO $$ BEGIN PERFORM toggle_rls('DISABLE'); END $$;
```

### 4. `supabase/scripts/recreate_rls_policies.sql`

This script:
1. Enables RLS on all tables (by running toggle_rls.sql)
2. Recreates all security policies for the application
3. Includes conditional logic to handle tables that may not exist in all environments

This script should be run when:
- Setting up a new production environment
- Restoring RLS after development
- After schema changes that affect security policies

## RLS Policies

The main policies implemented are:

### Profiles
- Users can view and update their own profile
- Admins can view all profiles

### CVs
- Users can view, insert, update and delete their own CVs
- Admins can manage all CVs

### Skill Assessments
- Users can view, insert, update and delete their own skill assessments
- Admins can view and manage all skill assessments

### Jobs (if table exists)
- Employers can manage their own jobs
- Students can view active jobs
- Admins can manage all jobs

### Matches (if table exists)
- Users can see matches for their CVs
- Employers can see matches for their jobs
- Admins can manage all matches

### Student Profiles (if table exists)
- Students can view and update their own profile
- Admins can view all student profiles

## Best Practices

1. **Development**: Disable RLS during development for ease of testing
2. **Production**: Always enable RLS in production environments
3. **Testing**: Test with RLS enabled before deploying to production
4. **Changes**: When adding new tables, update the recreate_rls_policies.sql script with appropriate policies
5. **Verification**: Regularly run check_rls_status.sql to verify the security configuration 