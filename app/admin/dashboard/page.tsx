"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Users, Briefcase, FilePlus2, LineChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmployers: 0,
    totalStudents: 0,
    totalJobs: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClientComponentClient();
        
        // Check if user is authorized first
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("Unauthorized");
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (profileError || profile?.role !== "admin") {
          throw new Error("Admin access required");
        }

        // Get total users count
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Get employer count
        const { count: totalEmployers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "employer");
        
        // Get student count
        const { count: totalStudents } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");
        
        // Get jobs count
        const { count: totalJobs } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true });
        
        setStats({
          totalUsers: totalUsers || 0,
          totalEmployers: totalEmployers || 0,
          totalStudents: totalStudents || 0,
          totalJobs: totalJobs || 0,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform activity and manage key metrics.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={<Users className="h-6 w-6" />} 
          loading={stats.loading} 
        />
        <StatsCard 
          title="Students" 
          value={stats.totalStudents} 
          icon={<Users className="h-6 w-6" />} 
          loading={stats.loading} 
        />
        <StatsCard 
          title="Employers" 
          value={stats.totalEmployers} 
          icon={<Briefcase className="h-6 w-6" />} 
          loading={stats.loading} 
        />
        <StatsCard 
          title="Job Listings" 
          value={stats.totalJobs} 
          icon={<FilePlus2 className="h-6 w-6" />} 
          loading={stats.loading} 
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between font-medium">
              <span>Recent Activity</span>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {stats.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <LineChart className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">No recent activity</p>
                <p className="text-sm text-muted-foreground">Activity tracking coming soon.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between font-medium">
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <a 
                href="/admin/users" 
                className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-center hover:bg-primary/90 transition-colors"
              >
                Manage Users & Employers
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, loading }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
