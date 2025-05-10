import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Check auth session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Get user's profile to check role and onboarding status
  let profile = null;
  if (session?.user.id) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, cv_processing_status')
      .eq('id', session.user.id)
      .single();
    profile = profileData;

    // If profile exists, also check CV status
    if (profileData) {
      const { data: cvData } = await supabase
        .from('cvs')
        .select('status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Add CV status to profile
      profile = {
        ...profileData,
        cv_status: cvData?.status || null
      };
    }
  }

  // Define protected routes
  const studentRoutes = ['/opportunities', '/track', '/success-guide'];
  // Move /profile to its own variable for special handling
  const profileRoute = '/profile';
  const employerRoutes = ['/employer'];
  const adminRoutes = ['/admin'];
  const publicRoutes = ['/auth', '/onboarding'];
  
  // Get the pathname and search params
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const hasStudentIdParam = searchParams.has('student_id');

  // Function to check if current path matches any of the routes
  const matchesRoute = (routes: string[]) => {
    return routes.some(route => path.startsWith(route));
  };

  // Check if user is coming from onboarding
  const isFromOnboarding = request.headers.get('referer')?.includes('/onboarding');

  // If at root path and authenticated as student
  if (path === '/' && session && profile?.role === 'student') {
    if (profile?.has_completed_onboarding) {
      // If coming from onboarding, go to success guide
      if (isFromOnboarding) {
        return NextResponse.redirect(new URL('/success-guide', request.url));
      }
      // Otherwise, go to opportunities page instead of track
      return NextResponse.redirect(new URL('/opportunities', request.url));
    }
    // If onboarding not completed, redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // Handle authentication
  if (!session) {
    // If trying to access protected routes without auth, redirect to login
    if (matchesRoute([...studentRoutes, profileRoute, ...employerRoutes, ...adminRoutes])) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    return res;
  }

  // If user is authenticated but hasn't completed onboarding
  if (profile && !profile.has_completed_onboarding && !path.startsWith('/onboarding')) {
    // Don't redirect if trying to access auth routes
    if (!matchesRoute(publicRoutes)) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Protect student routes
  if (matchesRoute(studentRoutes)) {
    // Allow access if:
    // 1. User has completed onboarding AND uploaded CV
    // 2. OR CV is in processing state (upload completed but parsing in progress)
    // 3. OR user is accessing success-guide page (which shows CV processing status)
    const cvIsProcessing = 
      profile?.cv_status === 'processing' || 
      profile?.cv_status === 'uploaded' ||
      ['uploading', 'parsing', 'analyzing', 'matching'].includes(profile?.cv_processing_status || '');
    
    const hasCompletedRequirements = profile?.has_completed_onboarding && profile?.has_uploaded_cv;
    const isAccessingSuccessGuide = path === '/success-guide';

    if (!hasCompletedRequirements && !cvIsProcessing && !isAccessingSuccessGuide) {
      console.log('Redirecting to onboarding - CV Status:', profile?.cv_status, 'Processing Status:', profile?.cv_processing_status);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    
    // Special case: If CV had an error but user is not on success guide, redirect to success guide
    if (profile?.cv_processing_status === 'error' && !isAccessingSuccessGuide) {
      console.log('Redirecting to success guide due to CV processing error');
      return NextResponse.redirect(new URL('/success-guide', request.url));
    }
  }

  // Special handling for profile route
  if (path.startsWith(profileRoute)) {
    // Allow employers and admins to access with student_id param
    if (hasStudentIdParam && (profile?.role === 'employer' || profile?.role === 'admin')) {
      return res; // Grant access
    }
    
    // For students or when no student_id is provided, apply the same rules as other student routes
    const cvIsProcessing = 
      profile?.cv_status === 'processing' || 
      profile?.cv_status === 'uploaded' ||
      ['uploading', 'parsing', 'analyzing', 'matching'].includes(profile?.cv_processing_status || '');
    
    const hasCompletedRequirements = profile?.has_completed_onboarding && profile?.has_uploaded_cv;
    
    if (profile?.role === 'student' && !hasCompletedRequirements && !cvIsProcessing) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Protect employer routes
  if (matchesRoute(employerRoutes)) {
    if (profile?.role !== 'employer') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect admin routes
  if (matchesRoute(adminRoutes)) {
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return res;
}

// Configure which routes to run the middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
