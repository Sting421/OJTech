"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { ApiResponse } from "@/lib/types/database";
import {
  Job,
  CreateJobInput,
  UpdateJobInput,
  JobWithEmployer,
} from "@/lib/types/employer";
import { triggerMatchingForNewJob } from "./job-matching"; // Added import

// Helper function to safely parse JSON
function tryParseJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

interface JobWithEmployerProfile {
  employer_id: string;
  employer: {
    profile_id: string;
  } | null;
}

// Type guard to check if employer profile exists
function hasEmployerProfile(
  job: JobWithEmployerProfile
): job is JobWithEmployerProfile & { employer: { profile_id: string } } {
  return job.employer !== null;
}

/**
 * Create a new job posting
 */
export async function createJob(
  data: CreateJobInput
): Promise<ApiResponse<Job>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    console.log({ user });

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== "employer") {
      return {
        success: false,
        error: "Only employers can create job postings",
      };
    }

    // Get employer details
    const { data: employer, error: employerError } = await supabaseClient
      .from("employers")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (employerError) {
      if (employerError.code === "PGRST116") {
        return {
          success: false,
          error:
            "Employer profile not found. Please complete your profile first.",
        };
      }
      throw employerError;
    }

    // Create job posting with company information
    const { data: job, error } = await supabaseClient
      .from("jobs")
      .insert([
        {
          ...data,
          employer_id: user.id, // References profiles(id)
          // Use company_name from form data instead of employer.name
          company_logo_url: employer.company_logo_url || null,
          required_skills: data.required_skills || null, // Already JSONB
          preferred_skills: data.preferred_skills || null, // Already JSONB
          salary_range: data.salary_range
            ? `${data.salary_range.min}-${data.salary_range.max}`
            : null,
          status: data.status || "open",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Trigger job matching for the new job (asynchronous)
    if (job && job.id) {
      console.log(`[JOB] New job created: ${job.id}. Triggering matching.`);
      triggerMatchingForNewJob(job.id)
        .then((matchResult) => {
          if (matchResult.success) {
            console.log(
              `[JOB] Matching triggered for job ${job.id}: ${matchResult.data?.matchesCreated} created, ${matchResult.data?.matchesUpdated} updated.`
            );
          } else {
            console.error(
              `[JOB] Failed to trigger matching for job ${job.id}:`,
              matchResult.error
            );
          }
        })
        .catch((err) =>
          console.error("[JOB] Error during async job matching trigger:", err)
        );
    }

    return { success: true, data: job };
  } catch (error) {
    console.error("[JOB] Error creating job posting:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create job posting",
    };
  }
}

/**
 * Update a job posting
 */
export async function updateJob(
  jobId: string,
  data: UpdateJobInput
): Promise<ApiResponse<Job>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    console.log({ user });

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists and belongs to the employer - using a direct query
    // to avoid the employer.profile_id join that's causing issues
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select(`*`)
      .eq("id", jobId)
      .single();

    if (jobError) {
      if (jobError.code === "PGRST116") {
        // Record not found
        return { success: false, error: "Job posting not found" };
      }
      throw jobError;
    }

    // Check if user is the owner or an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Direct ownership check without using the join
    const isOwner = job.employer_id === user.id;
    const isAdmin = profile.role === "admin";

    if (!isAdmin && !isOwner) {
      return {
        success: false,
        error: "You don't have permission to update this job posting",
      };
    }

    // Prepare update data
    const updateData: any = { ...data };

    // Handle JSONB fields - ensure they're arrays
    if (data.required_skills) {
      updateData.required_skills = Array.isArray(data.required_skills)
        ? data.required_skills
        : [];
    }

    if (data.preferred_skills) {
      updateData.preferred_skills = Array.isArray(data.preferred_skills)
        ? data.preferred_skills
        : null;
    }

    if (data.salary_range) {
      updateData.salary_range = `${data.salary_range.min}-${data.salary_range.max}`; // VARCHAR
    }

    // Log what we're updating
    console.log("[JOB] Updating job with data:", updateData);

    // Update job posting
    const { data: updatedJob, error } = await supabaseClient
      .from("jobs")
      .update(updateData)
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      console.error("[JOB] SQL error updating job:", error);
      throw error;
    }

    // Trigger job matching for the updated job (asynchronous)
    if (updatedJob && updatedJob.id) {
      console.log(`[JOB] Job updated: ${updatedJob.id}. Triggering matching.`);
      triggerMatchingForNewJob(updatedJob.id)
        .then((matchResult) => {
          if (matchResult.success) {
            console.log(
              `[JOB] Matching triggered for job ${updatedJob.id}: ${matchResult.data?.matchesCreated} created, ${matchResult.data?.matchesUpdated} updated.`
            );
          } else {
            console.error(
              `[JOB] Failed to trigger matching for job ${updatedJob.id}:`,
              matchResult.error
            );
          }
        })
        .catch((err) =>
          console.error("[JOB] Error during async job matching trigger:", err)
        );
    }

    return { success: true, data: updatedJob };
  } catch (error) {
    console.error("[JOB] Error updating job posting:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update job posting",
    };
  }
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<ApiResponse<null>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    console.log({ user });

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists and belongs to the employer - using direct query
    // to avoid the profile_id join that's causing issues
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select(`employer_id`)
      .eq("id", jobId)
      .single();

    if (jobError) {
      if (jobError.code === "PGRST116") {
        // Record not found
        return { success: false, error: "Job posting not found" };
      }
      throw jobError;
    }

    // Check if user is the owner or an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Direct ownership check
    const isOwner = job.employer_id === user.id;
    const isAdmin = profile.role === "admin";

    if (!isAdmin && !isOwner) {
      return {
        success: false,
        error: "You don't have permission to delete this job posting",
      };
    }

    // Delete job posting
    const { error } = await supabaseClient
      .from("jobs")
      .delete()
      .eq("id", jobId);

    if (error) {
      console.error("[JOB] SQL error deleting job:", error);
      throw error;
    }

    return { success: true, data: null };
  } catch (error) {
    console.error("[JOB] Error deleting job posting:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete job posting",
    };
  }
}

