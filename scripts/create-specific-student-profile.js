// This script creates a student profile for a specific user ID to fix the job matching issue
// Run with: node scripts/create-specific-student-profile.js

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

// User ID that needs a student profile
const USER_ID = '6717a9d7-0487-40cb-963f-9ed61432f9d9';

async function main() {
  try {
    console.log(`Creating student profile for user: ${USER_ID}`);
    
    // Check if a student profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('profile_id', USER_ID)
      .maybeSingle();
    
    if (checkError) {
      throw new Error(`Error checking for existing profile: ${checkError.message}`);
    }
    
    if (existingProfile) {
      console.log('Student profile already exists, no action needed');
      return;
    }
    
    // Get user data from profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', USER_ID)
      .maybeSingle();
    
    if (profileError) {
      throw new Error(`Error fetching user profile: ${profileError.message}`);
    }
    
    if (!userProfile) {
      throw new Error(`User profile not found for ID: ${USER_ID}`);
    }
    
    // Get CV data to extract more information
    const { data: cv, error: cvError } = await supabase
      .from('cvs')
      .select('skills')
      .eq('user_id', USER_ID)
      .maybeSingle();
    
    if (cvError) {
      throw new Error(`Error fetching CV: ${cvError.message}`);
    }
    
    // Extract information from CV
    let fullName = userProfile.full_name || 'Student';
    let email = userProfile.email;
    let university = 'Cebu Institute of Technology - University';
    let course = 'Information Technology';
    
    if (cv && cv.skills) {
      try {
        const skillsData = typeof cv.skills === 'string' ? JSON.parse(cv.skills) : cv.skills;
        
        // Extract personal info if available
        if (skillsData.personal_info) {
          fullName = skillsData.personal_info.name || fullName;
          email = skillsData.personal_info.email || email;
        }
        
        // Extract education info if available
        if (skillsData.education && skillsData.education.length > 0) {
          university = skillsData.education[0].institution || university;
          course = skillsData.education[0].field || course;
        }
      } catch (parseError) {
        console.warn('Could not parse CV skills data, using default values');
      }
    }
    
    // Create the student profile
    const newProfile = {
      id: uuidv4(),
      profile_id: USER_ID,
      full_name: fullName,
      school_email: email,
      university: university,
      course: course,
      year_level: 4, // Default to senior
      country: 'Philippines'
    };
    
    console.log('Creating student profile with data:', newProfile);
    
    const { data, error } = await supabase
      .from('student_profiles')
      .insert([newProfile])
      .select();
    
    if (error) {
      throw new Error(`Error creating student profile: ${error.message}`);
    }
    
    console.log('Student profile created successfully!');
    console.log('Now job matching should work properly for this user');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 