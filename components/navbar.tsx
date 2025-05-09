"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, isLoading } = useAuth();
  
  useEffect(() => {
    // Update loading state classes
    document.body.classList.toggle('auth-checking', isLoading);
    document.body.classList.toggle('auth-ready', !isLoading);

    if (!isLoading) {
      router.refresh();
    }
  }, [isLoading, router]);

  // Don't render anything while checking auth
  if (isLoading) {
    return (
      <nav className="w-full bg-black text-white border-b border-gray-800">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between">
          <div className="flex items-center">
            <span className="font-bold text-lg mr-8">OJTech</span>
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 loading-spinner" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full bg-black text-white border-b border-gray-800">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="font-bold text-lg mr-8">
            OJTech
          </Link>
          
          {user && profile?.role && (
            <div className="flex space-x-6">
              {/* Common navigation for all non-student users */}
              {profile.role !== "student" && (
                <Link href="/" className={pathname === "/" ? "font-medium" : "text-gray-400 hover:text-white"}>
                  Home
                </Link>
              )}
              
              {/* Student-specific navigation */}
              {profile.role === "student" && (
                <>
                  <Link href="/opportunities" className={pathname.startsWith("/opportunities") ? "font-medium" : "text-gray-400 hover:text-white"}>
                    Find Jobs
                  </Link>
                  <Link href="/track" className={pathname.startsWith("/track") ? "font-medium" : "text-gray-400 hover:text-white"}>
                    Track Applications
                  </Link>
                </>
              )}
              
              {/* Employer-specific navigation */}
              {profile.role === "employer" && (
                <>
                  <Link href="/employer/jobs" className={pathname.startsWith("/employer/jobs") ? "font-medium" : "text-gray-400 hover:text-white"}>
                    Manage Jobs
                  </Link>
                </>
              )}
              
              {/* Admin-specific navigation */}
              {profile.role === "admin" && (
                <>
                  <Link href="/admin/dashboard" className={pathname.startsWith("/admin/dashboard") ? "font-medium" : "text-gray-400 hover:text-white"}>
                    Dashboard
                  </Link>
                  <Link href="/admin/users" className={pathname.startsWith("/admin/users") ? "font-medium" : "text-gray-400 hover:text-white"}>
                    Users
                  </Link>         
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {profile?.role && (
                <span className="px-2 py-1 text-xs rounded-full bg-green-600 text-white font-medium">
                  {profile.role}
                </span>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 bg-gray-700 cursor-pointer">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-white">
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={profile?.role === "employer" ? "/employer/dashboard" : "/profile"} className="w-full cursor-pointer">
                      {profile?.role === "employer" ? "Company Profile" : "My Resume"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" className="text-white">Log In</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-white text-black hover:bg-gray-200">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
