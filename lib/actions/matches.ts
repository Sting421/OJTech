"use server";

import { supabase } from "@/lib/supabase";
import { Match, ApiResponse } from "@/lib/types/database";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Get match by ID
export async function getMatchById(id: string): Promise<ApiResponse<Match>> {
  try {
    const { data: match, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: match };
  } catch (error) {
    console.error("Error fetching match:", error);
    return { success: false, error: "Failed to fetch match" };
  }
}

// Get matches for a specific CV (deprecated - use getMatchesByStudentId instead)
export async function getMatchesByCvId(
  cvId: string,
  page = 1,
  limit = 10
): Promise<ApiResponse<{ matches: Match[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if CV belongs to the current user
    const { data: cv, error: cvError } = await supabaseClient
      .from("cvs")
      .select("user_id")
      .eq("id", cvId)
      .single();

    if (cvError) throw cvError;
    
    if (cv.user_id !== user.id) {
      return { success: false, error: "You do not have permission to view these matches" };
    }

    // Instead of matching by CV ID, get the student profile ID (which is the user ID)
    // and use that to look up matches
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: matches, error, count } = await supabaseClient
      .from("matches")
      .select("*, jobs(title, description)", { count: "exact" })
      .eq("student_id", user.id)  // Use student_id instead of cv_id
      .order("match_score", { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    return { 
      success: true, 
      data: { 
        matches: matches || [],
        total: count || 0 
      }
    };
  } catch (error) {
    console.error("Error fetching matches for CV:", error);
    return { success: false, error: "Failed to fetch matches" };
  }
}

// Get matches for a specific job
export async function getMatchesByJobId(
  jobId: string,
  page = 1,
  limit = 10
): Promise<ApiResponse<{ matches: Match[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if job belongs to the current user (employer)
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select("employer_id")
      .eq("id", jobId)
      .single();

    if (jobError) throw jobError;
    
    if (job.employer_id !== user.id) {
      return { success: false, error: "You do not have permission to view these matches" };
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: matches, error, count } = await supabaseClient
      .from("matches")
      .select("*, student_profiles:student_id(id, full_name, photo_url)", { count: "exact" })
      .eq("job_id", jobId)
      .order("match_score", { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    return { 
      success: true, 
      data: { 
        matches: matches || [],
        total: count || 0 
      }
    };
  } catch (error) {
    console.error("Error fetching matches for job:", error);
    return { success: false, error: "Failed to fetch matches" };
  }
}

// Create a match
export async function createMatch(
  data: {
    student_id: string;
    job_id: string;
    match_score: number;
    status?: string;
  }
): Promise<ApiResponse<Match>> {
  try {
    // Check if a match with this student and job already exists
    const { data: existingMatch, error: checkError } = await supabase
      .from("matches")
      .select("id")
      .eq("student_id", data.student_id)
      .eq("job_id", data.job_id)
      .maybeSingle();

    if (checkError) throw checkError;
    
    if (existingMatch) {
      // Update existing match instead of creating a new one
      const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({ match_score: data.match_score })
        .eq("id", existingMatch.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: updatedMatch };
    }

    // Create new match
    const { data: newMatch, error } = await supabase
      .from("matches")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: newMatch };
  } catch (error) {
    console.error("Error creating/updating match:", error);
    return { success: false, error: "Failed to create/update match" };
  }
}

// Batch create matches (for AI-based matching)
export async function batchCreateMatches(
  matches: Array<{
    student_id: string;
    job_id: string;
    match_score: number;
    status?: string;
  }>
): Promise<ApiResponse<{ created: number, updated: number }>> {
  try {
    console.log(`[MATCHES] Batch processing ${matches.length} matches`);
    
    if (!matches || matches.length === 0) {
      return {
        success: true,
        data: { created: 0, updated: 0 }
      };
    }
    
    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const batch = matches.slice(i, i + BATCH_SIZE);
      console.log(`[MATCHES] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} matches)`);
      
      const { data, error } = await supabase
        .from("matches")
        .upsert(batch, {
          onConflict: "student_id,job_id", 
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        console.error(`[MATCHES] Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
      
      // Count how many records were created vs updated
      const newMatches = data.filter(m => m.created_at === m.updated_at).length;
      created += newMatches;
      updated += (data.length - newMatches);
      
      console.log(`[MATCHES] Batch results: ${newMatches} created, ${data.length - newMatches} updated`);
    }
    
    console.log(`[MATCHES] Batch processing completed. Total: ${created} created, ${updated} updated`);
    
    return {
      success: true,
      data: { created, updated }
    };
  } catch (error) {
    console.error("[MATCHES] Error in batch create matches:", error);
    return {
      success: false,
      error: "Failed to process matches"
    };
  }
}

/**
 * Delete a match by its ID
 */
export async function deleteMatch(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    return {
      success: true,
      data: null
    };
  } catch (error) {
    console.error("Error deleting match:", error);
    return {
      success: false,
      error: "Failed to delete match"
    };
  }
}

/**
 * Get matches for a student by their ID
 */
export async function getMatchesByStudentId(studentId: string): Promise<ApiResponse<Match[]>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        jobs:job_id (
          id,
          title,
          company_name,
          location,
          job_type,
          salary_range,
          description,
          status
        )
      `)
      .eq("student_id", studentId)
      .order("match_score", { ascending: false });

    if (error) throw error;
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error getting matches by student ID:", error);
    return {
      success: false,
      error: "Failed to get matches"
    };
  }
}

/**
 * Update a match status
 */
export async function updateMatchStatus(id: string, status: string): Promise<ApiResponse<Match>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error updating match status:", error);
    return {
      success: false,
      error: "Failed to update match status"
    };
  }
} 