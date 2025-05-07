// This script manually performs job matching for a specific user's CV
// Run with: node scripts/manual-job-match.cjs

const { createClient } = require('@supabase/supabase-js');
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

// Calculate match score between CV skills and job skills
function calculateMatchScore(cvSkills, jobSkills) {
  if (!cvSkills || !jobSkills || jobSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const cvSkillsLower = Array.isArray(cvSkills) ? 
    cvSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '') :
    [];
    
  const jobSkillsLower = Array.isArray(jobSkills) ? 
    jobSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '') :
    [];
  
  // Count matches
  let matches = 0;
  for (const skill of jobSkillsLower) {
    if (skill && cvSkillsLower.some(cvSkill => 
      cvSkill && (cvSkill.includes(skill) || skill.includes(cvSkill))
    )) {
      matches++;
    }
  }
  
  const score = jobSkillsLower.length > 0 
    ? Math.round((matches / jobSkillsLower.length) * 100)
    : 0;
    
  console.log("Match algorithm found", matches, "matching skills, score:", score);
  
  return Math.min(100, Math.max(0, score)); // Ensure score is between 0-100
}

async function main() {
  try {
    console.log('Starting manual job matching...');
    
    // 1. Get the CV
    console.log('Fetching CV...');
    const { data: cv, error: cvError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .eq('user_id', '6717a9d7-0487-40cb-963f-9ed61432f9d9')
      .single();
    
    if (cvError) {
      throw new Error(`Error fetching CV: ${cvError.message}`);
    }
    
    if (!cv) {
      throw new Error('No CV found for the specified user');
    }
    
    console.log(`Found CV with ID: ${cv.id}`);
    
    // 2. Get the student profile
    console.log('Fetching user profile to get email...');
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', cv.user_id)
      .single();
    
    if (userProfileError || !userProfile) {
      throw new Error(`Error fetching user profile: ${userProfileError?.message || 'Not found'}`);
    }
    
    console.log(`Found user profile: ${userProfile.full_name} (${userProfile.email})`);
    
    // 3. Get the student profile using email
    console.log('Fetching student profile using email...');
    const { data: studentProfile, error: studentProfileError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('school_email', userProfile.email)
      .single();
    
    if (studentProfileError || !studentProfile) {
      throw new Error(`Error fetching student profile: ${studentProfileError?.message || 'Not found'}`);
    }
    
    console.log(`Found student profile with ID: ${studentProfile.id}`);
    
    // 4. Get all active jobs
    console.log('Fetching active jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, description, required_skills')
      .eq('status', 'open');
    
    if (jobsError) {
      throw new Error(`Error fetching jobs: ${jobsError.message}`);
    }
    
    console.log(`Found ${jobs.length} active jobs`);
    
    // 5. Calculate match scores and create matches
    console.log('Calculating match scores and creating matches...');
    let matchesCreated = 0;
    let matchesUpdated = 0;
    
    for (const job of jobs) {
      console.log(`Processing job: ${job.title} (${job.id})`);
      
      // Extract skills from CV and job
      const cvSkills = cv.skills?.skills || [];
      const jobSkills = Array.isArray(job.required_skills) ? 
        job.required_skills : (job.required_skills?.skills || []);
      
      console.log(`CV has ${cvSkills.length} skills, job requires ${jobSkills.length} skills`);
      
      // Calculate match score
      const score = calculateMatchScore(cvSkills, jobSkills);
      
      console.log(`Match score for job ${job.title}: ${score}`);
      
      // Create or update match
      const { data: existingMatch, error: existingMatchError } = await supabase
        .from('matches')
        .select('id')
        .eq('student_id', studentProfile.id)
        .eq('job_id', job.id)
        .maybeSingle();
      
      if (existingMatchError) {
        console.error(`Error checking existing match: ${existingMatchError.message}`);
        continue;
      }
      
      if (existingMatch) {
        // Update existing match
        const { error: updateError } = await supabase
          .from('matches')
          .update({ match_score: score, updated_at: new Date().toISOString() })
          .eq('id', existingMatch.id);
        
        if (updateError) {
          console.error(`Error updating match: ${updateError.message}`);
        } else {
          console.log(`Updated match for job ${job.title}`);
          matchesUpdated++;
        }
      } else {
        // Create new match
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            student_id: studentProfile.id,
            job_id: job.id,
            match_score: score,
            status: 'pending'
          });
        
        if (insertError) {
          console.error(`Error creating match: ${insertError.message}`);
        } else {
          console.log(`Created match for job ${job.title}`);
          matchesCreated++;
        }
      }
    }
    
    // 6. Report results
    console.log('\nJob matching completed!');
    console.log(`Created ${matchesCreated} new matches`);
    console.log(`Updated ${matchesUpdated} existing matches`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 