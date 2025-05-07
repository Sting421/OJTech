"use server";

import { supabase } from "@/lib/supabase";
import { Match, ApiResponse, Job } from "@/lib/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { batchCreateMatches } from "./matches";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Gemini model to use for matching
const MODEL = "gemini-2.0-flash";

// Constants for timeouts
const GEMINI_TIMEOUT_MS = 15000; // 15 seconds timeout for API calls

/**
 * Generate match scores between a CV and multiple jobs using Gemini
 */
export async function generateJobMatches(
  cvId: string
): Promise<ApiResponse<{ matchesCreated: number; matchesUpdated: number }>> {
  console.log("[JOB-MATCHING] Starting job matching for CV:", cvId);
  try {
    // 1. Get CV data
    console.log("[JOB-MATCHING] Fetching CV data from Supabase");
    const { data: cv, error: cvError } = await supabase
      .from("cvs")
      .select("user_id, skills")
      .eq("id", cvId)
      .single();

    if (cvError) {
      console.error("[JOB-MATCHING] Error fetching CV:", cvError);
      return { success: false, error: "Failed to fetch CV data" };
    }

    console.log("[JOB-MATCHING] CV data retrieved, skills present:", !!cv.skills);
    if (!cv.skills) {
      return { success: false, error: "No skills data available for CV" };
    }

    // 1b. Get student profile for this user
    console.log("[JOB-MATCHING] Fetching student profile for user:", cv.user_id);
    // We need to find the student profile associated with this CV
    // The database doesn't have user_id or profile_id columns, but has school_email
    // Let's first get the user's email
    const { data: userProfile, error: userProfileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", cv.user_id)
      .single();
    
    if (userProfileError) {
      console.error("[JOB-MATCHING] Error fetching user profile:", userProfileError);
      return { success: false, error: "Failed to fetch user profile" };
    }
    
    if (!userProfile || !userProfile.email) {
      console.error("[JOB-MATCHING] No email found for user:", cv.user_id);
      return { success: false, error: "No email found for this user" };
    }
    
    // Now find the student profile with this email
    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("school_email", userProfile.email)
      .maybeSingle();

    if (studentError) {
      console.error("[JOB-MATCHING] Error fetching student profile:", studentError);
      return { success: false, error: "Failed to fetch student profile" };
    }

    if (!studentProfile) {
      console.error("[JOB-MATCHING] No student profile found for email:", userProfile.email);
      return { success: false, error: "No student profile found for this CV" };
    }

    const studentId = studentProfile.id;
    console.log("[JOB-MATCHING] Found student profile:", studentId);

    // 2. Get active jobs
    console.log("[JOB-MATCHING] Fetching active jobs from Supabase");
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, description, required_skills")
      .eq("status", "open")
      .limit(100); // Process in batches

    if (jobsError) {
      console.error("[JOB-MATCHING] Error fetching jobs:", jobsError);
      return { success: false, error: "Failed to fetch jobs" };
    }

    console.log("[JOB-MATCHING] Active jobs found:", jobs?.length || 0);
    if (!jobs || jobs.length === 0) {
      return { success: false, error: "No active jobs found" };
    }

    // 3. Generate match scores for each job
    console.log("[JOB-MATCHING] Calculating match scores for", jobs.length, "jobs");
    const matchPromises = jobs.map(job => calculateMatchScore(cv.skills, job));
    console.log("[JOB-MATCHING] Waiting for match calculations to complete");
    
    // Use Promise.allSettled to handle individual promise rejections gracefully
    const matchSettledResults = await Promise.allSettled(matchPromises);
    console.log("[JOB-MATCHING] Match calculations completed");
    
    // Filter and map results, using fallback score for failed promises
    const matchResults = matchSettledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[JOB-MATCHING] Match calculation failed for job ${jobs[index].id}:`, result.reason);
        // Return a default low score for failed matches
        return 10; // Minimal score for failed calculations
      }
    });

    // 4. Prepare matches for batch creation
    const matches = matchResults.map((score, index) => ({
      student_id: studentId,
      job_id: jobs[index].id,
      match_score: score,
      status: "pending"
    }));

    // 5. Batch create/update matches
    console.log("[JOB-MATCHING] Creating/updating matches in database");
    const result = await batchCreateMatches(matches);
    
    console.log("[JOB-MATCHING] Batch operation result:", result);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: {
        matchesCreated: result.data?.created || 0,
        matchesUpdated: result.data?.updated || 0
      }
    };
  } catch (error) {
    console.error("[JOB-MATCHING] Error generating job matches:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate job matches" 
    };
  }
}

/**
 * Triggers job matching for a newly created job against all active CVs.
 */
export async function triggerMatchingForNewJob(
  jobId: string
): Promise<ApiResponse<{ matchesCreated: number; matchesUpdated: number }>> {
  console.log("[JOB-MATCHING] Starting matching for new job:", jobId);
  try {
    // 1. Get the new job's data
    console.log("[JOB-MATCHING] Fetching new job data from Supabase for job:", jobId);
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, description, required_skills")
      .eq("id", jobId)
      .single();

    if (jobError) {
      console.error("[JOB-MATCHING] Error fetching new job:", jobError);
      return { success: false, error: "Failed to fetch new job data" };
    }
    if (!job) {
      return { success: false, error: "New job not found" };
    }
    console.log("[JOB-MATCHING] New job data retrieved:", job.title);

    // 2. Get all active CVs with skills and their user_ids
    console.log("[JOB-MATCHING] Fetching all active CVs from Supabase");
    const { data: cvs, error: cvsError } = await supabase
      .from("cvs")
      .select("id, user_id, skills")
      .not("skills", "is", null); // Only CVs with skills data

    if (cvsError) {
      console.error("[JOB-MATCHING] Error fetching CVs:", cvsError);
      return { success: false, error: "Failed to fetch CVs" };
    }

    console.log("[JOB-MATCHING] Active CVs found:", cvs?.length || 0);
    if (!cvs || cvs.length === 0) {
      console.log("[JOB-MATCHING] No active CVs found to match against the new job.");
      return { success: true, data: { matchesCreated: 0, matchesUpdated: 0 } };
    }

    // 3. For each CV, get student_id and calculate match score
    const matchPromises = cvs.map(async (cv) => {
      if (!cv.skills || !cv.user_id) {
        console.warn(`[JOB-MATCHING] CV ${cv.id} is missing skills or user_id, skipping.`);
        return null; // Skip if essential data is missing
      }

      // Try multiple approaches to find the student profile
      let studentProfile = null;
      let studentError = null;

      // Approach 1: First try to get student profile directly by user_id as the id
      const { data: directStudentProfile, error: directStudentError } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("id", cv.user_id) // Try direct ID match first
        .maybeSingle();
        
      if (!directStudentError && directStudentProfile) {
        console.log(`[JOB-MATCHING] Found student profile directly via id match for user ${cv.user_id}`);
        studentProfile = directStudentProfile;
      } else {
        console.log(`[JOB-MATCHING] Could not find student profile directly. Trying via email lookup.`);
        
        // Approach 2: Get the user's email and lookup by email
        const { data: userProfile, error: userProfileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", cv.user_id)
          .single();
        
        if (!userProfileError && userProfile && userProfile.email) {
          const { data: emailStudentProfile, error: emailStudentError } = await supabase
            .from("student_profiles")
            .select("id")
            .eq("school_email", userProfile.email)
            .maybeSingle();
            
          if (!emailStudentError && emailStudentProfile) {
            console.log(`[JOB-MATCHING] Found student profile via email for user ${cv.user_id}`);
            studentProfile = emailStudentProfile;
          } else {
            studentError = emailStudentError;
            console.warn(`[JOB-MATCHING] Could not find student profile for email ${userProfile.email}`);
          }
        } else {
          console.warn(`[JOB-MATCHING] Could not find email for user ${cv.user_id}`);
        }
      }

      if (!studentProfile) {
        console.warn(`[JOB-MATCHING] All approaches failed to find student profile for user ${cv.user_id}. Skipping match.`);
        return null;
      }

      const studentId = studentProfile.id;
      const score = await calculateMatchScore(cv.skills, job);
      return {
        student_id: studentId,
        job_id: jobId,
        match_score: score,
        status: "pending"
      };
    });

    const settledMatchDetails = await Promise.allSettled(matchPromises);
    
    const validMatches: Match[] = settledMatchDetails
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => {
        // Use a type assertion with unknown as an intermediate step
        return ((result as PromiseFulfilledResult<unknown>) as PromiseFulfilledResult<Match>).value;
      });

    if (validMatches.length === 0) {
      console.log("[JOB-MATCHING] No valid matches could be calculated for job:", jobId);
      return { success: true, data: { matchesCreated: 0, matchesUpdated: 0 } };
    }

    // 4. Batch create/update matches
    console.log(`[JOB-MATCHING] Creating/updating ${validMatches.length} matches in database for job ${jobId}`);
    const result = await batchCreateMatches(validMatches);
    
    console.log("[JOB-MATCHING] Batch operation result for new job matching:", result);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: {
        matchesCreated: result.data?.created || 0,
        matchesUpdated: result.data?.updated || 0
      }
    };

  } catch (error) {
    console.error("[JOB-MATCHING] Error triggering matching for new job:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to trigger matching for new job" 
    };
  }
}


/**
 * Calculate match score between a CV and a job using Gemini API
 */
async function calculateMatchScore(
  cvData: any,
  job: {
    id: string;
    title: string;
    description: string;
    required_skills: any;
  }
): Promise<number> {
  console.log("[JOB-MATCHING] Calculating match score for job:", job.id, job.title);
  try {
    // Extract key information from CV
    const cvSkills = cvData.skills || [];
    const cvExperience = cvData.experience || [];
    const cvEducation = cvData.education || [];
    const cvSummary = cvData.summary || "";
    const cvKeywords = cvData.keywords || [];

    // Extract key information from job
    const jobSkills = Array.isArray(job.required_skills) 
      ? job.required_skills 
      : (job.required_skills?.skills || []);

    console.log("[JOB-MATCHING] CV skills count:", cvSkills.length, "Job skills count:", jobSkills.length);

    // For simple cases without AI, use basic algorithm
    if (jobSkills.length === 0 || cvSkills.length === 0) {
      console.log("[JOB-MATCHING] Using basic match algorithm due to missing skills data");
      return calculateBasicMatchScore(cvSkills, jobSkills);
    }

    // Create a simplified prompt for Gemini
    console.log("[JOB-MATCHING] Creating prompt for Gemini");
    const prompt = `
      Analyze this job and candidate match. Return ONLY a number from 0-100 representing how well they match.
      
      JOB:
      Title: ${job.title}
      Description: ${job.description}
      Required Skills: ${JSON.stringify(jobSkills)}
      
      CANDIDATE:
      Skills: ${JSON.stringify(cvSkills)}
      Experience Summary: ${JSON.stringify(cvExperience.slice(0, 2))}
      
      Calculate match score on skill alignment, relevant experience and how well the candidate meets requirements.
      Return ONLY a number from 0-100.
    `;

    // Call Gemini with timeout
    console.log("[JOB-MATCHING] Initializing Gemini model:", MODEL);
    try {
      const model = genAI.getGenerativeModel({ model: MODEL });
      console.log("[JOB-MATCHING] Calling Gemini API with timeout:", GEMINI_TIMEOUT_MS, "ms");
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API call timed out")), GEMINI_TIMEOUT_MS);
      });
      
      // Race the API call against the timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]) as any; // Type assertion needed due to race
      
      console.log("[JOB-MATCHING] Received response from Gemini");
      const content = result.response.text();
      console.log("[JOB-MATCHING] Response text:", content);
      
      // Extract the score
      const scoreMatch = content.match(/\b([0-9]{1,2}|100)\b/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[0], 10);
        console.log("[JOB-MATCHING] Extracted score:", score);
        return score;
      }
      
      console.log("[JOB-MATCHING] Failed to extract numeric score from response");
      // Fallback to basic algorithm if AI fails
      return calculateBasicMatchScore(cvSkills, jobSkills);
    } catch (aiError) {
      console.error("[JOB-MATCHING] Error calling Gemini API:", aiError);
      // Check if it's an API key issue or timeout
      const errorMessage = aiError.toString();
      if (errorMessage.includes("API key")) {
        console.error("[JOB-MATCHING] API key issue detected:", errorMessage);
      } else if (errorMessage.includes("timed out")) {
        console.error("[JOB-MATCHING] API call timed out after", GEMINI_TIMEOUT_MS, "ms");
      }
      // Fallback to basic algorithm
      return calculateBasicMatchScore(cvSkills, jobSkills);
    }
  } catch (error) {
    console.error("[JOB-MATCHING] Error in match score calculation:", error);
    // Fallback to basic algorithm
    return calculateBasicMatchScore(
      cvData.skills || [], 
      Array.isArray(job.required_skills) ? job.required_skills : []
    );
  }
}

/**
 * Basic algorithm for calculating match score based on skills overlap
 */
function calculateBasicMatchScore(
  cvSkills: string[],
  jobSkills: string[]
): number {
  console.log("[JOB-MATCHING] Using basic match algorithm");
  if (!cvSkills || !jobSkills || jobSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const cvSkillsLower = cvSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '');
  const jobSkillsLower = jobSkills.map(skill => typeof skill === 'string' ? skill.toLowerCase() : '');
  
  // Count matches
  let matches = 0;
  for (const skill of jobSkillsLower) {
    if (skill && cvSkillsLower.some(cvSkill => 
      cvSkill && (cvSkill.includes(skill) || skill.includes(cvSkill))
    )) {
      matches++;
    }
  }
  
  const score = jobSkillsLower.length > 0 
    ? Math.round((matches / jobSkillsLower.length) * 100)
    : 0;
    
  console.log("[JOB-MATCHING] Basic algorithm found", matches, "matching skills, score:", score);
  
  return Math.min(100, Math.max(0, score)); // Ensure score is between 0-100
}

/**
 * Generate job matches for all active CVs
 */
export async function batchGenerateAllMatches(): Promise<ApiResponse<{
  processedCvs: number;
  totalMatches: number;
}>> {
  console.log("[JOB-MATCHING] Starting batch matching for all CVs");
  try {
    // Get all active CVs
    console.log("[JOB-MATCHING] Fetching all active CVs");
    const { data: cvs, error: cvsError } = await supabase
      .from("cvs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(100); // Process in batches

    if (cvsError) {
      console.error("[JOB-MATCHING] Error fetching CVs:", cvsError);
      return { success: false, error: "Failed to fetch CVs" };
    }

    console.log("[JOB-MATCHING] Found", cvs?.length || 0, "CVs for batch processing");
    if (!cvs || cvs.length === 0) {
      return { success: false, error: "No CVs found" };
    }

    // Generate matches for each CV
    let totalCreated = 0;
    let totalUpdated = 0;
    
    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 5;
    console.log("[JOB-MATCHING] Processing in batches of", batchSize);
    
    for (let i = 0; i < cvs.length; i += batchSize) {
      const batch = cvs.slice(i, i + batchSize);
      console.log("[JOB-MATCHING] Processing batch", Math.floor(i/batchSize) + 1, "of", Math.ceil(cvs.length/batchSize));
      
      const results = await Promise.all(
        batch.map(cv => generateJobMatches(cv.id))
      );
      
      for (const result of results) {
        if (result.success) {
          totalCreated += result.data.matchesCreated;
          totalUpdated += result.data.matchesUpdated;
        }
      }
      
      console.log("[JOB-MATCHING] Batch processing progress:", Math.min(i + batchSize, cvs.length), "/", cvs.length, "CVs");
    }

    console.log("[JOB-MATCHING] Batch processing complete. Created:", totalCreated, "Updated:", totalUpdated);
    return {
      success: true,
      data: {
        processedCvs: cvs.length,
        totalMatches: totalCreated + totalUpdated
      }
    };
  } catch (error) {
    console.error("[JOB-MATCHING] Error generating all job matches:", error);
    return { success: false, error: "Failed to generate all job matches" };
  }
}