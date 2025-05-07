import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/test-supabase
 * Test the Supabase connection
 */
export async function GET() {
  console.log("[TEST-SUPABASE] Testing Supabase connection");
  
  try {
    // Check Supabase URL and Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[TEST-SUPABASE] Supabase environment variables not properly set");
      const missing = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      
      return NextResponse.json({
        success: false,
        error: "Supabase configuration is incomplete",
        missing
      }, { status: 500 });
    }
    
    // Test connection with a simple query
    console.log("[TEST-SUPABASE] Testing database connection");
    const { data, error, count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    if (error) {
      console.error("[TEST-SUPABASE] Database query error:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    // Test tables exist by getting counts
    console.log("[TEST-SUPABASE] Testing key tables");
    const tableResults: Record<string, { 
      exists: boolean;
      count?: number;
      error?: string;
      code?: string;
      details?: string;
    }> = {};
    
    const tablesToCheck = ["profiles", "cvs", "jobs", "matches"];
    
    for (const table of tablesToCheck) {
      console.log("[TEST-SUPABASE] Checking table:", table);
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        
        if (error) {
          console.error("[TEST-SUPABASE] Error accessing table", table, ":", error);
          tableResults[table] = {
            exists: false,
            error: error.message,
            code: error.code
          };
        } else {
          console.log("[TEST-SUPABASE] Table", table, "exists, count:", count);
          tableResults[table] = {
            exists: true,
            count: count || 0
          };
        }
      } catch (tableError) {
        console.error("[TEST-SUPABASE] Exception checking table", table, ":", tableError);
        tableResults[table] = {
          exists: false,
          error: tableError instanceof Error ? tableError.message : "Unknown error"
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Supabase connection test completed",
      supabaseConfigured: true,
      supabaseUrlMasked: supabaseUrl.substring(0, 15) + "...",
      supabaseKeyMasked: supabaseKey.substring(0, 5) + "...",
      tables: tableResults
    });
  } catch (error) {
    console.error("[TEST-SUPABASE] Unexpected error during connection test:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
} 