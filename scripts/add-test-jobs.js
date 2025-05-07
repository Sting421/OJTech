#!/usr/bin/env node

/**
 * Add test job data to Supabase
 * Run with: node scripts/add-test-jobs.js
 */

// Load environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('=== Adding Test Jobs to Supabase ===');
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Supabase environment variables are not set');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
  
  // Find any user to set as the employer
  console.log('Fetching a user to set as employer...');
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (userError || !users || users.length === 0) {
    console.error('❌ Error: Could not find any user to set as employer:', userError);
    console.log('Creating test jobs requires at least one user in the profiles table.');
    process.exit(1);
  }
  
  const employerId = users[0].id;
  console.log(`Using user ${employerId} as employer`);
  
  // Define test jobs according to actual schema
  const testJobs = [
    {
      title: "Frontend Developer",
      description: "Looking for an experienced Frontend Developer proficient in React and TypeScript.",
      company_name: "Tech Corp",
      company_logo_url: "https://placehold.co/100x100?text=TC",
      location: "Singapore",
      job_type: "Full-time",
      salary_range: "$4,000 - $7,000",
      requirements: [
        "3+ years of experience with React",
        "Strong TypeScript skills",
        "Experience with Next.js",
        "Understanding of UI/UX principles"
      ],
      responsibilities: [
        "Develop and maintain web applications",
        "Collaborate with designers and backend developers",
        "Optimize application for maximum speed and scalability",
        "Write clean, maintainable code"
      ],
      required_skills: [
        "React",
        "TypeScript",
        "Next.js",
        "HTML5",
        "CSS3",
        "Responsive Design"
      ],
      employer_id: employerId,
      status: "open",
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "Backend Engineer",
      description: "Seeking a Backend Engineer with strong Node.js and database experience.",
      company_name: "Data Systems",
      company_logo_url: "https://placehold.co/100x100?text=DS",
      location: "Remote",
      job_type: "Full-time",
      salary_range: "$5,000 - $8,000",
      requirements: [
        "4+ years of backend development",
        "Strong Node.js experience",
        "Database design and optimization",
        "API development expertise"
      ],
      responsibilities: [
        "Design and implement scalable backend services",
        "Manage database architecture",
        "Integrate third-party services",
        "Ensure security best practices"
      ],
      required_skills: [
        "Node.js",
        "Express",
        "MongoDB",
        "SQL",
        "API Development",
        "AWS",
        "Docker"
      ],
      employer_id: employerId,
      status: "open",
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "UX Designer",
      description: "Join our team as a UX Designer to create beautiful and functional interfaces.",
      company_name: "Creative Studio",
      company_logo_url: "https://placehold.co/100x100?text=CS",
      location: "Singapore",
      job_type: "Contract",
      salary_range: "$4,500 - $7,500",
      requirements: [
        "3+ years of UX design experience",
        "Proficiency in Figma or similar tools",
        "Strong portfolio of work",
        "User research experience"
      ],
      responsibilities: [
        "Create user-centered designs",
        "Conduct user research and testing",
        "Develop wireframes and prototypes",
        "Collaborate with developers"
      ],
      required_skills: [
        "UI Design",
        "User Research",
        "Wireframing",
        "Prototyping",
        "Figma",
        "Adobe Creative Suite",
        "User Testing"
      ],
      employer_id: employerId,
      status: "open",
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  console.log(`Adding ${testJobs.length} test jobs to Supabase...`);
  
  // Insert jobs
  const { data, error } = await supabase
    .from('jobs')
    .insert(testJobs)
    .select();
  
  if (error) {
    console.error('❌ Error inserting jobs:', error);
    process.exit(1);
  }
  
  console.log(`✅ Successfully added ${data?.length || 0} jobs to Supabase!`);
  console.log('Job IDs:', data.map(job => job.id).join(', '));
  console.log('\nYou can now test job matching functionality.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 