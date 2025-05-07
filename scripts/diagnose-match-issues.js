// Script to diagnose issues with job matching
// Usage: node scripts/diagnose-match-issues.js
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseMatchIssues() {
  console.log('---- JOB MATCHING DIAGNOSTICS ----');
  let missingProfiles = []; // Define this at the top level

  try {
    // 1. Check the student_profiles table exists
    console.log('\n1. Checking student_profiles table:');
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('student_profiles')
      .select('id, school_email')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching student profiles:', profilesError.message);
      // Check if the table doesn't exist
      if (profilesError.message.includes('does not exist')) {
        console.error('The student_profiles table appears to not exist in the database.');
      }
    } else {
      console.log(`Found ${studentProfiles.length} student profiles (showing first 5):`);
      // Show the column names for the first profile to see structure
      if (studentProfiles.length > 0) {
        console.log('Student profile example:');
        console.log(studentProfiles[0]);
      }
    }

    // 2. Get column names dynamically
    console.log('\n2. Checking student_profiles columns:');
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select()
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const columnNames = Object.keys(data[0]);
        console.log('Available columns:', columnNames.join(', '));
      } else {
        console.log('No data found in student_profiles to determine columns');
      }
    } catch (err) {
      console.error('Error determining columns:', err.message);
    }

    // 3. Check user accounts with CVs but no matching student profiles
    console.log('\n3. Checking users with CVs but no matching student profiles:');
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id')
      .limit(20);

    if (cvsError) {
      console.error('Error fetching CVs:', cvsError.message);
    } else if (cvs.length === 0) {
      console.log('No CVs found in the database.');
    } else {
      console.log(`Found ${cvs.length} CVs`);
      
      missingProfiles = []; // Reset the array
      for (const cv of cvs) {
        // Try direct lookup using id - no longer using profile_id since it doesn't exist
        const { data: directProfile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('id', cv.user_id)  // Try direct ID match
          .maybeSingle();
          
        if (!directProfile) {
          // Try via email lookup
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', cv.user_id)
            .maybeSingle();
            
          if (userProfile?.email) {
            const { data: emailProfile } = await supabase
              .from('student_profiles')
              .select('id')
              .eq('school_email', userProfile.email)
              .maybeSingle();
              
            if (!emailProfile) {
              missingProfiles.push({
                userId: cv.user_id,
                cvId: cv.id,
                email: userProfile.email
              });
            }
          } else {
            missingProfiles.push({
              userId: cv.user_id,
              cvId: cv.id,
              email: null
            });
          }
        }
      }
      
      if (missingProfiles.length > 0) {
        console.log(`Found ${missingProfiles.length} users with CVs but no matching student profiles:`);
        missingProfiles.forEach(missing => {
          console.log(`- User ID: ${missing.userId}, CV ID: ${missing.cvId}, Email: ${missing.email || 'Not found'}`);
        });
      } else {
        console.log('All users with CVs have matching student profiles.');
      }
    }

    // 4. Check unmatched jobs
    console.log('\n4. Checking for unmatched jobs:');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError.message);
    } else {
      console.log(`Found ${jobs.length} recent jobs`);
      
      for (const job of jobs) {
        const { count } = await supabase
          .from('matches')
          .select('id', { count: 'exact' })
          .eq('job_id', job.id);
          
        console.log(`- Job: ${job.title} (${job.id}), Created: ${job.created_at}, Matches: ${count}`);
      }
    }

    // 5. Test creating a student profile if needed
    const userWithMissingProfile = missingProfiles.length > 0 ? missingProfiles[0] : null;
    if (userWithMissingProfile) {
      console.log('\n5. Would you like to create a missing student profile for testing?');
      console.log(`User ID: ${userWithMissingProfile.userId}, Email: ${userWithMissingProfile.email || 'Unknown'}`);
      console.log('Run the following command to create a profile:');
      
      console.log(`node scripts/create-student-profile.js ${userWithMissingProfile.userId} ${userWithMissingProfile.email || 'user@example.com'}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Execute the function and handle any errors
diagnoseMatchIssues().catch(console.error); 