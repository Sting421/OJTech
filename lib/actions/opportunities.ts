"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { ApiResponse, Job, CV } from "@/lib/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 20000; // 20 seconds timeout

interface JobWithMatchScore extends Job {
  match_score: number | null;
  company_name?: string | null;
  location?: string | null;
  job_type?: string | null;
  salary_range?: string | null;
  required_skills?: string[] | null;
}

/**
 * Get job opportunities for the current user, sorted by match score.
 * Filters out jobs already applied to or declined.
 */
export async function getMatchedJobsForCurrentUser(): Promise<ApiResponse<JobWithMatchScore[]>> {
  console.log("[OPPORTUNITIES] Fetching matched jobs for current user");
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    // Find student profile for the user
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();
      
    if (!userProfile?.email) {
      console.error("[OPPORTUNITIES] User email not found:", user.id);
      return { success: false, error: "User profile not found" };
    }
    
    // Find student profile using email
    const { data: studentProfile } = await supabaseClient
      .from("student_profiles")
      .select("id")
      .eq("school_email", userProfile.email)
      .maybeSingle();
      
    if (!studentProfile?.id) {
      console.error("[OPPORTUNITIES] Student profile not found for email:", userProfile.email);
      return { success: false, error: "Student profile not found" };
    }
    
    const studentId = studentProfile.id;
    console.log("[OPPORTUNITIES] Found student profile:", studentId);

    // Get all pending matches for this student
    console.log("[OPPORTUNITIES] Fetching matches for student profile:", studentId);
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("job_id, match_score, status")
      .eq("student_id", studentId)
      .eq("status", "pending");
      
    if (matchesError) {
      console.error("[OPPORTUNITIES] Error fetching matches:", matchesError.message);
      return { success: false, error: "Failed to fetch matches" };
    }
    
    if (!matches || matches.length === 0) {
      console.log("[OPPORTUNITIES] No pending matches found for student:", studentId);
      return { success: true, data: [] };
    }
    
    console.log("[OPPORTUNITIES] Found", matches.length, "matches, fetching job details");
    
    // Get job details for all matches
    const jobIds = matches.map(match => match.job_id);
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .in("id", jobIds)
      .eq("status", "open");
      
    if (jobsError) {
      console.error("[OPPORTUNITIES] Error fetching jobs:", jobsError.message);
      return { success: false, error: "Failed to fetch job details" };
    }
    
    // Combine job details with match scores
    const jobsWithScores: JobWithMatchScore[] = jobs.map(job => {
      const matchInfo = matches.find(m => m.job_id === job.id);
      return {
        ...job,
        match_score: matchInfo?.match_score || null,
        // Ensure required_skills is an array
        required_skills: Array.isArray(job.required_skills) ? job.required_skills :
          (job.required_skills ? Object.values(job.required_skills) : [])
      };
    });
    
    // Sort by match score (highest first)
    jobsWithScores.sort((a, b) => {
      if (a.match_score === null) return 1;
      if (b.match_score === null) return -1;
      return b.match_score - a.match_score;
    });

    console.log("[OPPORTUNITIES] Returning", jobsWithScores.length, "matched jobs");
    return { success: true, data: jobsWithScores };

  } catch (error: any) {
    console.error("[OPPORTUNITIES] Unexpected error fetching matched jobs:", error);
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
}

/**
 * Generate a recommendation letter using Gemini.
 */
async function generateRecommendationLetter(applicantName: string, cvData: any, jobDetails: Job): Promise<string> {
  console.log(`[OPPORTUNITIES] Generating recommendation letter for ${applicantName} applying to ${jobDetails.title}`);
  try {
    const prompt = `
      Generate a concise and professional recommendation letter for ${applicantName} applying for the ${jobDetails.title} position at ${jobDetails.company_name ?? 'the company'}.
      
      Highlight the candidate's key strengths based on their resume data relevant to the job requirements.
      Keep the tone positive and persuasive.
      The letter should be addressed generically (e.g., "Dear Hiring Manager,") and signed off as "OJTech Placement System".
      
      Candidate's Resume Data:
      Summary: ${cvData?.summary ?? 'N/A'}
      Skills: ${(cvData?.skills ?? []).join(', ')}
      Relevant Experience: ${JSON.stringify((cvData?.experience ?? []).slice(0, 2), null, 2)}
      
      Job Details:
      Title: ${jobDetails.title}
      Description: ${jobDetails.description}
      Required Skills: ${(jobDetails.required_skills ?? []).join(', ')}
      
      Generate only the recommendation letter text.
    `;

    const model = genAI.getGenerativeModel({ model: MODEL });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API call timed out for recommendation letter")), GEMINI_TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]) as any;

    const letter = result.response.text();
    console.log(`[OPPORTUNITIES] Recommendation letter generated successfully.`);
    return letter;

  } catch (error: any) {
    console.error("[OPPORTUNITIES] Error generating recommendation letter:", error);
    // Return a fallback message or throw error
    return `Error generating recommendation letter: ${error.message}`; 
  }
}

