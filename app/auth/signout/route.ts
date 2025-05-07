import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

// Add GET handler for direct navigation to /auth/signout
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies });
  
  // Sign out on the server
  await supabase.auth.signOut();
  
  // Create response that redirects to login
  const response = NextResponse.redirect(new URL('/auth/login', request.url));
  
  // Explicitly clear all auth-related cookies
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  response.cookies.delete('supabase-auth-token');
  
  return response;
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies });
  
  // Sign out on the server
  await supabase.auth.signOut();
  
  // Create response with all auth cookies cleared and set reload flag
  const response = NextResponse.json({ 
    success: true,
    shouldReload: true 
  });
  
  // Clear all auth-related cookies
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'user-info'
  ];
  
  cookiesToClear.forEach(cookieName => {
    response.cookies.delete(cookieName);
  });
  
  // Clear session cookie
  response.cookies.set({
    name: 'session',
    value: '',
    maxAge: 0
  });
  
  // Set sign-out flag
  response.cookies.set({
    name: "is_signing_out",
    value: "true",
    maxAge: 5,
    secure: true,
    httpOnly: true
  });
  
  return response;
}
