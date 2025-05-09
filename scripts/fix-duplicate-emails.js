#!/usr/bin/env node

// This script identifies and fixes users with duplicate email addresses in profiles table
// Run with: node scripts/fix-duplicate-emails.js

// Import required libraries
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check if Supabase credentials are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials in environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

// Initialize Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDuplicateEmails() {
  try {
    console.log('Checking for duplicate emails in profiles table...');
    
    // Find emails with multiple profiles
    const { data: duplicateEmails, error: duplicateError } = await supabase
      .from('profiles')
      .select('email')
      .filter('email', 'not.is', null)
      .group('email')
      .having('count', 'gt', 1);
      
    if (duplicateError) {
      throw new Error(`Error finding duplicate emails: ${duplicateError.message}`);
    }
    
    console.log(`Found ${duplicateEmails?.length || 0} emails with multiple profiles`);
    
    if (!duplicateEmails || duplicateEmails.length === 0) {
      console.log('No duplicate emails found.');
      return;
    }
    
    // Process each duplicate email
    for (const { email } of duplicateEmails) {
      console.log(`\nProcessing duplicate email: ${email}`);
      
      // Get all profiles with this email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: true });
        
      if (profileError) {
        console.error(`Error fetching profiles for email ${email}: ${profileError.message}`);
        continue;
      }
      
      if (!profiles || profiles.length < 2) {
        console.log(`No duplicate profiles found for email ${email}`);
        continue;
      }
      
      console.log(`Found ${profiles.length} profiles with email ${email}`);
      
      // The oldest profile is the one we'll keep
      const primaryProfile = profiles[0];
      console.log(`Primary profile: ${primaryProfile.id} (created: ${primaryProfile.created_at || 'unknown'})`);
      
      // Process each duplicate profile
      for (const duplicateProfile of profiles.slice(1)) {
        console.log(`\nProcessing duplicate profile: ${duplicateProfile.id}`);
        
        // Step 1: Get auth user info for the duplicate profile
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
          duplicateProfile.id
        );
        
        if (authError || !authUser) {
          console.error(`Error or no auth user found for profile ${duplicateProfile.id}: ${authError?.message || 'No user'}`);
          continue;
        }
        
        console.log(`Auth user found with email: ${authUser.user.email}`);
        
        // Step 2: Create an auth link between the emails if needed
        // This is complex and would require special handling with admin APIs
        
        // Step 3: Update all references to the duplicate ID
        console.log(`Updating references from ${duplicateProfile.id} to ${primaryProfile.id}...`);
        
        // Update cvs
        const { data: cvsUpdate, error: cvsError } = await supabase
          .from('cvs')
          .update({ user_id: primaryProfile.id })
          .eq('user_id', duplicateProfile.id);
          
        if (cvsError) {
          console.error(`Error updating CVs: ${cvsError.message}`);
        } else {
          console.log('CVs updated');
        }
        
        // Update student profiles (if any)
        const { data: studentUpdate, error: studentError } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('id', duplicateProfile.id)
          .maybeSingle();
          
        if (studentUpdate) {
          // Handle student profile merge
          console.log(`Found student profile with ID ${duplicateProfile.id}, updating...`);
          
          const { error: updateError } = await supabase
            .from('student_profiles')
            .update({ id: primaryProfile.id })
            .eq('id', duplicateProfile.id);
            
          if (updateError) {
            console.error(`Error updating student profile: ${updateError.message}`);
          } else {
            console.log('Student profile updated');
          }
        }
        
        // Update any job applications
        const { data: applicationsUpdate, error: applicationsError } = await supabase
          .from('applications')
          .update({ student_id: primaryProfile.id })
          .eq('student_id', duplicateProfile.id);
          
        if (applicationsError) {
          console.error(`Error updating applications: ${applicationsError.message}`);
        } else {
          console.log('Applications updated');
        }
        
        // Update any job matches
        const { data: matchesUpdate, error: matchesError } = await supabase
          .from('matches')
          .update({ student_id: primaryProfile.id })
          .eq('student_id', duplicateProfile.id);
          
        if (matchesError) {
          console.error(`Error updating matches: ${matchesError.message}`);
        } else {
          console.log('Matches updated');
        }
        
        // Step 4: Mark the duplicate profile for deletion (or delete if safe)
        console.log(`Marking duplicate profile ${duplicateProfile.id} for deletion...`);
        
        // We don't actually delete the profile here as it's connected to auth
        // Instead, mark it somehow or leave it for manual cleanup
        const { error: markError } = await supabase
          .from('profiles')
          .update({ 
            email: `${email}.duplicate.${duplicateProfile.id}`,
            duplicate_of: primaryProfile.id
          })
          .eq('id', duplicateProfile.id);
          
        if (markError) {
          console.error(`Error marking profile as duplicate: ${markError.message}`);
        } else {
          console.log('Profile marked as duplicate');
        }
      }
    }
    
    console.log('\nDuplicate email fix completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixDuplicateEmails(); 