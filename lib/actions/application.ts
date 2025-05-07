"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { ApiResponse } from "@/lib/types/database";
import { JobApplication, JobApplicationWithRelations } from "@/lib/types/employer";

/**
 * Apply for a job
 */
export async function applyForJob(
  jobId: string,
  cvId: string,
  coverLetter?: string
): Promise<ApiResponse<JobApplication>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is a student
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "student") {
      return { success: false, error: "Only students can apply for jobs" };
    }

    // Check if job exists and is active
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select("id, status")
      .eq("id", jobId)
      .single();

    if (jobError) {
      if (jobError.code === "PGRST116") { // Record not found
        return { success: false, error: "Job posting not found" };
      }
      throw jobError;
    }

    if (job.status !== "active") {
      return { success: false, error: "This job posting is not currently accepting applications" };
    }

    // Check if CV exists and belongs to the user
    const { data: cv, error: cvError } = await supabaseClient
      .from("cvs")
      .select("id")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (cvError) {
      if (cvError.code === "PGRST116") { // Record not found
        return { success: false, error: "CV not found or not owned by you" };
      }
      throw cvError;
    }

    // Check if user has already applied for this job
    const { data: existingApplication, error: checkError } = await supabaseClient
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (checkError) throw checkError;
    
    if (existingApplication) {
      return { success: false, error: "You have already applied for this job" };
    }

    // Create application
    const { data: application, error } = await supabaseClient
      .from("job_applications")
      .insert([{
        job_id: jobId,
        student_id: user.id,
        cv_id: cvId,
        cover_letter: coverLetter || null,
        status: "pending"
      }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: application };
  } catch (error) {
    console.error("[APPLICATION] Error applying for job:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to submit job application" 
    };
  }
}

/**
 * Get applications for a job (for employers)
 */
export async function getApplicationsForJob(
  jobId: string,
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<ApiResponse<{ applications: JobApplicationWithRelations[]; total: number }>> {
  try {
    console.log("[getApplicationsForJob] Starting with job ID:", jobId);
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    console.log("[getApplicationsForJob] Current user:", user?.id);
    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists
    console.log("[getApplicationsForJob] Checking job ownership...");
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select("employer_id")
      .eq("id", jobId)
      .single();

    console.log("[getApplicationsForJob] Job data:", job, "Error:", jobError);
    
    if (jobError) {
      if (jobError.code === "PGRST116") { // Record not found
        return { success: false, error: "Job posting not found" };
      }
      throw jobError;
    }

    // Check if user is the owner or an admin
    console.log("[getApplicationsForJob] Checking user role...");
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("[getApplicationsForJob] User profile:", profile, "Error:", profileError);
    
    if (profileError) throw profileError;
    
    // Check authorization - direct comparison of IDs
    const isOwner = job.employer_id === user.id;
    const isAdmin = profile.role === "admin";
    
    console.log("[getApplicationsForJob] Authorization check: user.id=", user.id, 
      "job.employer_id=", job.employer_id, 
      "isOwner=", isOwner, 
      "isAdmin=", isAdmin);
    
    if (!isAdmin && !isOwner) {
      // If user is neither admin nor job owner, check if they're an employer first
      console.log("[getApplicationsForJob] User is not admin or direct owner, checking employer status");
      try {
        const { data: employer } = await supabaseClient
          .from("employers")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        
        const employerIsOwner = employer?.id === job.employer_id;
        console.log("[getApplicationsForJob] Employer check: employer?.id=", employer?.id, 
          "job.employer_id=", job.employer_id,
          "employerIsOwner=", employerIsOwner);
        
        if (!employerIsOwner) {
          console.log("[getApplicationsForJob] Authorization failed - not owner or admin");
          return { success: false, error: "You don't have permission to view these applications" };
        }
      } catch (e) {
        console.log("[getApplicationsForJob] Error checking employer:", e);
        return { success: false, error: "You don't have permission to view these applications" };
      }
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    console.log("[getApplicationsForJob] Building applications query...");
    let query = supabaseClient
      .from("job_applications")
      .select(`
        *,
        student:student_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        cv:cv_id (
          file_url,
          skills
        )
      `, { count: "exact" })
      .eq("job_id", jobId);

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination and ordering
    query = query
      .range(from, to)
      .order("created_at", { ascending: false });

    console.log("[getApplicationsForJob] Executing applications query for job_id:", jobId);
    const { data: applications, error, count } = await query;
    
    console.log("[getApplicationsForJob] Applications result:", 
      "Count:", count, 
      "Error:", error, 
      "First application:", applications?.[0] ? { id: applications[0].id } : "none"
    );

    if (error) throw error;

    return { 
      success: true, 
      data: { 
        applications: applications || [], 
        total: count || 0 
      } 
    };
  } catch (error) {
    console.error("[APPLICATION] Error getting job applications:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch job applications" 
    };
  }
}

/**
 * Update application status (for employers)
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  notes?: string
): Promise<ApiResponse<JobApplication>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Get application with job info
    const { data: application, error: appError } = await supabaseClient
      .from("job_applications")
      .select(`
        *,
        job:job_id (
          employer_id,
          employer:employer_id (
            profile_id
          )
        )
      `)
      .eq("id", applicationId)
      .single();

    if (appError) {
      if (appError.code === "PGRST116") { // Record not found
        return { success: false, error: "Application not found" };
      }
      throw appError;
    }

    // Check if user is the employer or an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "admin" && application.job.employer.profile_id !== user.id) {
      return { success: false, error: "You don't have permission to update this application" };
    }

    // Validate status
    const validStatuses = ["pending", "reviewed", "shortlisted", "rejected"];
    if (!validStatuses.includes(status)) {
      return { 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
      };
    }

    // Update application
    const updateData: any = { status };
    if (notes !== undefined) {
      updateData.employer_notes = notes;
    }

    const { data: updatedApplication, error } = await supabaseClient
      .from("job_applications")
      .update(updateData)
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: updatedApplication };
  } catch (error) {
    console.error("[APPLICATION] Error updating application status:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update application status" 
    };
  }
}

/**
 * Get applications for a student
 */
export async function getStudentApplications(
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<ApiResponse<{ applications: JobApplicationWithRelations[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is a student
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "student") {
      return { success: false, error: "User is not a student" };
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabaseClient
      .from("job_applications")
      .select(`
        *,
        job:job_id (
          id,
          title,
          description,
          job_type,
          location,
          status,
          employer_id,
          company_name,
          required_skills
        )
      `, { count: "exact" })
      .eq("student_id", user.id);

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination and ordering
    query = query
      .range(from, to)
      .order("created_at", { ascending: false });

    const { data: applications, error, count } = await query;

    if (error) throw error;

    return { 
      success: true, 
      data: { 
        applications: applications || [], 
        total: count || 0 
      } 
    };
  } catch (error) {
    console.error("[APPLICATION] Error getting student applications:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch your job applications" 
    };
  }
} 