-- Script: check_rls_status.sql
-- Description: Checks the RLS status of tables in the database and reports enabled policies
-- Usage: Run this script in the Supabase SQL Editor to get a report of RLS status

-- First, show tables with RLS status
SELECT
    schemaname,
    tablename,
    CASE WHEN rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM
    pg_tables
WHERE
    schemaname = 'public'
ORDER BY
    tablename;

-- Then, show policies for tables that have RLS enabled
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    CASE permissive WHEN TRUE THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as policy_type,
    cmd as operation,
    qual as policy_definition,
    with_check as check_condition
FROM
    pg_policies
WHERE
    schemaname = 'public'
ORDER BY
    tablename, policyname;

-- Output a message after execution
DO $$
BEGIN
    RAISE NOTICE 'RLS status check completed.';
END $$; 