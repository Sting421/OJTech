import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Check if this is the onboarding route specifically
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");
  
  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = ["/profile", "/track", "/onboarding"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  
  // For onboarding route specifically, check if the user has already completed onboarding
  if (isOnboardingRoute && session) {
    try {
      // Check user's profile for onboarding status
      const { data: profileData } = await supabase
        .from("profiles")
        .select("has_completed_onboarding, has_uploaded_cv")
        .eq("id", session.user.id)
        .maybeSingle();
      
      // If the user has completed onboarding or uploaded a CV, redirect to home
      if (profileData && (profileData.has_completed_onboarding || profileData.has_uploaded_cv)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // Continue to onboarding if there's an error checking the status
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
