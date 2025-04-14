import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies });
  
  // Set a cookie to indicate sign out is in progress
  // This helps middleware know that we're in the middle of signing out
  const response = NextResponse.json({ success: true });
  response.cookies.set("is_signing_out", "true", { 
    maxAge: 10, // Short-lived cookie, just for the sign out process
    path: "/",
  });
  
  // Sign out on the server (clears cookies)
  await supabase.auth.signOut();
  
  return response;
} 