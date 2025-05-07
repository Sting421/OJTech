"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ApiResponse, CV } from "@/lib/types/database";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Gemini model to use for analysis
const MODEL = "gemini-2.0-flash";

// Increase timeout for Gemini API calls (45 seconds)
const GEMINI_TIMEOUT_MS = 45000;

// Cache structure to store analysis results and timestamps
type AnalysisCache = {
  [cvId: string]: {
    results: any;
    timestamp: number;
    lastModified: string;
  }
};

// In-memory cache to avoid repeated analysis
const analysisCache: AnalysisCache = {};

// Cache validity period in milliseconds (1 hour)
const CACHE_VALIDITY_MS = 60 * 60 * 1000;

// Add this utility function to filter out category labels from skills
function filterSkillCategoryLabels(skills: string[]): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  
  // Common category labels that should be excluded from actual skills
  const categoryLabels = [
    "backend development", "frontend development", "full stack", "other skills",
    "soft skills", "data analysis", "mobile development", "web development",
    "cloud services", "devops", "database", "testing", "ui/ux", "ux/ui", 
    "frameworks", "programming languages", "tools", "libraries", "platforms",
    "methodologies", "design", "analytics", "automation", "infrastructure"
  ];
  
  // Non-technical descriptive terms that shouldn't be listed as skills
  const descriptiveTerms = [
    "proficient in", "experienced with", "knowledge of", "familiar with",
    "expertise in", "specializing in", "skilled in", "advanced", "intermediate",
    "beginner", "expert in", "years of experience", "certified"
  ];
  
  return skills.filter(skill => {
    const lowerSkill = skill.toLowerCase().trim();
    
    // Filter out category labels
    if (categoryLabels.some(label => lowerSkill === label || 
                                    lowerSkill === label + "s" || 
                                    lowerSkill === label.replace(/s$/, ""))) {
      return false;
    }
    
    // Filter out purely descriptive terms
    if (descriptiveTerms.some(term => lowerSkill === term)) {
      return false;
    }
    
    // Filter out excessively long items (likely descriptions, not skills)
    if (skill.length > 30) {
      return false;
    }
    
    return true;
  });
}

/**
 * Clear cache entry for a specific CV ID
 */
function clearCacheForCv(cvId: string) {
  if (analysisCache[cvId]) {
    delete analysisCache[cvId];
    console.log(`[RESUME-ANALYZER] Cache cleared for CV: ${cvId}`);
  }
}

/**
 * Check if cache is valid for a CV
 */
function isCacheValid(cvId: string, lastModified: string | null | undefined): boolean {
  if (!cvId) {
    return false;
  }

  const cacheEntry = analysisCache[cvId];
  
  if (!cacheEntry) {
    return false;
  }
  
  // Check if cache entry is recent
  const now = Date.now();
  const cacheAge = now - cacheEntry.timestamp;
  
  // If CV has been modified since cache was created, invalidate cache
  if (lastModified && cacheEntry.lastModified !== lastModified) {
    console.log(`[RESUME-ANALYZER] Cache invalidated for CV ${cvId} due to modification`);
    return false;
  }
  
  // Check if cache is still within validity period
  const isValid = cacheAge < CACHE_VALIDITY_MS;
  
  console.log(`[RESUME-ANALYZER] Cache for CV ${cvId} is ${isValid ? 'valid' : 'expired'} (age: ${Math.round(cacheAge / 1000)}s)`);
  return isValid;
}

/**
 * Analyze a resume and provide improvement suggestions
 */
