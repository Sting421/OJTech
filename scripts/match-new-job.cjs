// This script matches a newly created job with all eligible CVs
// Run with: node scripts/match-new-job.cjs <job_id>

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
    // Get job ID from command line argument
    const jobId = process.argv[2];
    
    if (!jobId) {
      console.error('Please provide a job ID as command line argument');
      console.error('Usage: node scripts/match-new-job.cjs <job_id>');
      process.exit(1);
    }
    
    console.log(`Starting job matching for job ID: ${jobId}`);
    
    // 1. Get the job details
    console.log('Fetching job details...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, description, required_skills')
      .eq('id', jobId)
      .single();
    
    if (jobError) {
      throw new Error(`Error fetching job: ${jobError.message}`);
    }
    
    console.log(`Found job: ${job.title}`);
    
    // 2. Get all CVs with skills
    console.log('Fetching CVs with skills...');
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .not('skills', 'is', null);
    
    if (cvsError) {
      throw new Error(`Error fetching CVs: ${cvsError.message}`);
    }
    
    console.log(`Found ${cvs.length} CVs with skills`);
    
    // 3. Process each CV
    let matchesCreated = 0;
    let matchesUpdated = 0;
    let skipCount = 0;
    
    for (const cv of cvs) {
      console.log(`\nProcessing CV: ${cv.id} for user ${cv.user_id}`);
      
      // Get user email
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', cv.user_id)
        .single();
      
      if (userProfileError || !userProfile || !userProfile.email) {
        console.warn(`Could not find email for user ${cv.user_id}. Skipping.`);
        skipCount++;
        continue;
      }
      
      console.log(`Found user email: ${userProfile.email}`);
      
      // Find student profile
      const { data: studentProfile, error: studentProfileError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('school_email', userProfile.email)
        .maybeSingle();
      
      if (studentProfileError || !studentProfile) {
        console.warn(`Could not find student profile for email ${userProfile.email}. Skipping.`);
        skipCount++;
        continue;
      }
      
      console.log(`Found student profile: ${studentProfile.id}`);
      
      // Calculate match score
      const cvSkills = cv.skills?.skills || [];
      const jobSkills = Array.isArray(job.required_skills) ? 
        job.required_skills : (job.required_skills?.skills || []);
      
      console.log(`CV has ${cvSkills.length} skills, job requires ${jobSkills.length} skills`);
      
      const score = calculateMatchScore(cvSkills, jobSkills);
      
      // Create/update match
      const { data: existingMatch, error: existingMatchError } = await supabase
        .from('matches')
        .select('id')
        .eq('student_id', studentProfile.id)
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (existingMatchError) {
        console.error(`Error checking for existing match: ${existingMatchError.message}`);
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
          console.log(`Updated match for student ${studentProfile.id} with score ${score}`);
          matchesUpdated++;
        }
      } else {
        // Create new match
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            student_id: studentProfile.id,
            job_id: jobId,
            match_score: score,
            status: 'pending'
          });
        
        if (insertError) {
          console.error(`Error creating match: ${insertError.message}`);
        } else {
          console.log(`Created match for student ${studentProfile.id} with score ${score}`);
          matchesCreated++;
        }
      }
    }
    
    // Report results
    console.log('\nJob matching completed!');
    console.log(`Total CVs processed: ${cvs.length}`);
    console.log(`Skipped: ${skipCount}`);
    console.log(`Created: ${matchesCreated} new matches`);
    console.log(`Updated: ${matchesUpdated} existing matches`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 