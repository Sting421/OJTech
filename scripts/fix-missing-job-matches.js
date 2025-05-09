#!/usr/bin/env node

// This script checks for CVs that have been processed (skills exist) but haven't had job matching triggered
// Run with: node scripts/fix-missing-job-matches.js

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

async function fixMissingJobMatches() {
  try {
    console.log('Checking for CVs with missing job matches...');
    
    // Get all CVs that have been processed (skills exist)
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .not('skills', 'is', null)
      .order('created_at', { ascending: false });
    
    if (cvsError) {
      throw new Error(`Error fetching CVs: ${cvsError.message}`);
    }
    
    console.log(`Found ${cvs?.length || 0} processed CVs`);
    
    if (!cvs || cvs.length === 0) {
      console.log('No processed CVs found.');
      return;
    }
    
    // Get all active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, description, required_skills')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100); // Process in batches
      
    if (jobsError) {
      throw new Error(`Error fetching jobs: ${jobsError.message}`);
    }
    
    console.log(`Found ${jobs?.length || 0} active jobs`);
    
    if (!jobs || jobs.length === 0) {
      console.log('No active jobs found.');
      return;
    }
    
    // Process each CV
    console.log('\nGenerating missing job matches:');
    for (const cv of cvs) {
      console.log(`\nProcessing CV: ${cv.id} for user: ${cv.user_id}`);
      
      // Skip if skills data is not valid
      if (!cv.skills || !cv.skills.skills || !Array.isArray(cv.skills.skills) || cv.skills.skills.length === 0) {
        console.log('- Skipping: No valid skills data');
        continue;
      }
      
      // Check if student profile exists
      let studentId = cv.user_id;
      const { data: studentProfile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('id', studentId)
        .single();
        
      if (profileError) {
        // Try to create student profile
        console.log('- Student profile not found, creating one...');
        
        // Get user email from profiles
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', cv.user_id)
          .single();
          
        if (userProfileError || !userProfile) {
          console.log(`- Error: Couldn't find user profile for ${cv.user_id}`);
          continue;
        }
        
        // Create student profile
        const { error: createError } = await supabase
          .from('student_profiles')
          .insert([{
            id: cv.user_id,
            school_email: userProfile.email || '',
            full_name: userProfile.full_name || '',
            university: 'University',
            course: 'Course',
            year_level: 1
          }]);
          
        if (createError) {
          console.log(`- Error creating student profile: ${createError.message}`);
          continue;
        }
        
        console.log('- Created new student profile successfully');
      }
      
      // Calculate basic match scores for each job
      console.log(`- Calculating match scores for ${jobs.length} jobs...`);
      const matches = [];
      
      for (const job of jobs) {
        // Basic score calculation
        const cvSkills = cv.skills.skills || [];
        const jobSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
        
        let matchScore = 10; // Default low score
        
        if (cvSkills.length > 0 && jobSkills.length > 0) {
          // Count matching skills
          const matchingSkills = cvSkills.filter(skill => 
            jobSkills.some(jobSkill => 
              jobSkill.toLowerCase() === skill.toLowerCase() ||
              jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(jobSkill.toLowerCase())
            )
          );
          
          // Calculate percentage match
          const matchPercentage = Math.round(
            (matchingSkills.length / Math.max(1, Math.min(cvSkills.length, jobSkills.length))) * 100
          );
          
          // Ensure match score is between 10-100
          matchScore = Math.max(10, Math.min(100, matchPercentage));
        }
        
        matches.push({
          student_id: studentId,
          job_id: job.id,
          match_score: matchScore,
          status: 'pending'
        });
      }
      
      // Batch save matches (upsert to avoid duplicates)
      if (matches.length > 0) {
        console.log(`- Saving ${matches.length} job matches...`);
        
        const { error: matchError } = await supabase
          .from('matches')
          .upsert(matches, {
            onConflict: 'student_id,job_id',
            ignoreDuplicates: false
          });
          
        if (matchError) {
          console.log(`- Error saving matches: ${matchError.message}`);
        } else {
          console.log('- Job matches created/updated successfully');
        }
      }
    }
    
    console.log('\nJob matching fix completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixMissingJobMatches(); 