export async function analyzeResume(
  userId: string,
  cvId?: string
): Promise<ApiResponse<{ suggestions: string[], strengths: string[], weaknesses: string[] }>> {
  console.log("[RESUME-ANALYZER] Starting resume analysis for user:", userId, "cvId:", cvId);
  try {
    // Get the user's CV if no specific CV ID is provided
    if (!cvId) {
      console.log("[RESUME-ANALYZER] No cvId provided, fetching most recent CV");
      const { data: cvs, error } = await supabase
        .from("cvs")
        .select("id, created_at") // Select only needed fields
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[RESUME-ANALYZER] Error fetching CV:", error);
        return { success: false, error: "Error fetching CV: " + error.message };
      }
      
      if (!cvs || cvs.length === 0) {
        console.error("[RESUME-ANALYZER] No CV found for user:", userId);
        return { success: false, error: "No CV found for analysis" };
      }
      
      cvId = cvs[0].id;
      console.log("[RESUME-ANALYZER] Selected cvId:", cvId);
    }

    // Ensure we have a valid cvId at this point
    if (!cvId) {
      console.error("[RESUME-ANALYZER] No valid CV ID available for analysis");
      return { success: false, error: "No valid CV ID available for analysis" };
    }

    // Get the CV data
    console.log("[RESUME-ANALYZER] Fetching CV data for cvId:", cvId);
    const { data: cv, error } = await supabase
      .from("cvs")
      .select("id, skills, user_id, updated_at")  // Include updated_at for cache validation
      .eq("id", cvId)
      .single();

    if (error) {
      console.error("[RESUME-ANALYZER] Error fetching CV data:", error);
      return { success: false, error: "Error fetching CV data: " + error.message };
    }
    
    if (!cv || !cv.skills) {
      console.error("[RESUME-ANALYZER] No CV skills data available for analysis");
      return { success: false, error: "No CV data available for analysis" };
    }
    
    const currentCvId = cvId;

    // Check if we have a valid cache entry for this CV
    const updatedAt = cv.updated_at ?? null;
    if (isCacheValid(currentCvId, updatedAt)) {
      console.log("[RESUME-ANALYZER] Using cached analysis for CV:", currentCvId);
      return { 
        success: true, 
        data: analysisCache[currentCvId].results,
        warning: "Using cached analysis" 
      };
    }
    
    // Get the structured CV data to analyze
    const cvData = cv.skills;
    
    // Check if we have at least some minimal data to analyze
    if (!cvData.skills || cvData.skills.length === 0) {
      console.error("[RESUME-ANALYZER] CV data is missing skills array, cannot analyze");
      return { success: false, error: "CV data is incomplete. Please ensure your resume contains skills information." };
    }
    
    // Filter out category labels from skills before analysis
    if (cvData.skills && Array.isArray(cvData.skills)) {
      console.log("[RESUME-ANALYZER] Filtering skill category labels from", cvData.skills.length, "skills");
      const originalSkillsCount = cvData.skills.length;
      cvData.skills = filterSkillCategoryLabels(cvData.skills);
      console.log("[RESUME-ANALYZER] Filtered to", cvData.skills.length, "skills (removed", originalSkillsCount - cvData.skills.length, "category labels)");
    }
    
    // Create a simplified prompt for Gemini
    console.log("[RESUME-ANALYZER] Preparing prompt for Gemini");
    const prompt = `
      Analyze this resume data and provide three lists:
      1. SUGGESTIONS: Specific, actionable suggestions for improving the resume (5-7 items)
      2. STRENGTHS: Key strengths of this resume (3-5 items)
      3. WEAKNESSES: Areas that need improvement (3-5 items)
      
      Be concrete and specific. Focus on content, skills, experience gaps, and formatting.
      Keep each point concise (15-25 words per item).
      
      IMPORTANT: Do not mention any dates that appear to be in the future or make assumptions about timeline accuracy.
      Do not flag future dates as errors, as these may be intended graduation or certification target dates.
      Focus on structural and content improvements rather than timeline validation.
      
      Resume data:
      ${JSON.stringify(cvData, null, 2)}
      
      Respond in JSON:
      {
        "suggestions": ["suggestion 1", "suggestion 2", ...],
        "strengths": ["strength 1", "strength 2", ...],
        "weaknesses": ["weakness 1", "weakness 2", ...]
      }
    `;

    // Function to make a Gemini API call with retry logic
    const callGeminiWithRetry = async (retries = 2): Promise<any> => {
      try {
        console.log(`[RESUME-ANALYZER] Calling Gemini API (attempt ${3 - retries}/3) with model: ${MODEL}`);
        const model = genAI.getGenerativeModel({ model: MODEL });
        
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Gemini API timeout")), GEMINI_TIMEOUT_MS);
        });
        
        // Race the Gemini API call against the timeout
        return await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]);
      } catch (err) {
        console.error(`[RESUME-ANALYZER] Gemini API call failed: ${err}`);
        
        if (retries > 0) {
          console.log(`[RESUME-ANALYZER] Retrying API call in 2 seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return callGeminiWithRetry(retries - 1);
        }
        
        throw err;
      }
    };
    
    // Call Gemini with retry logic
    try {
      const result = await callGeminiWithRetry();
      
      console.log("[RESUME-ANALYZER] Gemini API response received");
      const content = result.response.text();
      
      try {
        console.log("[RESUME-ANALYZER] Parsing Gemini JSON response");
        // Ensure we're extracting only the JSON part, in case there's extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonContent = jsonMatch ? jsonMatch[0] : content;
        
        // Try to parse the response safely
        let analysis;
        try {
          analysis = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error("[RESUME-ANALYZER] JSON parsing error, trying to fix malformed JSON");
          // Try to fix common JSON formatting issues (e.g., unescaped quotes, trailing commas)
          const cleanedJson = jsonContent
            .replace(/,\s*}/g, '}')  // Remove trailing commas
            .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
          
          analysis = JSON.parse(cleanedJson);
        }
        
        // Provide fallbacks for missing fields
        if (!analysis.suggestions || !Array.isArray(analysis.suggestions)) {
          analysis.suggestions = ["Add more specific details to your experience descriptions", 
                                 "Quantify your achievements with metrics where possible", 
                                 "Tailor your resume to the specific job you're applying for"];
        }
        
        if (!analysis.strengths || !Array.isArray(analysis.strengths)) {
          analysis.strengths = ["Has technical skills listed", 
                               "Includes educational background", 
                               "Structure is organized"];
        }
        
        if (!analysis.weaknesses || !Array.isArray(analysis.weaknesses)) {
          analysis.weaknesses = ["Lacks quantifiable achievements", 
                                "Could use more keywords relevant to job targets", 
                                "Summary could be more concise and impactful"];
        }
        
        console.log("[RESUME-ANALYZER] Successfully parsed analysis:", {
          suggestions: analysis.suggestions?.length || 0,
          strengths: analysis.strengths?.length || 0,
          weaknesses: analysis.weaknesses?.length || 0
        });
        
        // Save the analysis results to the CV record
        console.log("[RESUME-ANALYZER] Saving analysis results to CV record");
        const updateResult = await supabase
          .from("cvs")
          .update({
            analysis_results: analysis,
            last_analyzed_at: new Date().toISOString()
          })
          .eq("id", currentCvId);
          
        if (updateResult.error) {
          console.error("[RESUME-ANALYZER] Error saving analysis:", updateResult.error);
        } else {
          // Update the cache with typescript safety
          if (updatedAt) {
            analysisCache[currentCvId] = {
              results: analysis,
              timestamp: Date.now(),
              lastModified: updatedAt
            };
            console.log("[RESUME-ANALYZER] Updated analysis cache for CV:", currentCvId);
          }
        }
          
        return { success: true, data: analysis };
      } catch (parseError) {
        console.error("[RESUME-ANALYZER] Error parsing Gemini response:", parseError);
        console.error("[RESUME-ANALYZER] Raw response content:", content.substring(0, 200) + "...");
        
        // Create a basic analysis structure to avoid analysis failure
        const fallbackAnalysis = {
          suggestions: [
            "Add more specific details to your experience descriptions",
            "Quantify your achievements with metrics where possible",
            "Tailor your resume to the specific job you're applying for",
            "Use industry-specific keywords to pass applicant tracking systems",
            "Make sure your resume is properly formatted and easy to read"
          ],
          strengths: [
            "Has technical skills listed",
            "Includes educational background",
            "Structure is organized"
          ],
          weaknesses: [
            "Lacks quantifiable achievements",
            "Could use more keywords relevant to job targets",
            "Summary could be more concise and impactful"
          ]
        };
        
        // Still save these fallback results
        await supabase
          .from("cvs")
          .update({
            analysis_results: fallbackAnalysis,
            last_analyzed_at: new Date().toISOString()
          })
          .eq("id", currentCvId);
        
        // Update the cache with typescript safety
        if (updatedAt) {
          analysisCache[currentCvId] = {
            results: fallbackAnalysis,
            timestamp: Date.now(),
            lastModified: updatedAt
          };
        }
        
        return { success: true, data: fallbackAnalysis };
      }
    } catch (geminiError: any) {
      console.error("[RESUME-ANALYZER] Error calling Gemini API:", geminiError?.message);
      
      // Create a basic fallback analysis for timeout scenarios
      if (geminiError?.message === "Gemini API timeout") {
        const timeoutFallbackAnalysis = {
          suggestions: [
            "Add more specific details to your experience descriptions",
            "Quantify your achievements with metrics where possible",
            "Tailor your resume to the specific job you're applying for",
            "Use industry-specific keywords to pass applicant tracking systems",
            "Make sure your resume is properly formatted and easy to read"
          ],
          strengths: [
            "Has technical skills listed",
            "Includes educational background",
            "Structure is organized"
          ],
          weaknesses: [
            "Lacks quantifiable achievements",
            "Could use more keywords relevant to job targets",
            "Summary could be more concise and impactful"
          ]
        };
        
        // Save the fallback analysis even though we timed out
        await supabase
          .from("cvs")
          .update({
            analysis_results: timeoutFallbackAnalysis,
            last_analyzed_at: new Date().toISOString()
          })
          .eq("id", currentCvId);
        
        // Update the cache with typescript safety
        if (updatedAt) {
          analysisCache[currentCvId] = {
            results: timeoutFallbackAnalysis,
            timestamp: Date.now(),
            lastModified: updatedAt
          };
        }
        
        return { 
          success: true, 
          data: timeoutFallbackAnalysis,
          warning: "Analysis timed out. Showing generic suggestions instead."
        };
      }
      
      return { 
        success: false, 
        error: geminiError?.message === "Gemini API timeout" 
          ? "Analysis timed out. Please try again later."
          : "Failed to communicate with Gemini API" 
      };
    }
  } catch (error: any) {
    console.error("[RESUME-ANALYZER] Error analyzing resume:", error);
    return { success: false, error: error?.message || "Failed to analyze resume" };
  }
}

/**
 * Get existing resume analysis for a user
 */
export async function getResumeAnalysis(userId: string): Promise<ApiResponse<any>> {
  console.log("[RESUME-ANALYZER] Getting resume analysis for user:", userId);
  try {
    // Get the most recent CV with analysis
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("id, analysis_results, last_analyzed_at, updated_at")  // Also get updated_at
      .eq("user_id", userId)
      .not("analysis_results", "is", null)  // Only get CVs with analysis results
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[RESUME-ANALYZER] Error fetching CV:", error);
      return { success: false, error: "Error fetching CV: " + error.message };
    }
    
    if (!cvs || cvs.length === 0) {
      console.log("[RESUME-ANALYZER] No CV with analysis found for user:", userId);
      return { success: false, error: "No CV with analysis found" };
    }
    
    const cv = cvs[0];
    
    if (!cv.analysis_results) {
      console.log("[RESUME-ANALYZER] No analysis results found for CV:", cv.id);
      return { success: false, error: "No analysis results found" };
    }
    
    // Update the cache if we have a fresh result from DB
    if (cv.analysis_results && cv.updated_at && cv.id) {
      analysisCache[cv.id] = {
        results: cv.analysis_results,
        timestamp: Date.now(),
        lastModified: cv.updated_at
      };
    }
    
    return { 
      success: true, 
      data: {
        ...cv.analysis_results,
        last_analyzed_at: cv.last_analyzed_at,
        updated_at: cv.updated_at
      }
    };
  } catch (error: any) {
    console.error("[RESUME-ANALYZER] Error getting resume analysis:", error);
    return { success: false, error: error?.message || "Failed to get resume analysis" };
  }
}

/**
 * Check if CV needs analysis based on last update and last analysis time
 */
async function doesCvNeedAnalysis(userId: string): Promise<{ needsAnalysis: boolean, cvId?: string }> {
  console.log("[RESUME-ANALYZER] Checking if CV needs analysis for user:", userId);
  try {
    // Get the most recent CV 
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("id, updated_at, last_analyzed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !cvs || cvs.length === 0) {
      return { needsAnalysis: false };
    }

    const cv = cvs[0];
    
    // Ensure we have valid data
    if (!cv.id) {
      return { needsAnalysis: false };
    }
    
    // Check cache first before determining if analysis is needed
    const updatedAt = cv.updated_at ?? null;
    if (isCacheValid(cv.id, updatedAt)) {
      console.log("[RESUME-ANALYZER] Valid cache exists, no analysis needed for CV:", cv.id);
      return { needsAnalysis: false, cvId: cv.id };
    }
    
    // If CV has never been analyzed, it needs analysis
    if (!cv.last_analyzed_at) {
      console.log("[RESUME-ANALYZER] CV has never been analyzed:", cv.id);
      return { needsAnalysis: true, cvId: cv.id };
    }

    // If CV has been updated since last analysis, it needs analysis
    const lastAnalyzedDate = new Date(cv.last_analyzed_at);
    const lastUpdatedDate = new Date(cv.updated_at || '');
    
    if (cv.updated_at && lastUpdatedDate > lastAnalyzedDate) {
      console.log("[RESUME-ANALYZER] CV updated since last analysis:", cv.id);
      console.log(`[RESUME-ANALYZER] Last updated: ${lastUpdatedDate.toISOString()}, Last analyzed: ${lastAnalyzedDate.toISOString()}`);
      return { needsAnalysis: true, cvId: cv.id };
    }

    console.log("[RESUME-ANALYZER] CV is up to date, no analysis needed:", cv.id);
    return { needsAnalysis: false, cvId: cv.id };
  } catch (error) {
    console.error("[RESUME-ANALYZER] Error checking CV analysis status:", error);
    return { needsAnalysis: false };
  }
}

/**
 * Get or create resume analysis for the current authenticated user
 */
export async function getCurrentUserResumeAnalysis(forceRefresh = false): Promise<ApiResponse<any>> {
  console.log("[RESUME-ANALYZER] Getting analysis for current user, forceRefresh:", forceRefresh);
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error("[RESUME-ANALYZER] No authenticated user found");
      return { success: false, error: "No authenticated user found" };
    }

    // Step 1: Try to get existing analysis first, regardless of forceRefresh
    // This ensures we always try to load cached/stored analysis before potentially triggering new AI calls
    console.log("[RESUME-ANALYZER] First trying to get existing analysis");
    const existingAnalysis = await getResumeAnalysis(user.id);
    
    // If we found existing analysis and we're not forcing a refresh, return it
    if (existingAnalysis.success && !forceRefresh) {
      console.log("[RESUME-ANALYZER] Existing analysis found and no refresh forced - returning cached data");
      return existingAnalysis;
    }

    // If forcing a refresh, create new analysis immediately
    if (forceRefresh) {
      console.log("[RESUME-ANALYZER] Force refresh requested, creating new analysis for user:", user.id);
      // Clear cache for all CVs of this user
      const { data: userCvs } = await supabase
        .from("cvs")
        .select("id")
        .eq("user_id", user.id);
        
      if (userCvs) {
        userCvs.forEach(cv => {
          if (cv.id) {
            clearCacheForCv(cv.id);
          }
        });
      }
      
      return analyzeResume(user.id);
    }
    
    // If we get here, we don't have existing analysis or we're forcing a refresh
    // Check if CV needs analysis
    const { needsAnalysis, cvId } = await doesCvNeedAnalysis(user.id);
    
    // If analysis is needed and we have a CV ID, create new analysis
    if (needsAnalysis && cvId) {
      console.log("[RESUME-ANALYZER] Creating new analysis for updated CV:", cvId);
      return analyzeResume(user.id, cvId);
    }
    
    // If we reach here and we have existing analysis but it indicated no new analysis is needed,
    // return the existing analysis even though we couldn't determine from needsAnalysis
    if (existingAnalysis.success) {
      console.log("[RESUME-ANALYZER] Using existing analysis as CV doesn't need updating");
      return existingAnalysis;
    }
    
    // If we get here, there's no CV or it doesn't need analysis
    return { 
      success: false, 
      error: "No CV found or CV analysis is up to date" 
    };
  } catch (error: any) {
    console.error("[RESUME-ANALYZER] Error handling resume analysis:", error);
    return { success: false, error: error?.message || "Failed to analyze resume" };
  }
} 