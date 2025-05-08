"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as z from "zod";
import { JobStatus } from "@/lib/types/employer";

// Debug utility to check database schema and relationships
export async function checkDatabaseSchema() {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Check employers table structure
    console.log('[DEBUG] Checking employers table schema');
    const { data: employersColumns, error: employersError } = await supabaseClient
      .from('employers')
      .select('id, profile_id')
      .limit(1);
    
    console.log('[DEBUG] Employers table sample:', employersColumns);
    
    // Check jobs table structure
    console.log('[DEBUG] Checking jobs table schema');
    const { data: jobsColumns, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('id, employer_id')
      .limit(1);
    
    console.log('[DEBUG] Jobs table sample:', jobsColumns);
    
    // Check profiles table structure if it exists
    console.log('[DEBUG] Checking profiles table schema');
    try {
      const { data: profilesColumns, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id')
        .limit(1);
      
      console.log('[DEBUG] Profiles table sample:', profilesColumns);
      if (profilesError) {
        console.error('[DEBUG] Error querying profiles table:', profilesError);
      }
    } catch (e) {
      console.error('[DEBUG] Profiles table may not exist:', e);
    }
    
    // Check foreign key relationships
    console.log('[DEBUG] Checking foreign key relationships');
    try {
      const { data: foreignKeys, error: fkError } = await supabaseClient.rpc('get_foreign_keys');
      console.log('[DEBUG] Foreign keys:', foreignKeys);
      if (fkError) {
        console.error('[DEBUG] Error getting foreign keys:', fkError);
      }
    } catch (e) {
      console.error('[DEBUG] Could not check foreign keys:', e);
    }
    
    return { success: true, message: 'Schema check complete' };
  } catch (error) {
    console.error('[DEBUG] Error checking database schema:', error);
    return { success: false, error: 'Failed to check database schema' };
  }
}

// Diagnostic function to test different join approaches
export async function diagnoseJoinIssue() {
  try {
    console.log('[DIAGNOSE] Starting join issue diagnosis');
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return { error: 'No user found' };
    }
    
    // Get employer ID first
    const { data: employer } = await supabaseClient
      .from('employers')
      .select('id')
      .eq('profile_id', user.id)
      .single();
      
    if (!employer) {
      return { error: 'No employer found' };
    }
    
    console.log('[DIAGNOSE] Testing different join approaches for employer ID:', employer.id);
    
    // Approach 1: No join (baseline)
    try {
      console.log('[DIAGNOSE] Approach 1: No join');
      const { data: noJoinData, error: noJoinError } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('employer_id', employer.id)
        .limit(1);
        
      console.log('[DIAGNOSE] No join result:', { 
        success: !!noJoinData, 
        error: noJoinError?.message,
        data: noJoinData?.[0] 
      });
    } catch (e) {
      console.error('[DIAGNOSE] No join approach failed:', e);
    }
    
    // Approach 2: Foreign key reference
    try {
      console.log('[DIAGNOSE] Approach 2: Foreign key reference');
      const { data: fkData, error: fkError } = await supabaseClient
        .from('jobs')
        .select('*, employers:employer_id(company_name)')
        .eq('employer_id', employer.id)
        .limit(1);
        
      console.log('[DIAGNOSE] Foreign key reference result:', { 
        success: !!fkData, 
        error: fkError?.message,
        data: fkData?.[0] 
      });
    } catch (e) {
      console.error('[DIAGNOSE] Foreign key reference approach failed:', e);
    }
    
    // Approach 3: Explicit join
    try {
      console.log('[DIAGNOSE] Approach 3: Explicit join');
      const { data: explicitJoinData, error: explicitJoinError } = await supabaseClient
        .from('jobs')
        .select(`
          *,
          employers!inner(company_name)
        `)
        .eq('employer_id', employer.id)
        .limit(1);
        
      console.log('[DIAGNOSE] Explicit join result:', { 
        success: !!explicitJoinData, 
        error: explicitJoinError?.message,
        data: explicitJoinData?.[0] 
      });
    } catch (e) {
      console.error('[DIAGNOSE] Explicit join approach failed:', e);
    }
    
    // Approach 4: Manual join with two queries
    try {
      console.log('[DIAGNOSE] Approach 4: Manual join with two queries');
      const { data: jobsData } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('employer_id', employer.id)
        .limit(1);
        
      if (jobsData && jobsData.length > 0) {
        const { data: employerData } = await supabaseClient
          .from('employers')
          .select('company_name')
          .eq('id', jobsData[0].employer_id)
          .single();
          
        console.log('[DIAGNOSE] Manual join result:', { 
          job: jobsData[0],
          employer: employerData
        });
      }
    } catch (e) {
      console.error('[DIAGNOSE] Manual join approach failed:', e);
    }
    
    return { success: true, message: 'Join diagnosis complete' };
  } catch (error) {
    console.error('[DIAGNOSE] Error in join diagnosis:', error);
    return { error: 'Failed to diagnose join issue' };
  }
}

