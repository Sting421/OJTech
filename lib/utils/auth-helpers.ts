/**
 * Clears client-side storage related to authentication
 */
export function clearClientStorage() {
  console.log("Client storage cleared during sign out");
  
  try {
    // Clear any auth-related localStorage items
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("supabase.auth.refreshToken");
    localStorage.removeItem("supabase.auth.expires_at");
    localStorage.removeItem("supabase.auth.user");
    
    // Clear any other Supabase auth items that might exist
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear cookies by setting them to expire immediately
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    
    // Set a specific cookie to indicate sign-out is in progress
    document.cookie = "auth_state=signed_out; path=/;";
    
    console.log("All auth-related client storage cleared");
  } catch (error) {
    console.error("Error clearing client storage:", error);
  }
} 