/**
 * Record a student's decision to apply for a job, generate recommendation, and simulate sending.
 */
export async function applyForJob(jobId: string): Promise<ApiResponse<{ letterGenerated: boolean }>> {
  console.log("[OPPORTUNITIES] Applying for job:", jobId);
  let letterGenerated = false;
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    const userId = user.id;
    console.log("[OPPORTUNITIES] User ID:", userId);

    // 1. Fetch Job Details (including employer email)
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        profiles!jobs_employer_id_fkey ( email )
      `)
      .eq("id", jobId)
      .single();
      
    if (jobError || !jobData) {
      console.error("[OPPORTUNITIES] Error fetching job details:", jobError);
      return { success: false, error: "Failed to fetch job details" };
    }
    console.log("[OPPORTUNITIES] Job details fetched successfully for job ID:", jobId);
    
    const employerEmail = jobData.profiles?.email;
    if (!employerEmail) {
      console.warn(`[OPPORTUNITIES] Employer email not found for job ${jobId}. Cannot send application.`);
      // Decide if this should be an error or just prevent sending
      // For now, we'll proceed with updating status but indicate send failure
    }

    // 2. Fetch Applicant Details (Name and latest CV data)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
      
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*") // Select all CV data for the letter
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (profileError || cvError || !profileData || !cvData) {
      console.error("[OPPORTUNITIES] Error fetching applicant details:", { profileError, cvError });
      return { success: false, error: "Failed to fetch applicant details" };
    }
    console.log("[OPPORTUNITIES] Applicant details fetched successfully. Email:", profileData.email);

    // 2b. Find the student profile ID for this user using their email
    if (!profileData.email) {
      console.error("[OPPORTUNITIES] User email not found:", userId);
      return { success: false, error: "User email not found" };
    }

    console.log("[OPPORTUNITIES] Looking up student profile with school_email:", profileData.email);
    const { data: studentProfile, error: studentProfileError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("school_email", profileData.email)
      .maybeSingle();

    if (studentProfileError) {
      console.error("[OPPORTUNITIES] Error finding student profile:", studentProfileError);
      return { success: false, error: "Failed to find student profile" };
    }

    if (!studentProfile) {
      console.error("[OPPORTUNITIES] No student profile found for email:", profileData.email);
      return { success: false, error: "No student profile found. Please complete your profile setup." };
    }

    const studentId = studentProfile.id;
    console.log("[OPPORTUNITIES] Found student ID for application:", studentId);

    // 3. Generate Recommendation Letter
    const recommendationLetter = await generateRecommendationLetter(
      profileData.full_name ?? 'the applicant',
      cvData.skills, // Assuming skills field contains the parsed object
      jobData as Job // Cast jobData to Job type
    );
    letterGenerated = !recommendationLetter.startsWith("Error");
    console.log("[OPPORTUNITIES] Letter generation status:", letterGenerated ? "Success" : "Failed");

    // 4. Simulate Sending Email (Log instead of sending)
    if (employerEmail && letterGenerated) {
      console.log("--- Sending Application Email (Simulation) ---");
      console.log(`To: ${employerEmail}`);
      console.log(`From: OJTech Placement System <noreply@ojtech.com>`);
      console.log(`Subject: Application for ${jobData.title} from ${profileData.full_name}`);
      console.log(`\nBody:\nDear Hiring Manager,\n\nPlease find attached the application from ${profileData.full_name} for the ${jobData.title} position.\n\nRecommendation Letter:\n${recommendationLetter}\n\nCandidate's CV Data:\n${JSON.stringify(cvData.skills, null, 2)}\n\nBest regards,\nOJTech Placement System`);
      console.log("-------------------------------------------------");
    } else if (!employerEmail) {
      console.warn(`[OPPORTUNITIES] Skipping email simulation: Employer email missing for job ${jobId}.`);
    } else {
      console.error(`[OPPORTUNITIES] Skipping email simulation: Failed to generate recommendation letter.`);
    }

    // 5. Update Match Status to 'applied'
    console.log("[OPPORTUNITIES] Updating match status with student_id:", studentId, "job_id:", jobId);
    const { error: updateError } = await supabase
      .from("matches")
      .upsert(
        { student_id: studentId, job_id: jobId, status: 'applied', match_score: cvData.match_score ?? undefined }, // Include match_score if available
        { onConflict: 'student_id,job_id' } 
      );

    if (updateError) {
      console.error("[OPPORTUNITIES] Error updating match status:", updateError);
      return { success: false, error: "Failed to update application status." };
    }
    
    // 6. Create job application record
    console.log("[OPPORTUNITIES] Creating job application record");
    const { error: applicationError } = await supabase
      .from("job_applications")
      .insert([{
        job_id: jobId,
        student_id: userId, // Use the user's ID for job applications
        cv_id: cvData.id,
        cover_letter: recommendationLetter,
        status: 'pending'
      }]);
      
    if (applicationError) {
      console.error("[OPPORTUNITIES] Error creating job application record:", applicationError);
      // Continue with success even if application record fails - match status update is sufficient
      console.warn("[OPPORTUNITIES] Match status updated but job application record creation failed");
    } else {
      console.log("[OPPORTUNITIES] Job application record created successfully");
    }
    
    console.log("[OPPORTUNITIES] Successfully processed application for job:", jobId, "for user:", userId);
    return { success: true, data: { letterGenerated } };

  } catch (error: any) {
    console.error("[OPPORTUNITIES] Unexpected error applying for job:", error);
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
}

