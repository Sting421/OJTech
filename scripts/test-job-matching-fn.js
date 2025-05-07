import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJobMatching() {
  try {
    console.log('Creating test job...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: 'Test Full Stack Developer',
        description: `We are looking for a Full Stack Developer with:
          - Strong React and Next.js experience
          - Node.js backend development
          - Database design and optimization
          - Cloud infrastructure experience
          - Good communication skills`,
        required_skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL'],
        status: 'open',
        company_name: 'Test Company',
        employer_id: (await supabase.from('profiles').select('id').eq('role', 'employer').single()).data.id
      })
      .select()
      .single();

    if (jobError) throw jobError;
    console.log('Test job created:', job.id);

    // Wait a moment for the trigger to fire
    console.log('Waiting for matches to be calculated...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check matches
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        match_score,
        jobs (
          title,
          required_skills
        ),
        cvs (
          skills
        )
      `)
      .eq('job_id', job.id)
      .order('match_score', { ascending: false });

    if (matchError) throw matchError;

    console.log('\nMatches found:', matches.length);
    matches.forEach(match => {
      console.log(`\nMatch Score: ${match.match_score}%`);
      console.log('Job:', match.jobs.title);
      console.log('Required Skills:', match.jobs.required_skills);
      console.log('CV Skills:', match.cvs.skills.skills);
    });

  } catch (error) {
    console.error('Error testing job matching:', error);
  }
}

testJobMatching();
