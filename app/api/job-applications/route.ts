import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get("jobId");
  const userId = searchParams.get("userId");
  
  if (!jobId) {
    return NextResponse.json(
      { error: "Missing jobId parameter" },
      { status: 400 }
    );
  }
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
      
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: "Error fetching user profile", details: profileError },
        { status: 500 }
      );
    }
    
    // Only employers or admins can access application data
    if (profile?.role !== "employer" && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Only employers or admins can access application data" },
        { status: 403 }
      );
    }
    
    // Check if job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("employer_id")
      .eq("id", jobId)
      .single();
    
    if (jobError) {
      console.error("Error fetching job:", jobError);
      return NextResponse.json(
        { error: "Error fetching job", details: jobError },
        { status: 500 }
      );
    }
    
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    
    // Get job applications
    let query = supabase
      .from("job_applications")
      .select(`
        id, 
        job_id, 
        student_id, 
        cv_id, 
        status, 
        created_at, 
        updated_at
      `)
      .eq("job_id", jobId);
    
    // If specific userId is provided, filter by it
    if (userId) {
      query = query.eq("student_id", userId);
    }
    
    const { data: applications, error } = await query;
    
    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json(
        { error: "Error fetching applications", details: error },
        { status: 500 }
      );
    }
    
    // If we have applications, fetch student data
    if (applications && applications.length > 0) {
      // Get all student ids
      const studentIds = applications.map(app => app.student_id);
      
      // Fetch student profiles
      const { data: students, error: studentsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", studentIds);
      
      if (studentsError) {
        console.error("Error fetching student profiles:", studentsError);
      }
      
      // Create a map of student_id to student data
      const studentMap = (students || []).reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {} as Record<string, any>);
      
      // Get student_profiles IDs for looking up match scores
      const emails = students?.map(s => s.email).filter(Boolean) || [];
      let studentProfileMap: Record<string, string> = {};
      let studentProfileDataMap: Record<string, any> = {}; // Map to store full student_profile data
      
      if (emails.length > 0) {
        const { data: studentProfiles } = await supabase
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
        const { data: matches } = await supabase
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
      
      // Add student data to each application
      applications.forEach((app: any) => {
        app.student = studentMap[app.student_id] || null;
        
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
    
    return NextResponse.json({ 
      success: true, 
      job_id: jobId,
      applications_count: applications?.length || 0,
      applications 
    });
    
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch job applications", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 