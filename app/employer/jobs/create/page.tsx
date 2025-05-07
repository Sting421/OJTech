"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import JobForm from "@/components/employer/jobs/JobForm";
import { useAuth } from "@/providers/auth-provider";
import { getEmployerByUserId } from "@/lib/actions/employer";
import { Button } from "@/components/ui/button";

export default function CreateJobPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [employer, setEmployer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployerProfile = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const result = await getEmployerByUserId();
        if (result.success) {
          setEmployer(result.data);
        } else if (result.error === "Employer profile not found") {
          // Redirect to onboarding if employer profile is not complete
          router.push("/onboarding/employer");
        }
      } catch (error) {
        console.error("Error fetching employer profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployerProfile();
  }, [user, router]);

  // Redirect non-employer users
  if (profile && profile.role !== "employer") {
    router.push("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-center text-muted-foreground">
          Please complete your employer profile first.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/employer/jobs")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>

      <h1 className="text-3xl font-bold">Create New Job</h1>
      <p className="text-muted-foreground">
        Fill out the form below to create a new job posting. Jobs set to "Active" will be visible to candidates.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm />
        </CardContent>
      </Card>
    </div>
  );
} 