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
    // Allow the sign out process to complete without redirects
    return res;
  }

  // Check route types
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isEmployerRoute = request.nextUrl.pathname.startsWith("/jobs/create") || 
                         request.nextUrl.pathname.startsWith("/candidates");
  const isStudentRoute = request.nextUrl.pathname.startsWith("/track");
  
  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = ["/profile", "/track", "/onboarding", "/admin", "/jobs/create", "/candidates"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  
  // If authenticated, check role-based access
  if (session) {
    try {
      // Get user's role from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      
      const userRole = profileData?.role as UserRole;
      
      // Check admin routes
      if (isAdminRoute && userRole !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      
      // Check employer routes
      if (isEmployerRoute && userRole !== "employer" && userRole !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      
      // Check student routes
      if (isStudentRoute && userRole !== "student" && userRole !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      
      // For onboarding route, check if already completed
      if (isOnboardingRoute) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("has_completed_onboarding, has_uploaded_cv")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (profileData && (profileData.has_completed_onboarding || profileData.has_uploaded_cv)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      // On error checking role, redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Auth routes - redirect to home if already authenticated
  const authRoutes = ["/auth/login", "/auth/register"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
