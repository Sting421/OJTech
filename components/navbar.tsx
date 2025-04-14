"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types/database";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  // Get navigation items based on user role
  const getNavItems = (role?: UserRole) => {
    const items = [
      { href: "/", label: "Home" },
    ];

    if (!user) {
      return items;
    }

    switch (role) {
      case "admin":
        return [
          ...items,
          { href: "/admin/dashboard", label: "Admin Dashboard" },
          { href: "/admin/users", label: "Manage Users" },
          { href: "/admin/employers", label: "Manage Employers" },
        ];
      case "employer":
        return [
          ...items,
          { href: "/jobs", label: "My Jobs" },
          { href: "/jobs/create", label: "Post Job" },
          { href: "/candidates", label: "Candidates" },
        ];
      case "student":
        return [
          ...items,
          { href: "/opportunities", label: "Find Jobs" },
          { href: "/track", label: "Track Applications" },
        ];
      default:
        return items;
    }
  };

  const navItems = getNavItems(profile?.role);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">OJTech</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {user ? (
            <div className="flex items-center space-x-4">
              {profile?.role && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium",
                  profile.role === "admin" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                  profile.role === "employer" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                  profile.role === "student" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                )}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              )}
              <Link href="/profile">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
