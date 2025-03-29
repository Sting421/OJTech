"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserCircle, GraduationCap, LogOut } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-bold">OJTech</span>
        </Link>
        
        <div className="flex items-center space-x-4 ml-auto">
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
          
          {user ? (
            <>
              <Link href="/track">
                <Button variant="ghost" className={pathname === "/track" ? "bg-accent" : ""}>
                  Track Applications
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className={pathname === "/profile" ? "bg-accent" : ""}>
                  <UserCircle className="h-5 w-5 mr-2" />
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
