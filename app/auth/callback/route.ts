import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUserProfile } from "@/lib/actions/auth-trigger";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('Auth callback initiated');
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  if (code) {
    console.log('Auth code received, exchanging for session');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      console.log("Full error details:", {
        code: error.code,
        message: error.message
      });
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Authentication%20failed`);
    }

    // If we have a user, create a profile for them if one doesn't exist
    if (user) {
      console.log('User authenticated:', { id: user.id, email: user.email });
      try {
        // Try to create a profile for the user
        // This is needed in case the database trigger didn't work
        const fullName = user.user_metadata?.full_name || '';
        console.log('Attempting to create profile with data:', {
          id: user.id,
          email: user.email,
          fullName
        });
        
        const result = await createUserProfile(user.id, user.email || '', fullName);
        console.log('Profile creation result:', result);
        
        // Check user's role and profile status
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role, has_completed_onboarding, has_uploaded_cv")
          .eq("id", user.id)
          .maybeSingle();
        
        // If the user is an admin, always redirect to admin dashboard
        if (profileData && profileData.role === "admin") {
          console.log('Admin user detected, redirecting to admin dashboard');
          return NextResponse.redirect(`${requestUrl.origin}/admin/dashboard`);
        }
        
        // If the user has already completed onboarding or uploaded a CV, redirect based on role
        if (profileData && (profileData.has_completed_onboarding || profileData.has_uploaded_cv)) {
          console.log('User has already completed onboarding or uploaded a CV, redirecting based on role');
          
          // Fix inconsistency if needed (in background, doesn't affect redirect)
          if (profileData.has_uploaded_cv && !profileData.has_completed_onboarding) {
            console.log('Fixing profile inconsistency in the background');
            
            // Use try-catch instead of promise chain
            try {
              const result = await supabase
                .from("profiles")
                .update({ has_completed_onboarding: true })
                .eq("id", user.id);
              
              console.log('Profile consistency fix result:', result);
            } catch (error) {
              console.error('Error fixing profile consistency:', error);
            }
          }
          
          // Redirect based on user role
          if (profileData.role === "employer") {
            console.log('Employer user detected, redirecting to employer dashboard');
            return NextResponse.redirect(`${requestUrl.origin}/employer/dashboard`);
          } else if (profileData.role === "student") {
            console.log('Student user detected, redirecting to track applications page');
            return NextResponse.redirect(`${requestUrl.origin}/track`);
          }
          
          // Fallback to home page if role is not recognized
          return NextResponse.redirect(requestUrl.origin);
        }
        
        // Otherwise, redirect to role-specific onboarding (for non-admin users only)
        console.log('Redirecting to role-specific onboarding');
        
        // Redirect based on user role for onboarding
        if (profileData && profileData.role === "employer") {
          console.log('Employer user detected, redirecting to employer onboarding');
          return NextResponse.redirect(`${requestUrl.origin}/onboarding/employer`);
        } else if (profileData && profileData.role === "student") {
          // Students use the general onboarding page
          console.log('Student user detected, redirecting to general onboarding');
          return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
        } else {
          // Fallback for any other roles
          console.log('Other user role detected, redirecting to general onboarding');
          return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        if (err instanceof Error) {
          console.log('Error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
        }
      }
    } else {
      console.log('No user data received from session exchange');
    }

    // Redirect to the home page as fallback
    console.log('Redirecting to home page');
    return NextResponse.redirect(requestUrl.origin);
  }

  // If no code, redirect to login
  console.log('No auth code found, redirecting to login');
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}
