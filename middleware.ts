import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "@/lib/types/database";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Special handling for sign out
  const isSignOutProcess = request.headers.get('referer')?.includes('/auth/signout') || 
                          request.cookies.has('is_signing_out');
  
  if (isSignOutProcess) {
    // For sign out requests, clear the session and cookies
    if (request.nextUrl.pathname === '/auth/signout') {
      const response = NextResponse.next();
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      return response;
    }
    return res;
  }

  // Get path info
  const pathname = request.nextUrl.pathname;
  
  // Check for query parameters that might affect access restrictions
  const searchParams = request.nextUrl.searchParams;
  const hasStudentIdParam = searchParams.has('student_id');
  
  // Define protected routes and their allowed roles
  const protectedRoutes: Record<string, UserRole[]> = {
    "/admin": ["admin"],
    "/employer": ["employer", "admin"],
    "/track": ["student", "admin"],
    "/profile": ["student", "employer", "admin"],
    "/onboarding": ["student", "employer", "admin"],
    "/jobs/create": ["employer", "admin"],
    "/candidates": ["employer", "admin"]
  } as const;

  // Check if current path is protected
  const matchingRoute = Object.keys(protectedRoutes).find(route => 
    pathname.startsWith(route)
  );

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // If not authenticated and trying to access protected route
  if (matchingRoute && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If authenticated, verify role-based access
  if (session && matchingRoute) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const userRole = profileData?.role as UserRole;
      const allowedRoles = protectedRoutes[matchingRoute];

      // Special handling for profile routes with student_id parameter
      // Only employers and admins can view other students' profiles
      if (pathname === "/profile" && hasStudentIdParam && 
          userRole === "student" && searchParams.get('student_id') !== session.user.id) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Redirect if user's role is not allowed for this route
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // For onboarding route, check if already completed
      if (isOnboardingRoute) {
        const { data: onboardingData } = await supabase
          .from("profiles")
          .select("has_completed_onboarding, has_uploaded_cv")
          .eq("id", session.user.id)
          .maybeSingle();

        // If onboarding is completed, redirect away from onboarding route
        if (onboardingData && (onboardingData.has_completed_onboarding || onboardingData.has_uploaded_cv)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      // On error, redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Auth routes - redirect to home if already authenticated
  const authRoutes = ["/auth/login", "/auth/register"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isAuthRoute && session) {
    // Check user role for redirection after login
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileData?.role === "employer") {
      return NextResponse.redirect(new URL("/employer/jobs", request.url));
    }
    
    return NextResponse.redirect(new URL("/", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