export async function getCompanyLocation() {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { error: "No user found" };
    }

    // Get employer profile for current user
    const { data, error } = await supabaseClient
      .from('employers')
      .select('company_address')
      .eq('profile_id', user.id)
      .single();
      
    if (error) {
      return { error: error.message };
    }

    return { companyAddress: data?.company_address || "" };
  } catch (error) {
    return { error: "Failed to fetch company location" };
  }
}

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  location: z.string().min(1, "Job location is required"),
  job_type: z.enum([
    "Full-time",
    "Part-time",
    "Contract",
    "Internship",
    "Freelance"
  ], {
    required_error: "Job type is required"
  }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  application_deadline: z.string().optional(),
  status: z.enum(["open", "closed", "draft"] as [JobStatus, ...JobStatus[]]).default("open"),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export async function createJob(data: FormValues) {
  try {
    console.log('[JOB] Starting createJob function');
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Get current user
    const userResult = await supabaseClient.auth.getUser();
    console.log('[JOB] User data:', { id: userResult.data.user?.id });
    const { data: { user } } = userResult;

    if (!user) {
      return { error: "No user found" };
    }

    // Get employer profile
    console.log('[JOB] Fetching employer profile for user ID:', user.id);
    const employerQuery = supabaseClient
      .from('employers')
      .select('profile_id, company_name')
      .eq('profile_id', user.id)
      .single();
    
    console.log('[JOB] Employer query:', employerQuery);
    const { data: employer, error: employerError } = await employerQuery;
    console.log('[JOB] Employer result:', { employer, error: employerError?.message });

    if (employerError) {
      console.error('[JOB] Error finding employer:', employerError);
      return { error: "Failed to find employer profile", details: employerError };
    }

    // Prepare job data
    const jobData = {
      employer_id: user.id, // employer_id in jobs table links to profiles.id, not employers.id
      title: data.title,
      company_name: employer.company_name,
      location: data.location,
      job_type: data.job_type,
      description: data.description,
      salary_range: (data.min_salary !== undefined && data.max_salary !== undefined) ? `${data.min_salary} - ${data.max_salary}` : (data.min_salary !== undefined ? `${data.min_salary}+` : (data.max_salary !== undefined ? `Up to ${data.max_salary}` : null)),
      status: data.status,
      application_deadline: data.application_deadline ? new Date(data.application_deadline).toISOString() : null,
      required_skills: JSON.stringify(data.required_skills),
      preferred_skills: data.preferred_skills ? JSON.stringify(data.preferred_skills) : null,
    };
    
    console.log('[JOB] Job data to insert:', jobData);
    console.log('[JOB] Raw job data:', { 
      required_skills: data.required_skills, 
      preferred_skills: data.preferred_skills,
      salary_range: jobData.salary_range 
    });

    // Create job with correct employer_id
    const insertQuery = supabaseClient
      .from('jobs')
      .insert(jobData);
    
    console.log('[JOB] Insert query:', insertQuery);
    const { error } = await insertQuery;
    console.log('[JOB] Insert result:', { error: error?.message, errorDetails: error });

    if (error) {
      console.error('[JOB] Error creating job:', error);
      return { error: error.message, details: error };
    }

    console.log('[JOB] Job created successfully');
    return { success: true };
  } catch (error) {
    console.error('[JOB] Unexpected error in createJob:', error);
    return { error: "Failed to create job", details: error };
  }
}

export async function updateJob(jobId: string, data: FormValues) {
  try {
    console.log('[JOB] Starting updateJob function', { jobId });
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Get current user
    const userResult = await supabaseClient.auth.getUser();
    console.log('[JOB] User data:', { id: userResult.data.user?.id });
    const { data: { user } } = userResult;

    if (!user) {
      return { error: "No user found" };
    }

    // Get employer profile
    console.log('[JOB] Fetching employer profile for user ID:', user.id);
    const employerQuery = supabaseClient
      .from('employers')
      .select('profile_id, company_name')
      .eq('profile_id', user.id)
      .single();
    
    console.log('[JOB] Employer query:', employerQuery);
    const { data: employer, error: employerError } = await employerQuery;
    console.log('[JOB] Employer result:', { employer, error: employerError?.message, errorDetails: employerError });

    if (employerError) {
      console.error('[JOB] Error finding employer:', employerError);
      return { error: "Failed to find employer profile", details: employerError };
    }

    // Verify job belongs to employer
    console.log('[JOB] Verifying job ownership for job ID:', jobId);
    const jobQuery = supabaseClient
      .from('jobs')
      .select('*, employer:employer_id(id)') // Select the 'id' from the joined 'profiles' table
      .eq('id', jobId)
      .single();
    
    // Use debugQuery to see the actual SQL being generated
    debugQuery(jobQuery, 'Job verification query');
    const { data: job, error: jobError } = await jobQuery;
    console.log('[JOB] Job verification result:', { job, error: jobError?.message });
    
    if (jobError || !job) {
      console.error('[JOB] Error finding job:', jobError);
      return { error: "Job not found", details: jobError };
    }

    // Compare job.employer_id with user.id since employer_id in jobs links to profiles.id
    if (job.employer_id !== user.id) {
      console.error('[JOB] Authorization error: Job employer ID does not match user ID', {
        jobEmployerId: job.employer_id,
        userId: user.id
      });
      return { error: "Not authorized to update this job" };
    }

    // Prepare update data
    const updateData = {
      title: data.title,
      company_name: employer.company_name,
      location: data.location,
      job_type: data.job_type,
      description: data.description,
      salary_range: (data.min_salary !== undefined && data.max_salary !== undefined) ? `${data.min_salary} - ${data.max_salary}` : (data.min_salary !== undefined ? `${data.min_salary}+` : (data.max_salary !== undefined ? `Up to ${data.max_salary}` : null)),
      status: data.status,
      application_deadline: data.application_deadline ? new Date(data.application_deadline).toISOString() : null,
      required_skills: JSON.stringify(data.required_skills),
      preferred_skills: data.preferred_skills ? JSON.stringify(data.preferred_skills) : null,
    };
    
    console.log('[JOB] Update data:', updateData);
    console.log('[JOB] Raw job data:', { 
      required_skills: data.required_skills, 
      preferred_skills: data.preferred_skills,
      salary_range: updateData.salary_range 
    });

    // Update job
    const updateQuery = supabaseClient
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);
    
    console.log('[JOB] Update query:', updateQuery);
    const { error } = await updateQuery;
    console.log('[JOB] Update result:', { error: error?.message, errorDetails: error });

    if (error) {
      console.error('[JOB] Error updating job:', error);
      return { error: error.message, details: error };
    }

    console.log('[JOB] Job updated successfully');
    return { success: true };
  } catch (error) {
    console.error('[JOB] Unexpected error in updateJob:', error);
    return { error: "Failed to update job", details: error };
  }
}

