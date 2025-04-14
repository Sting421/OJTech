"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/database";
import { clearClientStorage } from "@/lib/utils/auth-helpers";

interface AuthContextProps {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFixedInconsistency, setHasFixedInconsistency] = useState(false);
  
  // Create a single Supabase client instance that's used throughout the provider
  // This prevents the "Multiple GoTrueClient instances detected" warning
  const supabaseClient = useState(() => createClientComponentClient())[0];
  
  const router = useRouter();

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        console.log("Full error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('Profile data received:', data);
      return data;
    } catch (error) {
      console.error("Error in profile fetch:", error);
      return null;
    }
  };

  // Attempt to create a profile if it doesn't exist
  const ensureProfile = async (currentUser: User) => {
    console.log('Ensuring profile exists for user:', currentUser.id);
    try {
      const profileData = await fetchProfile(currentUser.id);
      
      if (!profileData) {
        console.log('No profile found, attempting to create one');
        // Profile doesn't exist, try to create it
        const { createUserProfile } = await import('@/lib/actions/auth-trigger');
        const result = await createUserProfile(
          currentUser.id, 
          currentUser.email || '', 
          currentUser.user_metadata?.full_name || ''
        );
        console.log('Profile creation result:', result);
        
        if (result.success) {
          // Fetch the profile again after creating it
          console.log('Fetching newly created profile');
          const newProfileData = await fetchProfile(currentUser.id);
          setProfile(newProfileData);
        } else {
          console.error('Failed to create profile:', result.error);
        }
      } else {
        console.log('Existing profile found:', profileData);
        
        // Check if there's an inconsistency: has_uploaded_cv is true but has_completed_onboarding is false
        if (profileData.has_uploaded_cv && !profileData.has_completed_onboarding && !hasFixedInconsistency) {
          console.log('Detecting profile inconsistency: CV uploaded but onboarding not marked as complete');
          
          try {
            // Mark that we've attempted to fix the inconsistency to avoid multiple attempts
            setHasFixedInconsistency(true);
            
            // Import updateProfile function
            const { updateProfile } = await import('@/lib/actions/profile');
            
            // Fix the inconsistency by marking onboarding as complete
            const updateResult = await updateProfile(currentUser.id, {
              has_completed_onboarding: true
            });
            
            console.log('Fixing profile inconsistency result:', updateResult);
            
            if (updateResult.success) {
              // Update the local profile data with the fixed version
              profileData.has_completed_onboarding = true;
            }
          } catch (updateError) {
            console.error('Error fixing profile inconsistency:', updateError);
            // Continue with the existing profile data even if the update failed
          }
        }
        
        setProfile(profileData);
      }
    } catch (profileError) {
      console.error("Error handling profile:", profileError);
      if (profileError instanceof Error) {
        console.log('Error details:', {
          name: profileError.name,
          message: profileError.message,
          stack: profileError.stack
        });
      }
      // Continue with null profile, the UI should handle this gracefully
    }
  };

  // Refresh user and profile data
  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
      
      if (user) {
        await ensureProfile(user);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      setProfile(null);
    }
  };

  // Sign out function
  const signOut = async () => {
    console.log("Auth provider signOut function called");
    try {
      // Clear user and profile state first to immediately update UI
      setUser(null);
      setProfile(null);
      console.log("User and profile state cleared for immediate UI update");
      
      // First, redirect to home page
      console.log("Redirecting to home page");
      router.push("/");
      
      // Clear any client-side storage immediately
      clearClientStorage();
      
      // Now sign out on the client side
      console.log("Calling supabase.auth.signOut()");
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error);
        throw error;
      }
      
      // Also sign out on the server side to ensure cookies are cleared
      console.log("Calling server-side sign out route");
      const serverSignOutResponse = await fetch("/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!serverSignOutResponse.ok) {
        console.error("Server-side sign out failed:", await serverSignOutResponse.text());
      } else {
        console.log("Server-side sign out successful");
      }
      
      console.log("Supabase signOut successful");
      
      // Refresh router to update UI
      console.log("Refreshing router");
      router.refresh();
      
      console.log("Sign out process completed");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // Initial auth state fetch
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Get initial auth state
        const { data: { user } } = await supabaseClient.auth.getUser();
        setUser(user);
        
        if (user) {
          await ensureProfile(user);
        } else {
          setProfile(null);
        }

        // Subscribe to auth changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            
            if (currentUser) {
              await ensureProfile(currentUser);
            } else {
              setProfile(null);
            }
            
            router.refresh();
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in auth initialization:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [supabaseClient, router]);

  const value = {
    user,
    profile,
    isLoading,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 