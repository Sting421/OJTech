"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LayoutDashboard, BriefcaseBusiness, Users, Settings, Building } from "lucide-react";

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  // Check if user is an employer
  useEffect(() => {
    if (!isLoading && profile && profile.role !== "employer") {
      router.push("/");
    }
  }, [profile, isLoading, router]);

  if (isLoading || !user || !profile) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Navigation items
  const navItems = [
    {
      name: "Dashboard",
      href: "/employer/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Jobs",
      href: "/employer/jobs",
      icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
      name: "Candidates",
      href: "/employer/candidates",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Company",
      href: "/employer/company",
      icon: <Building className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/employer/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex min-h-screen">


      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <Card>
          <CardContent className="p-0">
            <div className="flex justify-between">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="flex-1">
                  <Button
                    variant="ghost"
                    className="w-full py-3 rounded-none flex flex-col items-center justify-center h-16"
                  >
                    {item.icon}
                    <span className="text-xs mt-1">{item.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 pt-16 pb-16 md:pb-0">
        <div className="px-4 sm:px-6 md:px-8 py-6">{children}</div>
      </div>
    </div>
  );
}