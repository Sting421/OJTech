// Script to force-run job matching for all jobs
// Usage: node scripts/force-run-job-matching.js
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to calculate basic match score
function calculateBasicMatchScore(cvSkills, jobSkills) {
  console.log("[MATCHING] Using basic match algorithm");
  if (!cvSkills || !jobSkills || jobSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const cvSkillsLower = cvSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '');
  const jobSkillsLower = jobSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '');
  
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
    
  console.log("[MATCHING] Basic algorithm found", matches, "matching skills, score:", score);
  
  return Math.min(100, Math.max(0, score)); // Ensure score is between 0-100
}

async function forceRunJobMatching() {
  console.log('---- FORCE RUNNING JOB MATCHING ----');
  let jobsProcessed = 0;
  let jobsWithMatches = 0;
  let totalMatchesCreated = 0;
  let totalMatchesUpdated = 0;

  try {
    // Get all active jobs
    console.log('Fetching all active jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, required_skills, status')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (jobsError) {
      throw new Error(`Error fetching jobs: ${jobsError.message}`);
    }

    console.log(`Found ${jobs.length} active jobs. Processing...`);

    // Get all active CVs
    console.log('Fetching all active CVs...');
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .not('skills', 'is', null);

    if (cvsError) {
      throw new Error(`Error fetching CVs: ${cvsError.message}`);
    }

    console.log(`Found ${cvs.length} active CVs with skills.`);

    // Process each job
    for (const job of jobs) {
      console.log(`\nProcessing job: ${job.title} (${job.id})`);
      jobsProcessed++;
      
      let matchesCreated = 0;
      let matchesUpdated = 0;
      
      // Process each CV for this job
      for (const cv of cvs) {
        if (!cv.skills || !cv.user_id) {
          console.log(`Skipping CV ${cv.id} - missing skills or user_id`);
          continue;
        }

        // Try to find student profile using multiple methods
        let studentProfile = null;

        // Method 1: Direct ID match (student_id = user_id)
        const { data: directProfile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('id', cv.user_id)  // Try direct ID match first
          .maybeSingle();
          
        if (directProfile) {
          studentProfile = directProfile;
          console.log(`Found student profile via direct id: ${studentProfile.id}`);
        } else {
          // Method 2: Email lookup
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', cv.user_id)
            .maybeSingle();
            
          if (userProfile?.email) {
            const { data: emailProfile } = await supabase
              .from('student_profiles')
              .select('id')
              .eq('school_email', userProfile.email)
              .maybeSingle();
              
            if (emailProfile) {
              studentProfile = emailProfile;
              console.log(`Found student profile via email: ${studentProfile.id}`);
            }
          }
        }

        if (!studentProfile) {
          console.log(`Could not find student profile for user ${cv.user_id}. Skipping.`);
          continue;
        }

        // Calculate match score
        const cvSkills = cv.skills?.skills || [];
        const jobSkills = Array.isArray(job.required_skills) 
          ? job.required_skills 
          : (job.required_skills?.skills || []);
        
        console.log(`CV has ${cvSkills.length} skills, job requires ${jobSkills.length} skills`);
        
        const score = calculateBasicMatchScore(cvSkills, jobSkills);
        console.log(`Match score: ${score}%`);

        // Check for existing match
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('student_id', studentProfile.id)
          .eq('job_id', job.id)
          .maybeSingle();
          
        if (existingMatch) {
          // Update existing match
          const { error: updateError } = await supabase
            .from('matches')
            .update({ 
              match_score: score, 
              updated_at: new Date().toISOString(),
              status: 'pending' // Reset to pending if it was changed
            })
            .eq('id', existingMatch.id);
          
          if (updateError) {
            console.error(`Error updating match: ${updateError.message}`);
          } else {
            console.log(`Updated match between student ${studentProfile.id} and job ${job.id} with score ${score}%`);
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
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error(`Error creating match: ${insertError.message}`);
          } else {
            console.log(`Created match between student ${studentProfile.id} and job ${job.id} with score ${score}%`);
            matchesCreated++;
          }
        }
      }

      if (matchesCreated > 0 || matchesUpdated > 0) {
        jobsWithMatches++;
        totalMatchesCreated += matchesCreated;
        totalMatchesUpdated += matchesUpdated;
        console.log(`Job ${job.title}: Created ${matchesCreated} matches, updated ${matchesUpdated} matches`);
      } else {
        console.log(`No matches created or updated for job: ${job.title}`);
      }
    }

    // Summary
    console.log('\n---- JOB MATCHING SUMMARY ----');
    console.log(`Jobs processed: ${jobsProcessed}`);
    console.log(`Jobs with matches: ${jobsWithMatches}`);
    console.log(`Total matches created: ${totalMatchesCreated}`);
    console.log(`Total matches updated: ${totalMatchesUpdated}`);

  } catch (error) {
    console.error('Error in force-run job matching:', error);
  }
}

// Execute the function and handle any errors
forceRunJobMatching().catch(console.error); 