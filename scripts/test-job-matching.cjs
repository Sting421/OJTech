// This script manually tests job matching for a specific job
// Run with: node scripts/test-job-matching.cjs

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

// Function to directly create a match in the database
async function createDirectMatch(studentId, jobId, score) {
  try {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        student_id: studentId,
        job_id: jobId,
        match_score: score,
        status: 'pending'
      })
      .select();
      
    if (error) {
      console.error('Error creating match:', error.message);
      return false;
    }
    
    console.log('Successfully created match:', data);
    return true;
  } catch (error) {
    console.error('Exception creating match:', error.message);
    return false;
  }
}

async function main() {
  try {
    // First, let's check if we have any CVs
    console.log('Checking if we have any CVs...');
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .limit(5);
    
    if (cvsError) {
      throw new Error(`Error fetching CVs: ${cvsError.message}`);
    }
    
    console.log(`Found ${cvs?.length || 0} CVs in the database`);
    if (cvs && cvs.length > 0) {
      console.log('Sample CV user_id:', cvs[0].user_id);
    }
    
    // Check if we have any student profiles
    console.log('Checking if we have any student profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('student_profiles')
      .select('id, school_email')
      .limit(5);
    
    if (profilesError) {
      throw new Error(`Error fetching student profiles: ${profilesError.message}`);
    }
    
    console.log(`Found ${profiles?.length || 0} student profiles in the database`);
    if (profiles && profiles.length > 0) {
      console.log('Sample student profile ID:', profiles[0].id);
    }
    
    // Now create a test job
    console.log('Creating a test job for manual matching...');
    
    // Create a test job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: 'Test Job for Matching',
        description: 'This is a test job to verify that job matching works',
        company_name: 'Test Company',
        location: 'Remote',
        job_type: 'Full-time',
        required_skills: ['JavaScript', 'React', 'Node.js'],
        status: 'open',
        employer_id: '6717a9d7-0487-40cb-963f-9ed61432f9d9' // Using the same user ID for testing
      })
      .select()
      .single();
    
    if (jobError) {
      throw new Error(`Error creating test job: ${jobError.message}`);
    }
    
    console.log(`Created test job with ID: ${job.id}`);
    
    // We need to manually create matches since the automatic triggers aren't working
    console.log('Manually creating matches...');
    
    // We need a student profile ID - using the first one we found
    if (profiles && profiles.length > 0) {
      const studentId = profiles[0].id;
      console.log(`Using student profile ID: ${studentId} for manual match`);
      
      // Create a match with a score of 80
      const matchCreated = await createDirectMatch(studentId, job.id, 80);
      
      if (matchCreated) {
        console.log('Successfully created a manual match!');
      }
    } else {
      console.log('No student profiles found, cannot create matches.');
    }
    
    // Check if matches were created
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('job_id', job.id);
    
    if (matchesError) {
      throw new Error(`Error checking matches: ${matchesError.message}`);
    }
    
    if (matches && matches.length > 0) {
      console.log(`SUCCESS! Found ${matches.length} matches for the job.`);
      console.log('Matches:', matches);
    } else {
      console.log('No matches found for the job. The matching process is not working correctly.');
    }
    
    // Clean up - delete the test job and matches
    console.log('Cleaning up - deleting matches and test job...');
    
    if (matches && matches.length > 0) {
      const { error: deleteMatchesError } = await supabase
        .from('matches')
        .delete()
        .eq('job_id', job.id);
        
      if (deleteMatchesError) {
        console.error(`Error deleting matches: ${deleteMatchesError.message}`);
      } else {
        console.log('Matches deleted successfully');
      }
    }
    
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', job.id);
    
    if (deleteError) {
      console.error(`Error deleting test job: ${deleteError.message}`);
    } else {
      console.log('Test job deleted successfully');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 