// Utility function to debug SQL queries
function debugQuery(query: any, label: string) {
  try {
    // Try to extract the SQL query if possible
    const queryObj = query?.toSQL ? query.toSQL() : query;
    console.log(`[JOB] ${label} SQL:`, {
      text: queryObj?.text || 'No SQL text available',
      params: queryObj?.params || 'No params available',
      query: query
    });
    return query;
  } catch (e) {
    console.log(`[JOB] Could not extract SQL for ${label}:`, e);
    return query;
  }
}

export async function getEmployerJobs(page: number = 1, limit: number = 10, status: string | null = null, search: string = "") {
  try {
    console.log('[JOB] Starting getEmployerJobs function');
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    console.log('[JOB] User data:', { id: user?.id });
    if (!user) {
      return { success: false, error: "No user found" };
    }

    // Check both possible employer ID references
    // 1. Jobs can have employer_id referencing profiles.id
    // 2. Jobs can have employer_id referencing employers.id
    let employerIdForQuery = user.id;
    try {
      const {data: employerProfile, error: empError} = await supabaseClient
        .from('employers')
        .select('id, profile_id')
        .eq('profile_id', user.id)
        .single();
      if (empError) {
        console.warn('[JOB] Could not fetch employer specific ID, falling back to user.id for jobs query. Error:', empError.message);
      } else if (employerProfile) {
        // First try using employer table ID
        employerIdForQuery = employerProfile.id;
        console.log('[JOB] Using employer.id for jobs query:', employerIdForQuery);
      }
    } catch (e) {
       console.warn('[JOB] Error fetching employer specific ID, falling back to user.id for jobs query. Exception:', e);
    }
    
    console.log('[JOB] Fetching jobs for employer_id:', employerIdForQuery);
    
    // Build the base query with filter conditions
    let query = supabaseClient.from('jobs').select('*');
    
    // Filter by employer ID using in()
    query = query.in('employer_id', [employerIdForQuery, user.id]);
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status.toLowerCase());
    }
    
    // Add search filter if provided
    if (search) {
      // We'll do a basic client-side search since complex or() doesn't work
      const { data: allJobs, error: jobsError } = await query;
      
      if (jobsError) {
        console.error('[JOB] Error fetching jobs:', jobsError);
        return { success: false, error: jobsError.message };
      }
      
      // Filter jobs by search terms client-side
      const searchLower = search.toLowerCase();
      const filteredJobs = allJobs.filter(job => 
        job.title.toLowerCase().includes(searchLower) || 
        job.description.toLowerCase().includes(searchLower) ||
        (job.company_name && job.company_name.toLowerCase().includes(searchLower))
      );
      
      // Apply pagination in memory
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedJobs = filteredJobs.slice(start, end);
      
      // Process jobs and add application counts
      const jobsWithCounts = await Promise.all(paginatedJobs.map(async (job) => {
        const appCount = await getApplicationCount(job.id, supabaseClient);
        return {
          ...job,
          required_skills: parseSkills(job.required_skills),
          preferred_skills: parseSkills(job.preferred_skills),
          application_count: appCount
        };
      }));
      
      return { 
        success: true, 
        data: { 
          jobs: jobsWithCounts, 
          total: filteredJobs.length 
        } 
      };
    }
    
    // Without search, use database queries with pagination
    // First get total count
    const { count, error: countError } = await query.count('exact');

    if (countError) {
      console.error('[JOB] Error counting jobs:', countError);
      return { success: false, error: countError.message };
    }
    
    const totalJobs = count || 0;
    
    // Then fetch paginated data
    const { data: jobs, error: jobsError } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (jobsError) {
      console.error('[JOB] Error fetching jobs:', jobsError);
      return { success: false, error: jobsError.message };
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('[JOB] No jobs found for employer ID:', employerIdForQuery);
      return { success: true, data: { jobs: [], total: 0 } };
    }
    
    console.log('[JOB] Found jobs:', jobs.length);
    
    // Now get application counts for each job
    const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
      try {
        const { count, error: countError } = await supabaseClient
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);
          
        if (countError) {
          console.error(`[JOB] Error counting applications for job ${job.id}:`, countError);
          return {
            ...job,
            required_skills: parseSkills(job.required_skills),
            preferred_skills: parseSkills(job.preferred_skills),
            application_count: 0
          };
        }
        
        console.log(`[JOB] Job ${job.id} has ${count} applications`);
        
        return {
          ...job,
          required_skills: parseSkills(job.required_skills),
          preferred_skills: parseSkills(job.preferred_skills),
          application_count: count || 0
        };
      } catch (error) {
        console.error(`[JOB] Error processing job ${job.id}:`, error);
        return {
          ...job,
          required_skills: [],
          preferred_skills: [],
          application_count: 0
        };
      }
    }));
    
    return { success: true, data: { jobs: jobsWithCounts, total: totalJobs } };
  } catch (error) {
    console.error('[JOB] Unexpected error in getEmployerJobs:', error);
    return { success: false, error: "Failed to fetch employer jobs" };
  }
}

