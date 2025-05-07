// This script runs a direct SQL query to create a student profile for the specific user
// Run with: node scripts/run-fix-profile-query.cjs

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
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

// The specific user ID with the CV but no student profile
const USER_ID = '6717a9d7-0487-40cb-963f-9ed61432f9d9';

async function main() {
  try {
    console.log(`Running fix for user ID: ${USER_ID}`);
    
    // First check if student profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('profile_id', USER_ID)
      .maybeSingle();
      
    if (checkError) {
      throw new Error(`Error checking for existing profile: ${checkError.message}`);
    }
    
    if (existingProfile) {
      console.log('Student profile already exists, no action needed.');
      return;
    }
    
    // Run the direct SQL query to create the student profile
    const { data, error } = await supabase.rpc('create_student_profile_for_cv_user', {
      p_user_id: USER_ID,
      p_university: 'Cebu Institute of Technology - University',
      p_course: 'Information Technology'
    });
    
    if (error) {
      // If the function doesn't exist, fall back to manual creation
      console.log('RPC function not found, falling back to manual profile creation...');
      await createProfileManually();
    } else {
      console.log('Successfully created student profile using RPC function.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Falling back to manual profile creation...');
    await createProfileManually();
  }
}

// Fallback function to create the profile manually
async function createProfileManually() {
  try {
    // Get user profile details
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', USER_ID)
      .single();
      
    if (profileError) {
      throw new Error(`Error fetching user profile: ${profileError.message}`);
    }
    
    // Generate a UUID directly in JS
    const profileId = uuidv4();
    
    // Insert the new student profile
    const { data, error } = await supabase
      .from('student_profiles')
      .insert([{
        id: profileId,
        profile_id: USER_ID,
        full_name: userProfile.full_name,
        school_email: userProfile.email,
        university: 'Cebu Institute of Technology - University',
        course: 'Information Technology',
        year_level: 4,
        country: 'Philippines'
      }]);
      
    if (error) {
      throw new Error(`Error creating student profile: ${error.message}`);
    }
    
    console.log('Successfully created student profile manually.');
  } catch (error) {
    console.error('Error in manual profile creation:', error.message);
    process.exit(1);
  }
}

main(); 