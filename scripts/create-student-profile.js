// Script to create a student profile for a user with a CV but no student profile
// Usage: node scripts/create-student-profile.js USER_ID EMAIL
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

async function createStudentProfile() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Usage: node scripts/create-student-profile.js USER_ID EMAIL');
      process.exit(1);
    }
    
    const userId = args[0];
    const email = args[1];
    
    console.log(`Creating student profile for user ${userId} with email ${email}`);
    
    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .or(`id.eq.${userId},school_email.eq.${email}`)
      .maybeSingle();
      
    if (existingProfile) {
      console.log(`Student profile already exists with ID: ${existingProfile.id}`);
      process.exit(0);
    }
    
    // Create the student profile with minimal required fields
    const { data, error } = await supabase
      .from('student_profiles')
      .insert({
        id: userId,
        school_email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student profile:', error.message);
      process.exit(1);
    }
    
    console.log('Student profile created successfully!');
    console.log(data);
    
    console.log('\nNow run the force job matching script to update matches:');
    console.log('node scripts/force-run-job-matching.js');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the function
createStudentProfile(); 