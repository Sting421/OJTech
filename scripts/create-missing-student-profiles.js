// This script creates missing student profiles for users who have CVs but don't have corresponding student profiles
// Run with: node scripts/create-missing-student-profiles.js

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

async function main() {
  try {
    console.log('Fetching CVs without corresponding student profiles...');
    
    // Get all CVs
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills');
    
    if (cvsError) {
      throw cvsError;
    }
    
    console.log(`Found ${cvs.length} CVs in total`);
    
    // Process each CV
    let createdCount = 0;
    let alreadyExistsCount = 0;
    
    for (const cv of cvs) {
      // Check if a student profile already exists for this user
      const { data: existingProfile, error: checkError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('profile_id', cv.user_id)
        .maybeSingle();
      
      if (checkError) {
        console.error(`Error checking student profile for user ${cv.user_id}:`, checkError);
        continue;
      }
      
      if (existingProfile) {
        console.log(`Student profile already exists for user ${cv.user_id}`);
        alreadyExistsCount++;
        continue;
      }
      
      // Get user email from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', cv.user_id)
        .single();
      
      if (profileError) {
        console.error(`Error fetching profile data for user ${cv.user_id}:`, profileError);
        continue;
      }
      
      // Extract full name from CV if available
      let fullName = profileData.full_name || 'Student';
      let email = profileData.email;
      let university = 'University';
      let course = 'Course';
      
      // Try to extract more details from CV
      if (cv.skills && typeof cv.skills === 'object') {
        // Extract personal info if available
        if (cv.skills.personal_info) {
          fullName = cv.skills.personal_info.name || fullName;
          email = cv.skills.personal_info.email || email;
        }
        
        // Extract education info if available
        if (cv.skills.education && cv.skills.education.length > 0) {
          university = cv.skills.education[0].institution || university;
          course = cv.skills.education[0].field || course;
        }
      }
      
      // Create new student profile
      const newProfile = {
        id: uuidv4(),
        profile_id: cv.user_id,
        full_name: fullName,
        school_email: email,
        university: university,
        course: course,
        year_level: 4, // Default to senior year
        country: 'Philippines'
      };
      
      const { data: insertedProfile, error: insertError } = await supabase
        .from('student_profiles')
        .insert([newProfile])
        .select();
      
      if (insertError) {
        console.error(`Error creating student profile for user ${cv.user_id}:`, insertError);
        continue;
      }
      
      console.log(`Created student profile for user ${cv.user_id}`);
      createdCount++;
    }
    
    console.log('\nSummary:');
    console.log(`- Total CVs processed: ${cvs.length}`);
    console.log(`- Student profiles already exist: ${alreadyExistsCount}`);
    console.log(`- New student profiles created: ${createdCount}`);
    console.log(`- Failed to create profiles: ${cvs.length - (alreadyExistsCount + createdCount)}`);
    
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

main(); 