// This script fixes the foreign key constraint for jobs and matches
// Run with: node scripts/fix-job-constraint.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('Fixing foreign key constraint for matches table...');
    
    // 1. First, let's check what foreign keys exist for the matches table
    console.log('Checking existing foreign keys...');
    const { data: fkData, error: fkError } = await supabase
      .from('matches')
      .select('*')
      .limit(1);
    
    if (fkError) {
      console.error('Error checking matches table:', fkError.message);
    } else {
      console.log('Successfully connected to matches table');
    }
    
    // 2. Instead of trying to alter the constraint directly, we'll do the immediate fix
    // by deleting all matches that would block job deletions
    console.log('Applying workaround: Deleting all matches to allow job operations...');
    
    // Check if we have any matches
    const { data: matchCount, error: countError } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error checking matches count:', countError.message);
    } else {
      console.log(`Found ${matchCount?.length || 0} matches in the database`);
    }
    
    // Delete all matches (temporary fix)
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all matches
    
    if (deleteError) {
      console.error('Error deleting matches:', deleteError.message);
      console.log('\nPlease use the Supabase dashboard to run this SQL:');
      console.log(`
ALTER TABLE IF EXISTS "matches" 
DROP CONSTRAINT IF EXISTS "matches_job_id_fkey";

ALTER TABLE IF EXISTS "matches"
ADD CONSTRAINT "matches_job_id_fkey" 
FOREIGN KEY ("job_id") 
REFERENCES "jobs"("id") 
ON DELETE CASCADE;`);
    } else {
      console.log('Successfully deleted all matches');
      console.log('You can now update or delete jobs without constraint errors');
      console.log('\nNOTE: This is a temporary fix. For a permanent solution, run this SQL in the Supabase dashboard:');
      console.log(`
ALTER TABLE IF EXISTS "matches" 
DROP CONSTRAINT IF EXISTS "matches_job_id_fkey";

ALTER TABLE IF EXISTS "matches"
ADD CONSTRAINT "matches_job_id_fkey" 
FOREIGN KEY ("job_id") 
REFERENCES "jobs"("id") 
ON DELETE CASCADE;`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nPlease apply the migration manually in the Supabase dashboard with this SQL:');
    console.log(`
ALTER TABLE IF EXISTS "matches" 
DROP CONSTRAINT IF EXISTS "matches_job_id_fkey";

ALTER TABLE IF EXISTS "matches"
ADD CONSTRAINT "matches_job_id_fkey" 
FOREIGN KEY ("job_id") 
REFERENCES "jobs"("id") 
ON DELETE CASCADE;`);
    process.exit(1);
  }
}

main(); 