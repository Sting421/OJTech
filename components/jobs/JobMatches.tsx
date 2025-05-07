"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, BriefcaseIcon, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface JobMatch {
  id: string;
  job_id: string;
  student_id: string;
  match_score: number;
  status: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    required_skills: string[];
  };
}

interface JobMatchesProps {
  userId: string;
  initialMatches?: JobMatch[];
}

export function JobMatches({ userId, initialMatches }: JobMatchesProps) {
  const [matches, setMatches] = useState<JobMatch[]>(initialMatches || []);
  const [loading, setLoading] = useState(!initialMatches);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a loading timeout to prevent infinite loading
  useEffect(() => {
    if (loading && !refreshing) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setError("Loading job matches timed out. The service might be experiencing high demand.");
        toast({
          title: "Timeout",
          description: "Loading job matches is taking too long. Please try again later.",
          variant: "destructive",
        });
      }, 15000); // 15 second timeout
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loading, toast, refreshing]);

  // Load job matches
  const loadJobMatches = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Add a controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/job-matches?userId=${userId}`, {
        signal: controller.signal,
        headers: {
          "Cache-Control": forceRefresh ? "no-cache" : "default"
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error" }));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load job matches");
      }

      setMatches(data.data || []);
      
      if (forceRefresh) {
        toast({
          title: "Matches updated",
          description: `Found ${data.data?.length || 0} job matches.`,
        });
      }
    } catch (error) {
      console.error("Error loading job matches:", error);
      
      // Handle specific error types
      let errorMessage = "Failed to load job matches";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. The service might be experiencing high demand.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      if (!forceRefresh) {
        toast({
          title: "Error loading matches",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load matches on initial render if not provided
  useEffect(() => {
    if (!initialMatches && !loading && !error) {
      loadJobMatches();
    }
  }, [initialMatches]);

  // Handle refresh button click
  const handleRefresh = () => {
    loadJobMatches(true);
  };
  
  // Get match score color based on the score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };
  
  // Get match badge color based on the score
  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-600 border-green-200";
    if (score >= 60) return "bg-blue-50 text-blue-600 border-blue-200";
    if (score >= 40) return "bg-amber-50 text-amber-600 border-amber-200";
    return "bg-red-50 text-red-600 border-red-200";
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Job Matches</CardTitle>
          <CardDescription>
            AI-powered job matches based on your resume
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your job matches...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Job Matches</CardTitle>
          <CardDescription>
            There was an error loading your job matches
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => loadJobMatches(true)} disabled={loading || refreshing}>
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Trying Again...</span>
              </>
            ) : (
              <span>Try Again</span>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Job Matches</CardTitle>
          <CardDescription>
            No job matches found for your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We couldn't find any job matches for your profile. This could be because:
          </p>
          <ul className="list-disc pl-5 mb-4 text-muted-foreground space-y-1">
            <li>You haven't uploaded a resume yet</li>
            <li>Your resume doesn't contain enough information</li>
            <li>There are no active jobs matching your skills</li>
          </ul>
          <p className="text-muted-foreground mb-4">
            Try uploading a detailed resume or checking back later for new opportunities.
          </p>
          <Button 
            onClick={() => loadJobMatches(true)} 
            disabled={refreshing}
            className="mt-2"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Checking...</span>
              </>
            ) : (
              <span>Check Again</span>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Job Matches</CardTitle>
          <CardDescription className="mt-1">
            Found {matches.length} job matches based on your profile
          </CardDescription>
        </div>
        <Button
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>Refresh</span>
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {matches.sort((a, b) => b.match_score - a.match_score).map((match) => (
          <div key={match.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{match.job.title}</h3>
              <Badge variant="outline" className={getScoreBadge(match.match_score)}>
                {match.match_score}% Match
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground mb-2">
              {match.job.company} • {match.job.location}
            </div>
            
            <p className="text-sm mb-3 line-clamp-2">
              {match.job.description}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {match.job.required_skills && match.job.required_skills.slice(0, 5).map((skill, index) => (
                <Badge variant="secondary" key={index} className="text-xs">
                  {skill}
                </Badge>
              ))}
              {match.job.required_skills && match.job.required_skills.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{match.job.required_skills.length - 5} more
                </Badge>
              )}
            </div>
            
            <div className="flex justify-end">
              <Link href={`/opportunities/${match.job_id}`} className="hover:no-underline">
                <Button variant="outline" size="sm">View Job</Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-between">
        <p className="text-sm text-muted-foreground">
          Job matches are based on your resume skills and experience
        </p>
        <Link href="/opportunities" className="hover:no-underline">
          <Button variant="link" size="sm">
            Browse All Jobs
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 