// Script to create a test job and trigger matching
// Usage: node scripts/create-test-job.js
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

async function createTestJob() {
  try {
    console.log('--- Creating test job for matching ---');
    
    // First, get an employer ID to use
    console.log('Finding an employer account...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('role', 'employer')
      .limit(1);
      
    if (profilesError || !profiles || profiles.length === 0) {
      console.error('Could not find an employer account');
      process.exit(1);
    }
    
    const employerId = profiles[0].id;
    console.log(`Using employer account: ${profiles[0].email} (${employerId})`);
    
    // Create a test job with skills
    const jobId = randomUUID();
    const jobTitle = `Test Job ${new Date().toISOString().split('T')[0]}`;
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        title: jobTitle,
        description: 'This is a test job created by the system to test job matching.',
        employer_id: employerId,
        company_name: 'Test Company',
        required_skills: ['JavaScript', 'React', 'Node.js', 'Database Design'],
        status: 'open',
        location: 'Remote',
        job_type: 'Full-time',
        salary_range: '30000-50000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (jobError) {
      console.error('Error creating test job:', jobError.message);
      process.exit(1);
    }
    
    console.log(`Created test job: ${job.title} (${job.id})`);
    
    // Now retrieve all active CVs to match against
    console.log('Finding CVs for matching...');
    const { data: cvs, error: cvsError } = await supabase
      .from('cvs')
      .select('id, user_id, skills')
      .not('skills', 'is', null);
      
    if (cvsError) {
      console.error('Error finding CVs:', cvsError.message);
    } else {
      console.log(`Found ${cvs.length} CVs with skills`);
      
      // Process each CV
      let matchCount = 0;
      for (const cv of cvs) {
        console.log(`Processing CV ${cv.id} for user ${cv.user_id}`);
        
        // Find student profile
        let studentProfile = null;
        
        // Try direct match first
        const { data: directProfile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('id', cv.user_id)
          .maybeSingle();
          
        if (directProfile) {
          studentProfile = directProfile;
        } else {
          // Try email match
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
            }
          }
        }
        
        if (!studentProfile) {
          console.log(`No student profile found for user ${cv.user_id}. Skipping.`);
          continue;
        }
        
        // Calculate match score (simple algorithm)
        const cvSkills = cv.skills?.skills || [];
        const jobSkills = job.required_skills || [];
        
        // Count matches
        let matches = 0;
        for (const skill of jobSkills) {
          if (skill && cvSkills.some(cvSkill => 
            typeof cvSkill === 'string' && typeof skill === 'string' &&
            (cvSkill.toLowerCase().includes(skill.toLowerCase()) || 
             skill.toLowerCase().includes(cvSkill.toLowerCase()))
          )) {
            matches++;
          }
        }
        
        const score = jobSkills.length > 0 
          ? Math.round((matches / jobSkills.length) * 100)
          : 0;
          
        console.log(`Match score: ${score}%`);
        
        // Create the match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            student_id: studentProfile.id,
            job_id: job.id,
            match_score: score,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (matchError) {
          console.error(`Error creating match: ${matchError.message}`);
        } else {
          console.log(`Created match with ID: ${match.id}`);
          matchCount++;
        }
      }
      
      console.log(`\nCreated ${matchCount} matches for test job ${job.title}`);
      console.log('Test complete. Check the opportunities page to see if the job appears.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the function
createTestJob(); 