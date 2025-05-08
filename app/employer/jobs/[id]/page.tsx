"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJobById, deleteJob } from "@/lib/actions/job-actions";
import { 
  ArrowLeft, 
  CalendarIcon, 
  MapPinIcon, 
  BriefcaseIcon, 
  DollarSignIcon, 
  CheckCircle2Icon, 
  CircleIcon, 
  Edit,
  Loader2,
  PenSquare,
  UsersIcon,
  ClockIcon,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      try {
        const result = await getJobById(params.id);
        if (result.success) {
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

  const handleDeleteJob = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteJob(params.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Job deleted successfully",
        });
        router.push("/employer/jobs");
      } else {
        throw new Error(result.error || "Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Active
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            Draft
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper function to get required skills, handling both field names
  const getRequiredSkills = (job: any) => {
    return job.required_skills|| [];
  };

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
          The job you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button className="mt-4" onClick={() => router.push("/employer/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/employer/jobs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{job.title} <span className="text-md mb-3 text-muted-foreground">{renderStatusBadge(job.status)}</span></h1>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2">
            <div className="flex items-center text-muted-foreground">
              <BriefcaseIcon className="h-4 w-4 mr-1" />
              <span>{job.job_type}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center text-muted-foreground w-full">
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none text-muted-foreground">
                {job.description.split('\n').map((paragraph: string, i: number) => (
                  <p key={i} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getRequiredSkills(job).length > 0 ? (
                  getRequiredSkills(job).map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No required skills specified</p>
                )}
              </div>
            </CardContent>
          </Card>

          {job.preferred_skills && job.preferred_skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preferred Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.preferred_skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Company</div>
                <div className="text-muted-foreground">{job.company_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Location</div>
                <div className="text-muted-foreground">{job.location}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Job Type</div>
                <div className="text-muted-foreground">{job.job_type}</div>
              </div>
              {job.salary_range && (
                <div>
                  <div className="text-sm font-medium">Salary</div>
                  <div className="text-muted-foreground">{job.salary_range}</div>
                </div>
              )}
              {job.application_deadline && (
                <div>
                  <div className="text-sm font-medium">Application Deadline</div>
                  <div className="flex items-center text-muted-foreground">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {new Date(job.application_deadline).toLocaleDateString()}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium">Posted On</div>
                <div className="text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div className="text-muted-foreground">{new Date(job.updated_at).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/employer/jobs/${job.id}/applications`}>
                  <UsersIcon className="h-4 w-4 mr-2" />
                  View Applications
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/employer/jobs/${job.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Job
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Job
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this job?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the job and remove all associated applications.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteJob} 
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 