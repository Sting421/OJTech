"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserCircle, GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, isLoading } = useAuth();
  
  // Add local state to handle sign-out UI updates immediately
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    console.log("Sign out button clicked");
    try {
      // Set local state to immediately hide authenticated UI
      setIsSigningOut(true);
      
      // Call the auth provider's signOut function
      await signOut();
      console.log("Sign out completed successfully");
    } catch (error) {
      // On error, revert the local state
      setIsSigningOut(false);
      console.error("Error in navbar sign out:", error);
    }
  };
  
  // Reset signing out state if user is re-authenticated
  useEffect(() => {
    if (user && isSigningOut) {
      setIsSigningOut(false);
    }
  }, [user, isSigningOut]);

  // Determine whether to show authenticated UI elements
  const isAuthenticated = !isLoading && user && !isSigningOut;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-bold">OJTech</span>
        </Link>
        
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/">
            <Button variant="ghost" className={pathname === "/" ? "bg-accent" : ""}>
              Home
            </Button>
          </Link>
          <Link href="/opportunities">
            <Button variant="ghost" className={pathname === "/opportunities" ? "bg-accent" : ""}>
              Opportunities
            </Button>
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/track">
                <Button variant="ghost" className={pathname === "/track" ? "bg-accent" : ""}>
                  Track Applications
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className={pathname === "/profile" ? "bg-accent" : ""}>
                  {profile?.avatar_url ? (
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <UserCircle className="h-5 w-5 mr-2" />
                  )}
                  Profile
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
