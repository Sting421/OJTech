"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { ApiResponse, Job, CV } from "@/lib/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 30000; // 30 seconds timeout (increased from 25)
const MAX_RETRIES = 2; // Maximum number of retries for Gemini API calls

// Export the JobWithMatchScore interface so it can be imported in other files
export interface JobWithMatchScore extends Omit<Job, 'location' | 'job_type' | 'salary_range' | 'required_skills'> {
  match_score: number | null;
  company_name?: string | null;
  location?: string | null;
  job_type?: string | null;
  salary_range?: string | null;
  required_skills?: string[] | null;
  company_logo_url?: string | null;
  is_active?: boolean;
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
 * Generate a recommendation letter using Gemini with improved reliability.
 * Now includes enhanced retry logic, better error handling, and improved prompts.
 */
async function generateRecommendationLetter(applicantName: string, cvData: any, jobDetails: Job): Promise<string> {
  console.log(`[OPPORTUNITIES] Generating recommendation letter for ${applicantName} applying to ${jobDetails.title}`);
  
  // Extract skills appropriately depending on the structure
  const skills = cvData?.skills?.skills || cvData?.extracted_skills || [];
  const experience = cvData?.experience || [];
  const education = cvData?.education || [];
  const summary = cvData?.summary || 'Experienced professional with relevant skills for this position.';
  
  // Ensure required skills is properly formatted
  const requiredSkills = Array.isArray(jobDetails.required_skills) 
    ? jobDetails.required_skills 
    : (typeof jobDetails.required_skills === 'object' 
        ? Object.values(jobDetails.required_skills) 
        : []);
  
  // Find matching skills for emphasis
  const matchingSkills = skills.filter((skill: string) => 
    requiredSkills.some((req: any) => {
      if (typeof req !== 'string' || typeof skill !== 'string') return false;
      return req.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(req.toLowerCase());
    })
  );
  
  // Helper function to call Gemini with retries
  const callGeminiWithRetry = async (retryCount = 0): Promise<string> => {
    try {
      // Enhanced prompt for better quality recommendations
    const prompt = `
        Generate a compelling, personalized and professional recommendation letter for ${applicantName} applying for the ${jobDetails.title} position at ${jobDetails.company_name ?? 'the company'}.
      
        The letter should:
        1. Start with a compelling introduction that mentions specific match points between the candidate and job
        2. Highlight 2-3 key strengths from the candidate's resume that directly relate to the job requirements
        3. Emphasize these matching skills: ${matchingSkills.join(', ')}
        4. Include evidence of the candidate's past achievements that demonstrate their potential value
        5. Keep the tone professional, positive, and persuasive
        6. Address as "Dear Hiring Manager," and sign as "OJTech Placement System"
        7. Be concise but thorough (maximum 3 paragraphs)
      
      Candidate's Resume Data:
        Name: ${applicantName}
        Summary: ${summary}
        Skills: ${skills.join(', ')}
        Experience: ${JSON.stringify(experience.slice(0, 2), null, 2)}
        Education: ${JSON.stringify(education.slice(0, 1), null, 2)}
      
      Job Details:
      Title: ${jobDetails.title}
        Company: ${jobDetails.company_name ?? 'The company'}
      Description: ${jobDetails.description}
        Required Skills: ${requiredSkills.join(', ')}
      
      Generate only the recommendation letter text.
        Make sure to highlight how the candidate's experience and skills make them an excellent fit for this specific role.
    `;

      console.log(`[OPPORTUNITIES] Calling Gemini API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    const model = genAI.getGenerativeModel({ model: MODEL });
      
      // Promise race with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API call timed out")), GEMINI_TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]) as any;

    const letter = result.response.text();
    console.log(`[OPPORTUNITIES] Recommendation letter generated successfully.`);
    return letter;
    } catch (error: any) {
      console.error(`[OPPORTUNITIES] Error generating recommendation letter (attempt ${retryCount + 1}):`, error);
      
      // Retry logic if we haven't exceeded MAX_RETRIES
      if (retryCount < MAX_RETRIES) {
        console.log(`[OPPORTUNITIES] Retrying Gemini API call (${retryCount + 1}/${MAX_RETRIES})...`);
        // Exponential backoff for retries (1s, 2s, 4s, etc.)
        const backoffTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return callGeminiWithRetry(retryCount + 1);
      }
      
      // If we've exhausted all retries, throw the error to trigger the fallback
      throw error;
    }
  };
  
  try {
    // Attempt to generate letter with retries
    return await callGeminiWithRetry();
  } catch (error: any) {
    console.error("[OPPORTUNITIES] All Gemini API attempts failed. Using enhanced fallback:", error);
    
    // Enhanced fallback mechanism that still creates a personalized letter
    // This is only used after all Gemini attempts have failed
    
    // Get key skills (up to 5)
    const keySkills = skills.slice(0, 5);
    
    // Get matching skills specifically
    const relevantSkillsText = matchingSkills.length > 0
      ? `Their expertise in ${matchingSkills.join(', ')} directly aligns with your requirements.`
      : `Their skill set is well-suited for the challenges of this position.`;
    
    // Get experience highlights
    let experienceText = "Their professional background demonstrates a strong foundation for this role.";
    if (experience.length > 0) {
      const latestRole = experience[0];
      experienceText = `Their experience as ${latestRole.title || 'a professional'} at ${latestRole.company || 'their previous company'} has equipped them with valuable insights and capabilities relevant to this position.`;
    }
    
    // Get education highlight
    let educationText = "";
    if (education.length > 0) {
      const latestEdu = education[0];
      educationText = `With ${latestEdu.degree || 'academic training'} from ${latestEdu.institution || 'a reputable institution'}, they have the educational foundation needed to excel.`;
    }
    
    // Build a more personalized fallback letter
    return `Dear Hiring Manager,

I am writing to strongly recommend ${applicantName} for the ${jobDetails.title} position at ${jobDetails.company_name ?? 'your company'}. Based on a careful analysis of their qualifications compared to your job requirements, I believe they are an exceptional fit for this role.

${relevantSkillsText} ${experienceText} ${educationText} Their combination of technical proficiency and professional experience positions them to make immediate and meaningful contributions to your team.

I confidently recommend ${applicantName} for this position and believe they will be a valuable asset to your organization. Their capabilities align remarkably well with what you're seeking, and I encourage you to consider their application favorably.

Sincerely,
OJTech Placement System`;
  }
}

/**
 * Record a student's decision to apply for a job, generate recommendation, and simulate sending.
 * Improved to ensure proper match score handling and cover letter generation.
 * 
 * Note on ID relationships:
 * - matches table uses student_profiles.id as student_id
 * - job_applications table uses profiles.id as student_id
 * This is why we track both IDs during the application process.
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

    // 2. Fetch Applicant Details (Name and latest CV data)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
      
    // Fetch the most recent CV with detailed skills data
    const { data: cvs, error: cvsError } = await supabase
      .from("cvs")
      .select("*") 
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5); // Try to get multiple CVs in case the latest one has issues

    if (profileError || !profileData) {
      console.error("[OPPORTUNITIES] Error fetching profile:", profileError);
      return { success: false, error: "Failed to fetch user profile" };
    }
    
    if (cvsError || !cvs || cvs.length === 0) {
      console.error("[OPPORTUNITIES] Error fetching CV data:", cvsError);
      return { success: false, error: "Failed to fetch CV data. Please upload your resume first." };
    }
    
    // Use the first CV that has valid skills data
    const cvData = cvs.find(cv => cv.skills && (cv.skills.skills || cv.skills.extracted_skills)) || cvs[0];
    
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

    // 3. Get the current match score if it exists
    const { data: matchData } = await supabase
      .from("matches")
      .select("match_score")
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .maybeSingle();
      
    const matchScore = matchData?.match_score || null;
    console.log("[OPPORTUNITIES] Current match score:", matchScore);

    // 4. Generate Recommendation Letter
    const recommendationLetter = await generateRecommendationLetter(
      profileData.full_name ?? 'the applicant',
      cvData.skills, // Assuming skills field contains the parsed object
      jobData as Job // Cast jobData to Job type
    );
    letterGenerated = true; // If we reach this point, we either got a Gemini or fallback letter
    console.log("[OPPORTUNITIES] Letter generation status:", letterGenerated ? "Success" : "Failed");

    // 5. Simulate Sending Email (Log instead of sending)
    const employerEmail = jobData.profiles?.email;
    if (employerEmail) {
      console.log("--- Sending Application Email (Simulation) ---");
      console.log(`To: ${employerEmail}`);
      console.log(`From: OJTech Placement System <noreply@ojtech.com>`);
      console.log(`Subject: Application for ${jobData.title} from ${profileData.full_name}`);
      console.log(`\nBody:\nDear Hiring Manager,\n\nPlease find attached the application from ${profileData.full_name} for the ${jobData.title} position.\n\nRecommendation Letter:\n${recommendationLetter.substring(0, 200)}...\n\nCandidate's CV has been attached.\n\nBest regards,\nOJTech Placement System`);
      console.log("-------------------------------------------------");
    } else {
      console.warn(`[OPPORTUNITIES] Skipping email simulation: Employer email missing for job ${jobId}.`);
    }

    // 6. Update Match Status to 'applied'
    console.log("[OPPORTUNITIES] Updating match status with student_id:", studentId, "job_id:", jobId);
    const { error: updateError } = await supabase
      .from("matches")
      .upsert(
        { 
          student_id: studentId, 
          job_id: jobId, 
          status: 'applied', 
          match_score: matchScore // Preserve existing match score
        }, 
        { onConflict: 'student_id,job_id' } 
      );

    if (updateError) {
      console.error("[OPPORTUNITIES] Error updating match status:", updateError);
      return { success: false, error: "Failed to update application status." };
    }
    
    // 7. Create job application record
    console.log("[OPPORTUNITIES] Creating job application record");
    const { error: applicationError } = await supabase
      .from("job_applications")
      .insert([{
        job_id: jobId,
        student_id: userId, // Use the user's ID (profile.id) for job applications
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

/**
 * Get details for a specific job by ID.
 * Includes match score if the current user has been matched with this job.
 */
export async function getJobById(jobId: string): Promise<ApiResponse<JobWithMatchScore>> {
  console.log("[OPPORTUNITIES] Fetching job details by ID:", jobId);
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        profiles!jobs_employer_id_fkey (email)
      `)
      .eq("id", jobId)
      .single();
      
    if (jobError || !job) {
      console.error("[OPPORTUNITIES] Error fetching job details:", jobError);
      return { success: false, error: "Job not found" };
    }
    
    // Format and clean up job data
    let jobWithScore: JobWithMatchScore = {
      ...job,
      match_score: null,
      // Ensure required_skills is an array
      required_skills: Array.isArray(job.required_skills) ? job.required_skills :
        (job.required_skills ? Object.values(job.required_skills) : [])
    };
    
    // Find student profile for the user
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();
      
    if (userProfile?.email) {
      // Find student profile using email
      const { data: studentProfile } = await supabaseClient
        .from("student_profiles")
        .select("id")
        .eq("school_email", userProfile.email)
        .maybeSingle();
        
      if (studentProfile?.id) {
        // Get match score if it exists
        const { data: match } = await supabase
          .from("matches")
          .select("match_score")
          .eq("student_id", studentProfile.id)
          .eq("job_id", jobId)
          .maybeSingle();
          
        if (match) {
          jobWithScore.match_score = match.match_score;
        }
      }
    }
    
    console.log("[OPPORTUNITIES] Job details fetched successfully");
    return { success: true, data: jobWithScore };

  } catch (error: any) {
    console.error("[OPPORTUNITIES] Error fetching job by ID:", error);
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
} 