// Helper function to get application count for a job
async function getApplicationCount(jobId: string, supabaseClient: any): Promise<number> {
  try {
    const { count, error } = await supabaseClient
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);
      
    if (error) {
      console.error(`[JOB] Error counting applications for job ${jobId}:`, error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error(`[JOB] Error getting application count for job ${jobId}:`, error);
    return 0;
  }
}

// Safe parsing utility function
function parseSkills(skillsData: any): string[] {
  if (!skillsData) return [];
  
  // If it's already an array, return it
  if (Array.isArray(skillsData)) return skillsData;
  
  // If it's a string that looks like JSON, try to parse it
  if (typeof skillsData === 'string') {
    try {
      // Check if it starts with [ which would indicate a JSON array
      if (skillsData.trim().startsWith('[')) {
        return JSON.parse(skillsData);
      } else {
        // If it's just a string like "JavaScript", wrap it in an array
        return [skillsData];
      }
    } catch (e) {
      console.log(`[JOB] Error parsing skills data: ${skillsData.substring(0, 30)}...`);
      return typeof skillsData === 'string' ? [skillsData] : [];
    }
  }
  
  return [];
}

export async function deleteJob(jobId: string) {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { error: "No user found" };
    }

    // Get employer profile
    const { data: employer, error: employerError } = await supabaseClient
      .from('employers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (employerError) {
      return { error: "Failed to find employer profile" };
    }

    // Verify job belongs to employer
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('employer_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return { error: "Job not found" };
    }

    if (job.employer_id !== user.id) {
      return { error: "Not authorized to delete this job" };
    }

    // Delete job
    const { error } = await supabaseClient
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete job" };
  }
}

export async function getJobById(jobId: string) {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No user found" };
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('[JOB] Error fetching job details:', jobError);
      return { success: false, error: "Job not found" };
    }

    // Get employer profile to verify ownership
    const { data: employer, error: employerError } = await supabaseClient
      .from('employers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    // Check if the user is authorized to view this job (either admin or the job's owner)
    const isOwner = job.employer_id === user.id;
    const isEmployerOwner = employer?.id === job.employer_id;
    
    if (!isOwner && !isEmployerOwner) {
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      const isAdmin = userProfile?.role === 'admin';
      
      if (!isAdmin) {
        return { success: false, error: "Not authorized to view this job" };
      }
    }

    // Process the job data
    return { 
      success: true, 
      data: {
        ...job,
        required_skills: parseSkills(job.required_skills),
        preferred_skills: parseSkills(job.preferred_skills)
      } 
    };
  } catch (error) {
    console.error('[JOB] Error in getJobById:', error);
    return { success: false, error: "Failed to fetch job details" };
  }
}
