// This script creates a minimal student profile with only essential fields
// Run with: node scripts/create-minimal-profile.cjs

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
    console.log(`Creating minimal student profile for user: ${USER_ID}`);
    
    // Get the email for this user
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', USER_ID)
      .single();
    
    if (profileError) {
      throw new Error(`Error fetching user profile: ${profileError.message}`);
    }
    
    if (!userProfile) {
      throw new Error(`User profile not found for ID: ${USER_ID}`);
    }
    
    console.log(`Found user profile email: ${userProfile.email}`);
    
    // Special debug - let's see what profiles already exist for this user
    console.log('DEBUG: Checking existing profiles for this user...');
    const { data: existingProfiles, error: existingError } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(10);
    
    if (existingError) {
      console.error('Error checking existing profiles:', existingError.message);
    } else {
      console.log(`Found ${existingProfiles?.length || 0} student profiles in the system`);
      if (existingProfiles && existingProfiles.length > 0) {
        console.log('Sample profile structure:', JSON.stringify(existingProfiles[0], null, 2));
      }
    }
    
    // Check what's really needed
    console.log('Checking database schema directly...');
    
    try {
      // Try a direct INSERT with just id and school_email (minimum required)
      console.log('Trying with only id and school_email...');
      const { error } = await supabase.from('student_profiles').insert({
        id: uuidv4(),
        school_email: userProfile.email
      });
      
      if (error) {
        console.error(`Error with id+email only: ${error.message}`);
      } else {
        console.log('SUCCESS! Created student profile with id+email only.');
        return;
      }
    } catch (error) {
      console.error(`Exception with id+email: ${error.message}`);
    }
    
    // Try another approach
    console.log('Trying with id, school_email and user_id...');
    try {
      const { error } = await supabase.from('student_profiles').insert({
        id: uuidv4(),
        school_email: userProfile.email,
        user_id: USER_ID
      });
      
      if (error) {
        console.error(`Error with id+email+user_id: ${error.message}`);
      } else {
        console.log('SUCCESS! Created student profile with id+email+user_id.');
        return;
      }
    } catch (error) {
      console.error(`Exception with id+email+user_id: ${error.message}`);
    }
    
    // Try a third approach
    console.log('Trying one more approach with id, school_email, and required nulls...');
    try {
      const { error } = await supabase.from('student_profiles').insert({
        id: uuidv4(),
        school_email: userProfile.email,
        university: 'University',
        course: 'Course',
        year_level: 4,
        country: 'Philippines'
      });
      
      if (error) {
        console.error(`Error with more fields: ${error.message}`);
      } else {
        console.log('SUCCESS! Created student profile with more fields.');
        return;
      }
    } catch (error) {
      console.error(`Exception with more fields: ${error.message}`);
    }
    
    // Try with raw SQL
    console.log('Trying with raw SQL...');
    try {
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          INSERT INTO student_profiles (id, school_email) 
          VALUES ('${uuidv4()}', '${userProfile.email}');
        `
      });
      
      if (error) {
        console.error(`Error with raw SQL: ${error.message}`);
      } else {
        console.log('SUCCESS! Created student profile with raw SQL.');
        return;
      }
    } catch (error) {
      console.error(`Exception with raw SQL: ${error.message}`);
    }
    
    console.log('All attempts failed. Please check the database schema manually.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 