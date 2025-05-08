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

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job exists and get the employer_id
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select("id, employer_id")
      .eq("id", jobId)
      .single();
    
    if (jobError) {
      if (jobError.code === "PGRST116") { // Record not found
        return { success: false, error: "Job posting not found" };
      }
      console.error("[getApplicationsForJob] Error fetching job:", jobError);
      return { success: false, error: "Error fetching job details" };
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[getApplicationsForJob] Error fetching user profile:", profileError);
      return { success: false, error: "Error fetching user profile" };
    }
    
    // Check authorization
    const isAdmin = profile.role === "admin";
    const isOwner = job.employer_id === user.id;
    
    // If user is neither admin nor direct owner, check if they're associated with an employer
    if (!isAdmin && !isOwner) {
        const { data: employer } = await supabaseClient
          .from("employers")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        
        const employerIsOwner = employer?.id === job.employer_id;
        
        if (!employerIsOwner) {
        return { success: false, error: "You don't have permission to view these applications" };
      }
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // First, get the basic job applications
    let query = supabaseClient
      .from("job_applications")
      .select('*', { count: "exact" })
      .eq("job_id", jobId);

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination and ordering
    query = query
      .range(from, to)
      .order("created_at", { ascending: false });

    // Execute the query
    const { data: applications, error, count } = await query;
    
    if (error) {
      console.error("[getApplicationsForJob] Error fetching applications:", error);
      return { success: false, error: "Error fetching applications" };
    }

    // If we have applications, fetch related data separately
    if (applications && applications.length > 0) {
      // Get all student ids
      const studentIds = applications.map(app => app.student_id);
      
      // Fetch student profiles
      const { data: students } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", studentIds);
      
      // Create a map of student_id to student data
      const studentMap = (students || []).reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {} as Record<string, any>);
      
      // Get all CV ids
      const cvIds = applications.map(app => app.cv_id).filter(Boolean);
      
      // Fetch CV data if there are any
      let cvMap: Record<string, any> = {};
      if (cvIds.length > 0) {
        const { data: cvs } = await supabaseClient
          .from("cvs")
          .select("id, skills, extracted_skills")
          .in("id", cvIds);
        
        // Create a map of cv_id to cv data
        cvMap = (cvs || []).reduce((acc, cv) => {
          acc[cv.id] = cv;
          return acc;
        }, {} as Record<string, any>);
      }
      
      // Get student_profiles IDs for looking up match scores
      const emails = students?.map(s => s.email).filter(Boolean) || [];
      let studentProfileMap: Record<string, string> = {};
      let studentProfileDataMap: Record<string, any> = {}; // Map to store full student_profile data
      
      if (emails.length > 0) {
        const { data: studentProfiles } = await supabaseClient
          .from("student_profiles")
          .select("id, profile_id, school_email, university, course, year_level, phone_number, bio")
          .in("school_email", emails);
        
        // Create a map of school_email to student_profile id
        studentProfileMap = (studentProfiles || []).reduce((acc, profile) => {
          acc[profile.school_email] = profile.id;
          return acc;
        }, {} as Record<string, string>);
        
        // Create a map of profile_id to student_profile data
        studentProfileDataMap = (studentProfiles || []).reduce((acc, profile) => {
          acc[profile.profile_id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
      
      // Get match scores from the matches table
      const studentProfileIds = Object.values(studentProfileMap);
      let matchScoreMap: Record<string, number> = {};
      
      if (studentProfileIds.length > 0) {
        const { data: matches } = await supabaseClient
          .from("matches")
          .select("student_id, job_id, match_score")
          .eq("job_id", jobId)
          .in("student_id", studentProfileIds);
        
        // Create a map for student_profile_id+job_id to match_score
        matchScoreMap = (matches || []).reduce((acc, match) => {
          const key = `${match.student_id}_${match.job_id}`;
          acc[key] = match.match_score;
          return acc;
        }, {} as Record<string, number>);
      }
      
      // Add student, student_profile, and CV data to each application
      applications.forEach(app => {
        app.student = studentMap[app.student_id] || null;
        app.cv = cvMap[app.cv_id] || null;
        
        // Add student_profile data if available
        if (app.student_id) {
          app.student_profile = studentProfileDataMap[app.student_id] || null;
        }
        
        // Add match score if available
        if (app.student?.email) {
          const studentProfileId = studentProfileMap[app.student.email];
          if (studentProfileId) {
            const matchKey = `${studentProfileId}_${app.job_id}`;
            app.match_score = matchScoreMap[matchKey] || null;
          }
        }
      });
    }

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
      .select("role, email")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "student") {
      return { success: false, error: "User is not a student" };
    }

    // Get the student_profiles.id for this user that's used in the matches table
    const { data: studentProfile } = await supabaseClient
      .from("student_profiles")
      .select("id")
      .eq("school_email", profile.email)
      .maybeSingle();

    const studentId = studentProfile?.id;

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

    // If we have a student profile ID and applications, fetch match scores
    if (studentId && applications && applications.length > 0) {
      // Get all job IDs
      const jobIds = applications.map(app => app.job_id);
      
      // Fetch match scores for these job IDs
      const { data: matches } = await supabaseClient
        .from("matches")
        .select("job_id, match_score")
        .eq("student_id", studentId)
        .in("job_id", jobIds);
      
      // Create a map of job_id to match_score
      const matchScores = (matches || []).reduce((acc, match) => {
        acc[match.job_id] = match.match_score;
        return acc;
      }, {} as Record<string, number>);
      
      // Add match_score to each application
      applications.forEach(app => {
        if (matchScores[app.job_id]) {
          app.match_score = matchScores[app.job_id];
        }
      });
    }

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