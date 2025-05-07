"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

/**
 * OnboardingCheckLayout
 * 
 * A higher-level layout component that wraps all pages and performs authentication
 * and onboarding checks before rendering the page content.
 * 
 * This component:
 * 1. Checks if the user is authenticated for protected routes
 * 2. Redirects employers to onboarding if they haven't completed it
 * 3. Redirects students to onboarding if they haven't completed it
 * 4. Shows a loading state while performing these checks
 */

// Paths that should be accessible without onboarding completion
const EXEMPT_PATHS = [
  "/onboarding",
  "/auth",
  "/", // Home page
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
];

export function OnboardingCheckLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip checks if path is exempt (public pages, auth pages, onboarding pages)
    const isExemptPath = EXEMPT_PATHS.some(path => pathname.startsWith(path));
    
    if (!isLoading) {
      // Authentication check: If user is not authenticated and trying to access a protected route
      if (!user && !isExemptPath) {
        console.log('User not authenticated, redirecting to login');
        router.push("/auth/login");
      } 
      // Employer onboarding check: Redirect to employer onboarding if not completed
      else if (
        user && 
        profile?.role === "employer" && 
        !profile.has_completed_onboarding && 
        !pathname.startsWith("/onboarding/employer")
      ) {
        console.log('Employer onboarding not completed, redirecting to onboarding');
        router.push("/onboarding/employer");
      }
      // Student onboarding check: Redirect to student onboarding if not completed
      else if (
        user && 
        profile?.role === "student" && 
        !profile.has_completed_onboarding && 
        !pathname.startsWith("/onboarding")
      ) {
        console.log('Student onboarding not completed, redirecting to onboarding');
        router.push("/onboarding");
      }
      
      // All checks complete, allow rendering the page content
      setIsChecking(false);
    }
  }, [user, profile, isLoading, pathname, router]);
  

  // Show loading state while checking
  if (isLoading || isChecking) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render children once checks are complete
  return <>{children}</>;
}