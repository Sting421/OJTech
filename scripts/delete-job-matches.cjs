// This script deletes all matches for a specific job
// Run with: node scripts/delete-job-matches.cjs <job_id>

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
    // Get job ID from command line argument
    const jobId = process.argv[2];
    
    if (!jobId) {
      console.error('Please provide a job ID as command line argument');
      console.error('Usage: node scripts/delete-job-matches.cjs <job_id>');
      process.exit(1);
    }
    
    console.log(`Deleting matches for job ID: ${jobId}`);
    
    // Find all matches for this job
    const { data: matches, error: fetchError } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId);
    
    if (fetchError) {
      throw new Error(`Error fetching matches: ${fetchError.message}`);
    }
    
    console.log(`Found ${matches.length} matches to delete`);
    
    if (matches.length === 0) {
      console.log('No matches to delete, job can be updated or deleted safely');
      return;
    }
    
    // Delete all matches for this job
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('job_id', jobId);
    
    if (deleteError) {
      throw new Error(`Error deleting matches: ${deleteError.message}`);
    }
    
    console.log(`Successfully deleted ${matches.length} matches for job ID: ${jobId}`);
    console.log('You can now update or delete this job');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 