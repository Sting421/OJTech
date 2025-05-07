"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, PenSquare, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteJob } from "@/lib/actions/job-actions";

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  jobType: string;
  status: "active" | "draft" | "closed";
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
  requiredSkills?: string[];
}

interface JobListProps {
  jobs: Job[];
  isLoading?: boolean;
  onJobDeleted?: (jobId: string) => void;
}

export default function JobList({ jobs, isLoading = false, onJobDeleted }: JobListProps) {
  const { toast } = useToast();
  const [deletingJobs, setDeletingJobs] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>No jobs found</CardTitle>
          <CardDescription>
            You haven't posted any jobs that match the current filters.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/employer/jobs/create">
            <Button>Create your first job</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      setDeletingJobs((prev) => [...prev, jobId]);
      
      const result = await deleteJob(jobId);
      
      if (result.success) {
        toast({
          title: "Job deleted",
          description: "The job posting has been removed successfully",
        });
        
        if (onJobDeleted) {
          onJobDeleted(jobId);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete job",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeletingJobs((prev) => prev.filter(id => id !== jobId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300";
      case "draft":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300";
      case "closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300";
    }
  };

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Card key={job.id} className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{job.title}</CardTitle>
                <CardDescription>
                  {job.location} • {job.jobType}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(job.status)} variant="outline">
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/employer/jobs/${job.id}/edit`}>
                      <DropdownMenuItem>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Edit job
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={deletingJobs.includes(job.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingJobs.includes(job.id) ? "Deleting..." : "Delete job"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {job.description}
            </p>
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {job.requiredSkills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {job.requiredSkills.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{job.requiredSkills.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-1 h-4 w-4" />
              {job.applicationCount !== undefined
                ? `${job.applicationCount} application${
                    job.applicationCount !== 1 ? "s" : ""
                  }`
                : "No applications yet"}
            </div>
            <div className="text-sm text-muted-foreground">
              Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 