/**
 * Get a job posting by ID
 */
export async function getJobById(
  jobId: string
): Promise<ApiResponse<JobWithEmployer>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    console.log({ user });

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    const { data: job, error } = await supabaseClient
      .from("jobs")
      .select(
        `
        *,
        employer:employer_id (
          *
        )
      `
      )
      .eq("id", jobId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Record not found
        return { success: false, error: "Job posting not found" };
      }
      throw error;
    }

    // Log raw job data for debugging
    console.log("[JOB] Raw job data:", {
      required_skills: job.required_skills,
      preferred_skills: job.preferred_skills,
      salary_range: job.salary_range,
    });

    // Process required_skills correctly
    let requiredSkills = [];
    if (Array.isArray(job.required_skills)) {
      // If it's already an array, use it as is
      requiredSkills = job.required_skills;
    } else if (typeof job.required_skills === "string") {
      // If it's a string, try to parse it
      try {
        requiredSkills = JSON.parse(job.required_skills);
      } catch (e) {
        console.error("[JOB] Error parsing required_skills:", e);
        requiredSkills = [];
      }
    } else if (job.required_skills && typeof job.required_skills === "object") {
      // If it's already an object but not an array (like a JSONB object), convert appropriately
      requiredSkills = Object.values(job.required_skills);
    }

    // Process preferred_skills similarly
    let preferredSkills = [];
    if (Array.isArray(job.preferred_skills)) {
      preferredSkills = job.preferred_skills;
    } else if (typeof job.preferred_skills === "string") {
      try {
        preferredSkills = JSON.parse(job.preferred_skills);
      } catch (e) {
        console.error("[JOB] Error parsing preferred_skills:", e);
        preferredSkills = [];
      }
    } else if (
      job.preferred_skills &&
      typeof job.preferred_skills === "object"
    ) {
      preferredSkills = Object.values(job.preferred_skills);
    }

    // Use JSONB fields for skills and parse salary range
    const parsedJob = {
      ...job,
      required_skills: requiredSkills,
      preferred_skills: preferredSkills,
      salary_range: job.salary_range
        ? (() => {
            const [min, max] = job.salary_range.split("-");
            return { min: parseInt(min), max: parseInt(max) };
          })()
        : null,
    };

    // Log parsed job data for debugging
    console.log("[JOB] Parsed job data:", {
      required_skills: parsedJob.required_skills,
      preferred_skills: parsedJob.preferred_skills,
      salary_range: parsedJob.salary_range,
    });

    return { success: true, data: parsedJob };
  } catch (error) {
    console.error("[JOB] Error getting job posting:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch job posting",
    };
  }
}

