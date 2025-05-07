"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import JobForm from "@/components/employer/jobs/JobForm";
import { getJobById } from "@/lib/actions/job";
import { useToast } from "@/hooks/use-toast";

export default function EditJobPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      try {
        console.log("[EDIT-JOB] Fetching job details for ID:", params.id);
        const result = await getJobById(params.id);
        console.log("[EDIT-JOB] Job details result:", result);
        if (result.success) {
          console.log("[EDIT-JOB] Job details successfully loaded:", result.data);
          console.log("[EDIT-JOB] Required skills:", result.data.required_skills);
          setJob(result.data);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load job details",
            variant: "destructive",
          });
          router.push("/employer/jobs");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        router.push("/employer/jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.id, router, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Job not found</h2>
        <p className="text-muted-foreground mt-2">
          The job you're looking for doesn't exist or you don't have permission to edit it.
        </p>
        <Button className="mt-4" onClick={() => router.push("/employer/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/employer/jobs/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Job Details
        </Button>
      </div>

      <h1 className="text-3xl font-bold">Edit Job</h1>
      <p className="text-muted-foreground">
        Update your job posting details. Set status to "active" to make it visible to candidates.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm job={job} isEditing={true} />
        </CardContent>
      </Card>
    </div>
  );
}