/**
 * Record a student's decision to decline a job opportunity.
 */
export async function declineJob(jobId: string): Promise<ApiResponse<null>> {
  console.log("[OPPORTUNITIES] Declining job:", jobId);
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    const userId = user.id;
    console.log("[OPPORTUNITIES] User ID for decline action:", userId);

    // Find the student profile ID for this user using their email
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profileData?.email) {
      console.error("[OPPORTUNITIES] Error finding user email:", profileError);
      return { success: false, error: "Failed to find user email" };
    }
    console.log("[OPPORTUNITIES] Found user email for decline action:", profileData.email);

    console.log("[OPPORTUNITIES] Looking up student profile with school_email:", profileData.email);
    const { data: studentProfile, error: studentProfileError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("school_email", profileData.email)
      .maybeSingle();

    if (studentProfileError) {
      console.error("[OPPORTUNITIES] Error finding student profile:", studentProfileError);
      return { success: false, error: "Failed to find student profile" };
    }

    if (!studentProfile) {
      console.error("[OPPORTUNITIES] No student profile found for email:", profileData.email);
      return { success: false, error: "No student profile found. Please complete your profile setup." };
    }

    const studentId = studentProfile.id;
    console.log("[OPPORTUNITIES] Found student ID for declining job:", studentId);

    // Upsert the match record with status 'declined'
    // Fetch existing match score to preserve it
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("match_score")
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .maybeSingle();

    console.log("[OPPORTUNITIES] Updating match status with student_id:", studentId, "job_id:", jobId);
    const { error } = await supabase
      .from("matches")
      .upsert(
        { 
          student_id: studentId, 
          job_id: jobId, 
          status: 'declined',
          match_score: existingMatch?.match_score // Preserve existing score
        },
        { onConflict: 'student_id,job_id' } 
      );

    if (error) {
      console.error("[OPPORTUNITIES] Error declining job:", error);
      return { success: false, error: "Failed to decline job" };
    }

    console.log("[OPPORTUNITIES] Successfully declined job:", jobId, "for user:", userId);
    return { success: true, data: null };

  } catch (error: any) {
    console.error("[OPPORTUNITIES] Unexpected error declining job:", error);
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
} 