#!/usr/bin/env node

/**
 * Direct test script for testing job matching
 * Run with: node scripts/test-job-matching-direct.js
 */

// Load environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  console.log('=== Job Matching Direct Test ===');
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Supabase environment variables are not set');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');

  // Get Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: GEMINI_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  // Initialize Gemini client
  const genAI = new GoogleGenerativeAI(apiKey);
  console.log('Gemini client initialized');
  
  // Step 1: Get a CV
  console.log('Fetching most recent CV...');
  const { data: cvs, error: cvError } = await supabase
    .from('cvs')
    .select('id, user_id, skills')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (cvError || !cvs || cvs.length === 0) {
    console.error('❌ Error: Could not find any CV:', cvError);
    process.exit(1);
  }
  
  const cv = cvs[0];
  console.log(`Found CV with ID: ${cv.id} for user ${cv.user_id}`);
  
  if (!cv.skills) {
    console.error('❌ Error: CV does not have skills data');
    process.exit(1);
  }

  // Step 1b: Get or create student profile for this user
  console.log('Fetching/creating student profile for user ID:', cv.user_id);

  // First check if a student profile already exists
  const { data: existingProfile, error: profileError } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', cv.user_id)
    .maybeSingle();

  let studentProfileId;
  
  if (!existingProfile) {
    console.log('No existing student profile found, creating one...');
    
    // Get user email from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', cv.user_id)
      .maybeSingle();
      
    if (userError) {
      console.error('❌ Error fetching user profile:', userError);
      process.exit(1);
    }
    
    const email = userData?.email || 'test@example.com';
    
    // Create a simple student profile
    const { data: newProfile, error: createError } = await supabase
      .from('student_profiles')
      .insert([{
        id: cv.user_id,
        full_name: 'Test Student',
        school_email: email,
        university: 'Test University',
        country: 'Philippines'
      }])
      .select('id')
      .single();
      
    if (createError) {
      console.error('❌ Error creating student profile:', createError);
      console.log('Error details:', createError.details);
      process.exit(1);
    }
    
    studentProfileId = newProfile.id;
    console.log('Created new student profile with ID:', studentProfileId);
  } else {
    studentProfileId = existingProfile.id;
    console.log('Found existing student profile with ID:', studentProfileId);
  }
  
  // Step 2: Get jobs
  console.log('Fetching active jobs...');
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, description, required_skills')
    .eq('status', 'open')
    .limit(10);
  
  if (jobsError || !jobs || jobs.length === 0) {
    console.error('❌ Error: Could not find any jobs:', jobsError);
    process.exit(1);
  }
  
  console.log(`Found ${jobs.length} active jobs`);
  
  // Step 3: Calculate match scores
  console.log('Calculating match scores...');
  
  // Model to use
  const MODEL = "gemini-1.5-flash";
  
  for (const job of jobs) {
    console.log(`\nMatching job: ${job.title} (${job.id})`);
    
    // Extract relevant data
    const cvSkills = Array.isArray(cv.skills.skills) ? cv.skills.skills : [];
    const jobSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
    
    console.log(`CV has ${cvSkills.length} skills, job requires ${jobSkills.length} skills`);
    
    if (jobSkills.length === 0 || cvSkills.length === 0) {
      console.log('Using basic match algorithm due to missing skills data');
      const score = calculateBasicMatchScore(cvSkills, jobSkills);
      console.log(`Basic algorithm match score: ${score}%`);
      continue;
    }
    
    try {
      // Create prompt for Gemini
      const prompt = `
        I need you to analyze a job posting and a candidate's resume data to determine how well they match.
        
        JOB POSTING:
        Title: ${job.title}
        Description: ${job.description}
        Required Skills: ${JSON.stringify(jobSkills)}
        
        CANDIDATE RESUME DATA:
        Skills: ${JSON.stringify(cvSkills)}
        
        Calculate a match score from 0 to 100, where:
        - 0-20: Very poor match, missing critical requirements
        - 21-40: Poor match, missing several important requirements
        - 41-60: Moderate match, meets some requirements but has gaps
        - 61-80: Good match, meets most requirements with minor gaps
        - 81-100: Excellent match, meets or exceeds all requirements
        
        Consider factors such as:
        - Skills alignment (most important)
        - Keyword matches
        
        Return ONLY a number from 0-100 representing the match score.
      `;
      
      console.log('Calling Gemini API...');
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      
      console.log(`Raw response: ${content}`);
      
      // Extract score
      const scoreMatch = content.match(/\b([0-9]{1,2}|100)\b/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[0], 10);
        console.log(`Match score: ${score}%`);
        
        // Create/update match record
        const matchData = {
          student_id: studentProfileId,
          job_id: job.id,
          match_score: score,
          status: 'pending'
        };
        
        console.log('Saving match score to database...');
        console.log('Match data:', matchData);
        
        const { data: insertData, error: insertError } = await supabase
          .from('matches')
          .upsert([matchData], { onConflict: 'student_id,job_id' })
          .select();
        
        if (insertError) {
          console.error('❌ Error saving match score:', insertError);
        } else {
          console.log('✅ Match score saved successfully:', insertData);
        }
      } else {
        console.log('❌ Could not extract score from response');
      }
    } catch (error) {
      console.error('❌ Error calculating match score:', error);
    }
  }
  
  console.log('\nJob matching test completed.');
}

// Basic algorithm for calculating match score
function calculateBasicMatchScore(cvSkills, jobSkills) {
  if (!cvSkills || !jobSkills || jobSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const cvSkillsLower = cvSkills.map(skill => skill.toLowerCase());
  const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase());
  
  // Count matches
  let matches = 0;
  for (const skill of jobSkillsLower) {
    if (cvSkillsLower.some(cvSkill => 
      cvSkill.includes(skill) || 
      skill.includes(cvSkill)
    )) {
      matches++;
    }
  }
  
  return Math.round((matches / jobSkillsLower.length) * 100);
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
}); 