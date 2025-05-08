"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, User, Briefcase, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Building, GraduationCap, Phone, AtSign, BookOpen, X, FileText, PenSquare, Award, Mail, MapPinned, UserCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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
    'pending': 'bg-gray-500',
    'reviewed': 'bg-gray-600',
    'shortlisted': 'bg-gray-800',
    'rejected': 'bg-gray-700',
    'hired': 'bg-gray-900'
  } as const

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-400'
}

// Get color for match score - FIXED to properly show high scores as good (green)
const getMatchScoreColor = (score: number) => {
  if (score >= 80) return { bg: "bg-green-100", text: "text-green-600", progress: "bg-green-600" };
  if (score >= 60) return { bg: "bg-blue-100", text: "text-blue-600", progress: "bg-blue-600" };
  if (score >= 40) return { bg: "bg-yellow-100", text: "text-yellow-600", progress: "bg-yellow-600" };
  return { bg: "bg-red-100", text: "text-red-600", progress: "bg-red-600" };
}

// Get match label based on score
const getMatchLabel = (score: number) => {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Potential match";
  return "Low match";
}

// Function to format the CV skills for display
const formatCvSkills = (cv: any): string[] => {
  if (!cv?.skills) return [];
  
  try {
    const skills = typeof cv.skills === 'string' 
      ? JSON.parse(cv.skills)
      : cv.skills;
      
    if (Array.isArray(skills)) {
      return skills.map(skill => typeof skill === 'string' ? skill : (skill.name || '')).filter(Boolean);
    } else if (typeof skills === 'object') {
      // Handle object with potential nested arrays
      const extractedSkills = [];
      for (const key in skills) {
        if (Array.isArray(skills[key])) {
          extractedSkills.push(...skills[key].map((s: any) => 
            typeof s === 'string' ? s : (s.name || '')
          ).filter(Boolean));
        } else if (typeof skills[key] === 'string') {
          extractedSkills.push(skills[key]);
        }
      }
      return extractedSkills;
    }
    return [];
  } catch (e) {
    console.error("Error parsing CV skills:", e);
    return [];
  }
};

