"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        
        // Get total users count
        const { count: totalUsers, error: usersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        if (usersError) throw usersError;
        
        // Get employer count
        const { count: totalEmployers, error: employersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "employer");
        
        if (employersError) throw employersError;
        
        // Get student count
        const { count: totalStudents, error: studentsError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");
        
        if (studentsError) throw studentsError;
        
        // Get jobs count
        const { count: totalJobs, error: jobsError } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true });
        
        if (jobsError) throw jobsError;
        
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              <LineChart className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Activity feed will be implemented in a future update.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <a 
                href="/admin/employers/create" 
                className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-center hover:bg-primary/90 transition-colors"
              >
                Register New Employer
              </a>
              <a 
                href="/admin/users" 
                className="block w-full py-3 px-4 bg-secondary text-secondary-foreground rounded-md text-center hover:bg-secondary/90 transition-colors"
              >
                Manage Users
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