/**
 * Get job postings by employer ID
 */
export async function getJobsByEmployer(
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<ApiResponse<{ jobs: Job[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    console.log({ user });

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== "employer") {
      return { success: false, error: "User is not an employer" };
    }

    // Get employer profile
    const { data: employer, error: employerError } = await supabaseClient
      .from("employers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (employerError) {
      if (employerError.code === "PGRST116") {
        // Record not found
        return { success: false, error: "Employer profile not found" };
      }
      throw employerError;
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query to check for both employer.id and user.id
    let query = supabaseClient
      .from("jobs")
      .select("*", { count: "exact" })
      .or(`employer_id.eq.${employer.id},employer_id.eq.${user.id}`);

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination and ordering
    query = query.range(from, to).order("created_at", { ascending: false });

    const { data: jobs, error, count } = await query;

    if (error) throw error;

    // Get application counts for all jobs - one by one since group by isn't supported
    const jobIds = (jobs || []).map((job) => job.id);
    let applicationCounts: Record<string, number> = {};

    if (jobIds.length > 0) {
      // Process each job ID separately
      await Promise.all(
        jobIds.map(async (jobId) => {
          const { count, error } = await supabaseClient
            .from("job_applications")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId);

          if (!error && count !== null) {
            applicationCounts[jobId] = count;
          }
        })
      );
    }

    // Parse jobs data with consistent format
    const parsedJobs = (jobs || []).map((job) => ({
      ...job,
      required_skills: tryParseJSON(job.required_skills) || [],
      preferred_skills: tryParseJSON(job.preferred_skills) || null,
      salary_range: job.salary_range
        ? (() => {
            const [min, max] = job.salary_range.split("-");
            return { min: parseInt(min), max: parseInt(max) };
          })()
        : null,
      application_count: applicationCounts[job.id] || 0,
    }));

    return {
      success: true,
      data: {
        jobs: parsedJobs,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error("[JOB] Error getting employer job postings:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch job postings",
    };
  }
}

/**
 * Get all job postings with filters
 */
export async function getAllJobs(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    jobType?: string;
    location?: string;
    search?: string;
  }
): Promise<ApiResponse<{ jobs: JobWithEmployer[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabaseClient.from("jobs").select(
      `
        *,
        employer:employer_id (
          *
        )
      `,
      { count: "exact" }
    );

    // Apply filters if provided
    if (filters?.status) {
      query = query.eq("status", filters.status);
    } else {
      // Default to active jobs only
      query = query.eq("status", "active");
    }

    if (filters?.jobType) {
      query = query.eq("job_type", filters.jobType);
    }

    if (filters?.location) {
      query = query.ilike("location", `%${filters.location}%`);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Apply pagination and ordering
    query = query.range(from, to).order("created_at", { ascending: false });

    const { data: jobs, error, count } = await query;

    if (error) throw error;

    // Parse jobs data with consistent format
    const parsedJobs = (jobs || []).map((job) => ({
      ...job,
      required_skills: tryParseJSON(job.required_skills) || [],
      preferred_skills: tryParseJSON(job.preferred_skills) || null,
      salary_range: job.salary_range
        ? (() => {
            const [min, max] = job.salary_range.split("-");
            return { min: parseInt(min), max: parseInt(max) };
          })()
        : null,
    }));

    return {
      success: true,
      data: {
        jobs: parsedJobs,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error("[JOB] Error getting all job postings:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch job postings",
    };
  }
}