export default function JobApplicationsPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      setIsError(false);
      
      try {
        // Fetch job details first
        const jobResult = await getJobById(params.id);
        
        if (!jobResult.success) {
          setIsError(true);
          setErrorMessage(jobResult.error || "Failed to load job details");
          toast({
            title: "Error",
            description: jobResult.error || "Failed to load job details",
            variant: "destructive",
          });
          return;
        }
        
        setJob(jobResult.data);
        
        // Now fetch applications
        const applicationsResult = await getApplicationsForJob(params.id);
        
        if (applicationsResult.success && applicationsResult.data) {
          setApplications(applicationsResult.data.applications || []);
        } else {
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
        setIsError(true);
        setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.id, router, toast]);

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

  if (isError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Error Loading Job</h2>
        <p className="text-muted-foreground mt-2">
          {errorMessage || "There was an error loading this job's applications."}
        </p>
        <Button className="mt-4" onClick={() => router.push("/employer/jobs")}>
          Back to Jobs
        </Button>
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {job.title}
            <span className="text-lg font-normal bg-muted/30 px-2.5 py-0.5 rounded-full">
              {job.status}
            </span>
          </h1>
          <p className="text-muted-foreground">
            {job.company_name} • {job.location}
          </p>
        </div>
      </div>

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
          {applications.map((application) => {
            const scoreColors = application.match_score !== undefined ? 
              getMatchScoreColor(application.match_score) : 
              { bg: "bg-gray-100", text: "text-gray-500", progress: "bg-gray-400" };
              
            // Format CV skills for each application
            const cvSkills = application.cv ? formatCvSkills(application.cv) : [];
              
            return (
              <Card key={application.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-6 bg-gradient-to-b from-muted/30 to-transparent">
                    {/* Top Row - Applicant Basic Info & Status */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border">
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
                      <div className="flex flex-col items-end gap-2">
                  <Badge className={`${getStatusColor(application.status)} text-white px-3 py-1 text-xs uppercase`}>
                    {application.status}
                  </Badge>
                        {application.match_score !== undefined && (
                          <div className={`flex items-center px-3 py-1 rounded-md ${scoreColors.bg}`}>
                            <span className={`text-sm font-medium ${scoreColors.text}`}>
                              {getMatchLabel(application.match_score)} • {application.match_score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Left Column (5/12) - Candidate Info */}
                      <div className="md:col-span-5 space-y-4">
                        {/* University Info */}
                        {application.student_profile && (
                          <div className="grid grid-cols-1 gap-2 bg-muted/20 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-1">Education</h4>
                            {application.student_profile.university && (
                              <div className="flex items-start gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <span className="font-medium">{application.student_profile.university}</span>
                                  {application.student_profile.course && (
                                    <p className="text-muted-foreground">{application.student_profile.course}</p>
                                  )}
                                  {application.student_profile.year_level && (
                                    <p className="text-xs text-muted-foreground">Year {application.student_profile.year_level}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            {(!application.student_profile.university && !application.student_profile.course) && (
                              <p className="text-sm text-muted-foreground">No education details provided</p>
                            )}
                          </div>
                        )}
                        
                        {/* Contact Info */}
                        <div className="grid grid-cols-1 gap-2 bg-muted/20 p-3 rounded-lg">
                          <h4 className="text-sm font-medium mb-1">Contact</h4>
                          <div className="flex items-center gap-2">
                            <AtSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{application.student?.email || "No email provided"}</span>
                          </div>
                          {application.student_profile?.phone_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{application.student_profile.phone_number}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Match Score */}
                        {application.match_score !== undefined && (
                          <div className="bg-muted/20 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Match Score</h4>
                            <div className="flex justify-between items-center mb-2">
                              <Progress 
                                value={application.match_score} 
                                className={cn(
                                  "h-2 flex-1 mr-2",
                                  scoreColors.progress
                                )}
                              />
                              <span className={cn(
                                "font-bold",
                                scoreColors.text
                              )}>
                                {application.match_score}%
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {getMatchLabel(application.match_score)}
                            </span>
                          </div>
                        )}
                        
                        {/* CV Skills - Display when CV is available */}
                        {application.cv?.id && cvSkills.length > 0 && (
                          <div className="bg-muted/20 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Candidate Skills</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {cvSkills.slice(0, 10).map((skill, i) => (
                                <span
                                  key={i}
                                  className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {cvSkills.length > 10 && (
                                <span className="text-xs text-muted-foreground">
                                  +{cvSkills.length - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* CV Button */}
                        {application.cv?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to profile page - using the proper route
                              if (application.student?.id) {
                                // Navigate to the profile page instead (assuming this is where student profiles are shown)
                                router.push(`/profile?student_id=${application.student.id}`);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Cannot access student profile. Student ID not found.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-full"
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Student Profile
                          </Button>
                        )}
                </div>
                
                      {/* Right Column (7/12) - Application Info */}
                      <div className="md:col-span-7 space-y-4">
                        {/* Application Dates */}
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-muted/20 p-3 rounded-lg">
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
                    
                        {/* Status Info */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Application Status</h4>
                          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-3">
                        {application.status === 'shortlisted' ? (
                              <CheckCircle className="h-5 w-5 mt-0.5 text-gray-800" />
                        ) : application.status === 'rejected' ? (
                              <AlertCircle className="h-5 w-5 mt-0.5 text-gray-700" />
                        ) : application.status === 'reviewed' ? (
                              <Clock className="h-5 w-5 mt-0.5 text-gray-600" />
                        ) : (
                              <AlertCircle className="h-5 w-5 mt-0.5 text-gray-500" />
                        )}
                        <span className="text-sm">{getNextStepMessage(application.status)}</span>
                      </div>
                    </div>
                    
                        {/* Cover Letter */}
                        {application.cover_letter && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Cover Letter</h4>
                            <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg whitespace-pre-line">
                              {application.cover_letter.split('\n').map((paragraph: string, i: number) => (
                                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                            onClick={() => {
                              toast({
                                title: "Application Details",
                                description: "This feature is coming soon!",
                              });
                            }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                            onClick={() => {
                              toast({
                                title: "Review Application",
                                description: "This feature is coming soon!",
                              });
                            }}
                      >
                        Review
                      </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 