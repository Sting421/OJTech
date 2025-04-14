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

// Get matches for a specific CV
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

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: matches, error, count } = await supabaseClient
      .from("matches")
      .select("*, jobs(title, description)", { count: "exact" })
      .eq("cv_id", cvId)
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
      .select("*, cvs(user_id, profiles:user_id(full_name, avatar_url))", { count: "exact" })
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
  data: Omit<Match, "id" | "created_at">
): Promise<ApiResponse<Match>> {
  try {
    // Check if a match with this CV and job already exists
    const { data: existingMatch, error: checkError } = await supabase
      .from("matches")
      .select("id")
      .eq("cv_id", data.cv_id)
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
  matches: Omit<Match, "id" | "created_at">[]
): Promise<ApiResponse<{ created: number, updated: number }>> {
  try {
    let created = 0;
    let updated = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      
      for (const match of batch) {
        // Check if match already exists
        const { data: existingMatch, error: checkError } = await supabase
          .from("matches")
          .select("id")
          .eq("cv_id", match.cv_id)
          .eq("job_id", match.job_id)
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingMatch) {
          // Update existing match
          const { error } = await supabase
            .from("matches")
            .update({ match_score: match.match_score })
            .eq("id", existingMatch.id);

          if (error) throw error;
          updated++;
        } else {
          // Create new match
          const { error } = await supabase
            .from("matches")
            .insert([match]);

          if (error) throw error;
          created++;
        }
      }
    }

    return { 
      success: true, 
      data: { created, updated } 
    };
  } catch (error) {
    console.error("Error in batch match creation:", error);
    return { success: false, error: "Failed to create/update matches in batch" };
  }
}

// Delete match
export async function deleteMatch(id: string): Promise<ApiResponse<void>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user has permission to delete this match
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("job_id, cvs(user_id), jobs(employer_id)")
      .eq("id", id)
      .single();

    if (matchError) throw matchError;
    
    const hasPermission = 
      match.cvs?.user_id === user.id || // CV owner
      match.jobs?.employer_id === user.id; // Job owner
    
    if (!hasPermission) {
      return { success: false, error: "You do not have permission to delete this match" };
    }

    const { error } = await supabaseClient
      .from("matches")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting match:", error);
    return { success: false, error: "Failed to delete match" };
  }
} 