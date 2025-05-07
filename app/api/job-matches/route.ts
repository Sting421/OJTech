import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getMatchesByStudentId } from "@/lib/actions/matches";

// Constants for job matching API
const API_TIMEOUT_MS = 10000; // 10 seconds timeout

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
        console.error("[API-JOB-MATCHES] Non-admin user tried to access other user's matches");
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
    console.log(`[API-JOB-MATCHES] Returning ${matches.length} matches for student`);
    
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