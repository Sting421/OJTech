"use server";

import { supabase } from "@/lib/supabase";
import { Job, ApiResponse } from "@/lib/types/database";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Get job by ID
export async function getJobById(id: string): Promise<ApiResponse<Job>> {
  try {
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: job };
  } catch (error) {
    console.error("Error fetching job:", error);
    return { success: false, error: "Failed to fetch job" };
  }
}

// Get all jobs (with optional filters)
export async function getJobs(
  filters?: {
    isActive?: boolean;
    employerId?: string;
    searchQuery?: string;
  },
  page = 1,
  limit = 10
): Promise<ApiResponse<{ jobs: Job[]; total: number }>> {
  try {
    let query = supabase.from("jobs").select("*", { count: "exact" });

    // Apply filters if provided
    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    if (filters?.employerId) {
      query = query.eq("employer_id", filters.employerId);
    }

    if (filters?.searchQuery) {
      query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: jobs, error, count } = await query;

    if (error) throw error;
    
    return { 
      success: true, 
      data: { 
        jobs: jobs || [],
        total: count || 0 
      }
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return { success: false, error: "Failed to fetch jobs" };
  }
}

// Get current employer's jobs
export async function getCurrentEmployerJobs(
  page = 1,
  limit = 10
): Promise<ApiResponse<{ jobs: Job[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // First check if the user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "employer") {
      return { success: false, error: "Only employers can access their job listings" };
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: jobs, error, count } = await supabaseClient
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    return { 
      success: true, 
      data: { 
        jobs: jobs || [],
        total: count || 0 
      }
    };
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    return { success: false, error: "Failed to fetch employer jobs" };
  }
}

// Create job
export async function createJob(
  job: Omit<Job, "id" | "created_at" | "employer_id">
): Promise<ApiResponse<Job>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // First check if the user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "employer") {
      return { success: false, error: "Only employers can create job listings" };
    }

    const { data, error } = await supabaseClient
      .from("jobs")
      .insert([{
        ...job,
        employer_id: user.id
      }])
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error("Error creating job:", error);
    return { success: false, error: "Failed to create job" };
  }
}

// Update job
export async function updateJob(
  id: string,
  job: Partial<Omit<Job, "id" | "created_at" | "employer_id">>
): Promise<ApiResponse<Job>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists and belongs to this employer
    const { data: existingJob, error: jobError } = await supabaseClient
      .from("jobs")
      .select("employer_id")
      .eq("id", id)
      .single();

    if (jobError) throw jobError;
    
    if (existingJob.employer_id !== user.id) {
      return { success: false, error: "You do not have permission to update this job" };
    }

    const { data, error } = await supabaseClient
      .from("jobs")
      .update(job)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error("Error updating job:", error);
    return { success: false, error: "Failed to update job" };
  }
}

// Delete job
export async function deleteJob(id: string): Promise<ApiResponse<void>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists and belongs to this employer
    const { data: existingJob, error: jobError } = await supabaseClient
      .from("jobs")
      .select("employer_id")
      .eq("id", id)
      .single();

    if (jobError) throw jobError;
    
    if (existingJob.employer_id !== user.id) {
      return { success: false, error: "You do not have permission to delete this job" };
    }

    const { error } = await supabaseClient
      .from("jobs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting job:", error);
    return { success: false, error: "Failed to delete job" };
  }
} 