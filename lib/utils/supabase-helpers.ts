import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";

/**
 * Creates a server component client for Supabase
 * This is useful for server components and server actions
 */
export function getSupabaseServerClient() {
  // For admin operations, use direct client with service role key
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service role credentials');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false
    },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${key}`);
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      }
    }
  });
}

/**
 * Creates a server Supabase client with cookie-based auth
 * Use this for regular authenticated operations
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerComponentClient({ 
    cookies: () => cookieStore
  });
}
