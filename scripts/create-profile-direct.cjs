// This script directly executes SQL to create a student profile
// Run with: node scripts/create-profile-direct.cjs

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
    console.log(`Creating student profile for user: ${USER_ID}`);
    
    // Get the email for this user
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', USER_ID)
      .single();
    
    if (profileError) {
      throw new Error(`Error fetching user profile: ${profileError.message}`);
    }
    
    if (!userProfile) {
      throw new Error(`User profile not found for ID: ${USER_ID}`);
    }
    
    console.log(`Found user profile: ${userProfile.full_name} (${userProfile.email})`);
    
    // First, let's try to check the table structure
    console.log('Checking student_profiles table structure...');
    const { data: sampleProfile, error: sampleError } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(1);
    
    let columns = [];
    if (sampleError) {
      console.log(`Error fetching sample: ${sampleError.message}`);
    } else if (sampleProfile && sampleProfile.length > 0) {
      console.log('Table structure detected from sample:');
      columns = Object.keys(sampleProfile[0]);
      console.log(columns.join(', '));
    }
    
    // Generate a new ID
    const profileId = uuidv4();
    
    // Try to create a basic profile with REQUIRED fields
    console.log('Creating a student profile with required fields...');
    const insertData = {
      id: profileId,
      // Required field:
      school_email: userProfile.email,
      // Other fields we believe are required based on the error:
      full_name: userProfile.full_name || 'Student',
      university: 'Cebu Institute of Technology - University',
      course: 'Information Technology',
      year_level: 4,
      country: 'Philippines'
    };
    
    // Add user_id/profile_id relationship
    insertData.user_id = USER_ID; // Try user_id first
    
    console.log('Inserting with data:', insertData);
    
    let success = false;
    
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error(`Error with user_id: ${error.message}`);
      } else {
        console.log('Successfully created student profile with user_id!');
        success = true;
      }
    } catch (error) {
      console.error(`Exception with user_id approach: ${error.message}`);
    }
    
    // If the first approach failed, try with profile_id
    if (!success) {
      console.log('Trying with profile_id instead of user_id...');
      
      // Create a new profile with profile_id instead
      const profileIdData = {
        id: uuidv4(),
        profile_id: USER_ID,
        school_email: userProfile.email,
        full_name: userProfile.full_name || 'Student',
        university: 'Cebu Institute of Technology - University',
        course: 'Information Technology',
        year_level: 4,
        country: 'Philippines'
      };
      
      try {
        const { data, error } = await supabase
          .from('student_profiles')
          .insert([profileIdData])
          .select();
        
        if (error) {
          console.error(`Error with profile_id: ${error.message}`);
        } else {
          console.log('Successfully created student profile with profile_id!');
          success = true;
        }
      } catch (error) {
        console.error(`Exception with profile_id approach: ${error.message}`);
      }
    }
    
    // If both approaches failed, try with minimal data
    if (!success) {
      console.log('Trying with absolutely minimal data...');
      
      // Create with the bare minimum
      const minimalData = {
        id: uuidv4(),
        school_email: userProfile.email,
        full_name: userProfile.full_name || 'Student',
        university: 'University',
        course: 'Course',
        year_level: 4,
        country: 'Philippines'
      };
      
      try {
        const { data, error } = await supabase
          .from('student_profiles')
          .insert([minimalData])
          .select();
        
        if (error) {
          console.error(`Error with minimal data: ${error.message}`);
        } else {
          console.log('Successfully created student profile with minimal data!');
        }
      } catch (error) {
        console.error(`Exception with minimal approach: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 