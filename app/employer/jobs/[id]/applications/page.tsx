"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, User, Briefcase, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getJobById } from "@/lib/actions/job-actions";
import { getApplicationsForJob } from "@/lib/actions/application";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";

// Get the next step message based on application status
const getNextStepMessage = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Application is awaiting review';
    case 'reviewed':
      return 'You have reviewed this application and are considering shortlisting';
    case 'shortlisted':
      return 'You have shortlisted this candidate for an interview';
    case 'rejected':
      return 'You have rejected this application';
    case 'hired':
      return 'You have hired this candidate for the position';
    default:
      return 'Application status is being processed';
  }
};

// Map job application status to display colors
const getStatusColor = (status: string) => {
  const statusColors = {
    'pending': 'bg-yellow-500',
    'reviewed': 'bg-blue-500',
    'shortlisted': 'bg-green-500',
    'rejected': 'bg-red-500',
    'hired': 'bg-purple-500'
  } as const

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-500'
}

export default function JobApplicationsPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching job details for ID:", params.id);
        
        // Fetch job details first
        const jobResult = await getJobById(params.id);
        console.log("Job result:", jobResult);
        
        if (!jobResult.success) {
          throw new Error(jobResult.error || "Failed to load job details");
        }
        
        setJob(jobResult.data);
        
        // Now fetch applications
        console.log("Fetching applications for job ID:", params.id);
        const applicationsResult = await getApplicationsForJob(params.id);
        console.log("Applications result:", applicationsResult);
        
        // Direct database data check
        console.log("Job ID for applications query:", params.id);
        console.log("Verify application exists:", applicationsResult?.data?.applications?.length > 0);
        
        setDebugInfo({
          jobId: params.id,
          employerId: jobResult.data?.employer_id,
          applicationsResult
        });
        
        if (applicationsResult.success && applicationsResult.data) {
          console.log("Application data:", applicationsResult.data);
          setApplications(applicationsResult.data.applications || []);
        } else {
          console.error("Error fetching applications:", applicationsResult.error);
          toast({
            title: "Warning",
            description: "Job details loaded, but couldn't load applications: " + 
              (applicationsResult.error || "Unknown error"),
            variant: "destructive",
          });
          setApplications([]);
        }
      } catch (error) {
        console.error("Error in fetchJobDetails:", error);
        setDebugInfo({
          error: error instanceof Error ? error.message : String(error),
          jobId: params.id
        });
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
        router.push("/employer/jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.id, router, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "reviewed":
        return <Badge variant="secondary">Reviewed</Badge>;
      case "shortlisted":
        return <Badge variant="default">Shortlisted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/employer/jobs`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{job.title} - Applications</h1>
          <p className="text-muted-foreground">
            {job.company_name} • {job.location}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={applications.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Applications
        </Button>
      </div>

      {/* Debug information section */}
      {debugInfo && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-40 p-2 bg-yellow-100 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium">No Applications Yet</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your job posting hasn't received any applications yet. Applications will appear here as candidates apply.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="flex flex-col rounded-lg overflow-hidden"
            >
              <div className="p-4 sm:p-6 flex flex-col bg-gradient-to-b from-muted/50 to-muted/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(application.student?.full_name || application.student?.email || "")}
                        </AvatarFallback>
                        {application.student?.avatar_url && (
                          <AvatarImage src={application.student.avatar_url} alt="Student" />
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">{application.student?.full_name || "Unnamed Applicant"}</span>
                        <span className="text-sm text-muted-foreground">
                          {application.student?.email || "No email provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(application.status)} text-white px-3 py-1 text-xs uppercase`}>
                    {application.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Applied:</span>
                      </div>
                      <span className="font-medium">{formatDate(application.created_at)}</span>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Last Updated:</span>
                      </div>
                      <span className="font-medium">{formatDate(application.updated_at)}</span>
                    </div>
                    
                    {application.cv?.file_url && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(application.cv.file_url, '_blank')}
                          className="w-full"
                        >
                          View Resume/CV
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Application Status</h4>
                      <div className="p-3 rounded-lg bg-muted flex items-start gap-3">
                        {application.status === 'shortlisted' ? (
                          <CheckCircle className={cn("h-5 w-5 mt-0.5", "text-green-500")} />
                        ) : application.status === 'rejected' ? (
                          <AlertCircle className={cn("h-5 w-5 mt-0.5", "text-red-500")} />
                        ) : application.status === 'reviewed' ? (
                          <Clock className={cn("h-5 w-5 mt-0.5", "text-blue-500")} />
                        ) : (
                          <AlertCircle className={cn("h-5 w-5 mt-0.5", "text-yellow-500")} />
                        )}
                        <span className="text-sm">{getNextStepMessage(application.status)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/employer/jobs/${params.id}/applications/${application.id}`)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                      >
                        Review
                      </Button>
                    </div>
                    
                    {application.cover_letter && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Cover Letter</h4>
                        <div className="text-sm text-muted-foreground line-clamp-3 italic p-3 bg-muted/50 rounded">
                          "{application.cover_letter}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 