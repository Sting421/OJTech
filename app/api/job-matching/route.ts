import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getMatchesByStudentId } from "@/lib/actions/matches";
import { supabase } from "@/lib/supabase";
import { generateJobMatches, batchGenerateAllMatches } from "@/lib/actions/job-matching";

// Constants for job matching API
const API_TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * Check if CV needs new job matching based on last update and last match time
 */
async function doesCvNeedMatching(cvId: string): Promise<boolean> {
  try {
    // Get the CV data with last_matched_at and updated_at
    const { data: cv, error } = await supabase
      .from("cvs")
      .select("id, updated_at, last_matched_at")
      .eq("id", cvId)
      .single();

    if (error || !cv) {
      return true; // If we can't check, better to run matching
    }

    // If CV has never been matched, it needs matching
    if (!cv.last_matched_at) {
      console.log("[API-JOB-MATCHING] CV has never been matched:", cv.id);
      return true;
    }

    // If CV has been updated since last matching, it needs matching
    const lastMatchedDate = new Date(cv.last_matched_at);
    const lastUpdatedDate = new Date(cv.updated_at);
    
    if (lastUpdatedDate > lastMatchedDate) {
      console.log("[API-JOB-MATCHING] CV updated since last matching:", cv.id);
      console.log(`[API-JOB-MATCHING] Last updated: ${lastUpdatedDate.toISOString()}, Last matched: ${lastMatchedDate.toISOString()}`);
      return true;
    }

    console.log("[API-JOB-MATCHING] CV is up to date, no matching needed:", cv.id);
    return false;
  } catch (error) {
    console.error("[API-JOB-MATCHING] Error checking CV matching status:", error);
    return true; // If we can't check, better to run matching
  }
}

/**
 * Update the CV's last_matched_at timestamp
 */
async function updateCvMatchTimestamp(cvId: string): Promise<void> {
  try {
    await supabase
      .from("cvs")
      .update({
        last_matched_at: new Date().toISOString()
      })
      .eq("id", cvId);
  } catch (error) {
    console.error("[API-JOB-MATCHING] Error updating CV match timestamp:", error);
  }
}

/**
 * GET handler for job matches
 */
export async function GET(request: NextRequest) {
  console.log("[API-JOB-MATCHES] Handling GET request");
  
  // Set up abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  try {
    // Get user from session
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("[API-JOB-MATCHES] No authenticated user");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Check if we have a specific userId in the query (for admin users)
    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get("userId") || user.id;
    
    // If requested user is different from authenticated user, check if admin
    if (requestedUserId !== user.id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (error || !data || data.role !== "admin") {
        console.error("[API-JOB-MATCHING] Non-admin user tried to access other user's matches");
        return NextResponse.json(
          { success: false, error: "Not authorized to view this data" },
          { status: 403 }
        );
      }
    }
    
    // Get matches with jobs data
    console.log("[API-JOB-MATCHES] Fetching matches for student:", requestedUserId);
    const matchesResult = await getMatchesByStudentId(requestedUserId);
    
    clearTimeout(timeoutId);
    
    if (!matchesResult.success) {
      console.error("[API-JOB-MATCHES] Error fetching matches:", matchesResult.error);
      return NextResponse.json(
        { success: false, error: matchesResult.error || "Failed to fetch job matches" },
        { status: 500 }
      );
    }
    
    const matches = matchesResult.data || [];
    console.log(`[API-JOB-MATCHING] Returning ${matches.length} matches for student`);
    
    // Return successful response with matches
    return NextResponse.json({
      success: true,
      data: matches
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle specific errors
    if (error instanceof Error) {
      console.error("[API-JOB-MATCHES] Error:", error.message);
      
      if (error.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Request timed out" },
          { status: 504 }
        );
      }
      
      // Authentication errors
      if (error.message.includes("auth") || error.message.includes("Authentication")) {
        return NextResponse.json(
          { success: false, error: "Authentication error" },
          { status: 401 }
        );
      }
      
      // Database errors
      if (error.message.includes("database") || error.message.includes("Database")) {
        return NextResponse.json(
          { success: false, error: "Database error" },
          { status: 500 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { success: false, error: "Failed to fetch job matches" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for job matching
 */
export async function POST(request: Request) {
  console.log("[API-JOB-MATCHING] Handling job matching request");
  
  try {
    // Verify user authentication
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { cvId, runAll = false } = body;
    
    // Check user role for "runAll" permission
    if (runAll) {
      const { data: userRole } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
        
      if (!userRole || userRole.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Admin permission required" },
          { status: 403 }
        );
      }
    }
    
    // If cvId is provided, use it. Otherwise, get the user's most recent CV
    let targetCvId = cvId;
    if (!targetCvId) {
      const { data: cvs, error } = await supabase
        .from("cvs")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (error || !cvs || cvs.length === 0) {
        return NextResponse.json(
          { success: false, error: "No CV found" },
          { status: 404 }
        );
      }
      
      targetCvId = cvs[0].id;
    }
    
    // Check if matching is needed (unless force refresh is requested)
    const forceRefresh = request.headers.get("x-force-refresh") === "true";
    
    if (!forceRefresh && !runAll) {
      const needsMatching = await doesCvNeedMatching(targetCvId);
      
      if (!needsMatching) {
        return NextResponse.json({
          success: true,
          message: "CV matching is up to date",
          data: { matchesCreated: 0, matchesUpdated: 0, upToDate: true }
        });
      }
    }
    
    // Run matching
    let result;
    
    if (runAll) {
      console.log("[API-JOB-MATCHING] Running batch matching for all CVs");
      result = await batchGenerateAllMatches();
    } else {
      console.log("[API-JOB-MATCHING] Running matching for CV:", targetCvId);
      result = await generateJobMatches(targetCvId);
      
      // Update last_matched_at timestamp
      if (result.success) {
        await updateCvMatchTimestamp(targetCvId);
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API-JOB-MATCHING] Error:", error);
    
    return NextResponse.json(
      { success: false, error: "Failed to run job matching" },
      { status: 500 }
    );
  }
} 