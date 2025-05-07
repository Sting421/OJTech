-- Toggle RLS Script
-- Usage: Replace {enable|disable} with either 'ENABLE' or 'DISABLE'
-- Example: Replace ':mode' with 'ENABLE' to enable RLS on all tables
-- Example: Replace ':mode' with 'DISABLE' to disable RLS on all tables

-- Function to toggle RLS for all tables
CREATE OR REPLACE FUNCTION toggle_rls_for_all_tables(enable_rls BOOLEAN) RETURNS void AS $$
DECLARE
    tbl_record RECORD;
    action_text TEXT;
BEGIN
    -- Set the action text based on the parameter
    IF enable_rls THEN
        action_text := 'ENABLING';
    ELSE
        action_text := 'DISABLING';
    END IF;
    
    RAISE NOTICE '% RLS for all tables in public schema...', action_text;
    
    -- Loop through all tables in the public schema
    FOR tbl_record IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Skip tables that should not have RLS toggled
        IF tbl_record.tablename = 'schema_migrations' THEN
            CONTINUE;
        END IF;
        
        -- Enable or disable RLS based on the parameter
        BEGIN
            IF enable_rls THEN
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_record.tablename);
            ELSE
                EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl_record.tablename);
            END IF;
            
            RAISE NOTICE 'RLS % for table: %', 
                CASE WHEN enable_rls THEN 'enabled' ELSE 'disabled' END, 
                tbl_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to toggle RLS for table %: %', tbl_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'RLS toggle operation completed.';
END;
$$ LANGUAGE plpgsql;

-- Example usage: Enable RLS for all tables
-- SELECT toggle_rls_for_all_tables(TRUE);

-- Example usage: Disable RLS for all tables
-- SELECT toggle_rls_for_all_tables(FALSE);

-- Uncomment one of the above lines to enable or disable RLS for all tables

-- To enable RLS on all tables:
-- DO $$
-- BEGIN
--   PERFORM run_sql('toggle_rls.sql', mode => 'ENABLE');
-- END;
-- $$;

-- To disable RLS on all tables:
-- DO $$
-- BEGIN
--   PERFORM run_sql('toggle_rls.sql', mode => 'DISABLE');
-- END;
-- $$; 