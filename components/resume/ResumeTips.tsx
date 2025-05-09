"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { getCurrentUserResumeAnalysis } from "@/lib/actions/resume-analyzer";

type ResumeAnalysisData = {
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  last_analyzed_at?: string;
};

interface ResumeTipsProps {
  initialData?: ResumeAnalysisData;
  autoLoad?: boolean;
}

export function ResumeTips({ initialData, autoLoad = true }: ResumeTipsProps) {
  const [analysis, setAnalysis] = useState<ResumeAnalysisData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [upToDate, setUpToDate] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add a loading timeout to prevent infinite loading - using 20 seconds to match the API timeout
  useEffect(() => {
    if (loading && !refreshing) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setLoadingError("Analysis timed out. The AI service might be experiencing high demand.");
        toast({
          title: "Analysis timeout",
          description: "Resume analysis is taking too long. Please try again later.",
          variant: "destructive",
        });
      }, 20000); // 20 second timeout to match the API timeout
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loading, toast, refreshing]);

  // Load analysis if not provided initially
  const loadAnalysis = async (forceRefresh = false) => {
    try {
      setUpToDate(false); // Reset up-to-date state
      setHasAttemptedLoad(true);
      
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadingError(null);

      const result = await getCurrentUserResumeAnalysis(forceRefresh);

      if (!result.success) {
        const errorMessage = result.error || "Failed to analyze resume";
        
        // If the analysis is up-to-date, this is not an error
        if (errorMessage.includes("CV analysis is up to date")) {
          console.log("CV analysis is up-to-date, no analysis needed");
          setUpToDate(true);
          
          // Try to get existing analysis without forcing refresh
          const existingResult = await getCurrentUserResumeAnalysis(false);
          if (existingResult.success && existingResult.data) {
            setAnalysis(existingResult.data);
          }
          
          if (forceRefresh) {
            toast({
              title: "Analysis is up-to-date",
              description: "Your resume hasn't changed since the last analysis.",
            });
          }
          
          return;
        }
        
        // Handle specific error types
        if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
          throw new Error("The analysis service timed out. Try again when there's less load on the system.");
        } else if (errorMessage.includes("API") || errorMessage.includes("Gemini")) {
          throw new Error("The AI service is temporarily unavailable. Please try again later.");
        } else if (errorMessage.includes("No CV")) {
          throw new Error("Please upload your resume first before requesting an analysis.");
        } else {
          throw new Error(errorMessage);
        }
      }

      setAnalysis(result.data);
      
      if (forceRefresh) {
        toast({
          title: "Analysis updated",
          description: "Your resume analysis has been refreshed",
        });
      }
    } catch (error) {
      console.error("Error loading resume analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not analyze your resume";
      setLoadingError(errorMessage);
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load analysis on initial render if not provided and autoLoad is true
  useEffect(() => {
    if (autoLoad && !initialData && !analysis && !loading && !loadingError && !upToDate && !hasAttemptedLoad) {
      loadAnalysis(false); // Don't force refresh on auto-load
    }
  }, [initialData, analysis, loading, loadingError, upToDate, autoLoad, hasAttemptedLoad]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    loadAnalysis(true);
  };

  // Handle initial load button click
  const handleInitialLoad = () => {
    loadAnalysis(false);
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            Looking for existing resume analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading analysis data...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (loadingError) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            There was an error loading your resume analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">{loadingError}</p>
          <Button onClick={() => loadAnalysis(false)} disabled={loading || refreshing}>
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

  if (upToDate && analysis) {
    // Show the existing analysis with a note that it's up-to-date
    return (
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Resume Analysis</CardTitle>
            <CardDescription className="mt-1">
              AI-powered insights to help improve your resume
              {analysis.last_analyzed_at && (
                <span className="block text-xs mt-1">
                  Last analyzed: {formatDate(analysis.last_analyzed_at)} (up-to-date)
                </span>
              )}
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
        
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            <p>
              <strong>Note:</strong> This analysis focuses on resume structure and content quality. Future dates may be targets for graduation or certification completion and are not flagged as errors.
            </p>
          </div>

          {/* Strengths Section */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div>
              <h3 className="text-lg font-medium flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Strengths</span>
              </h3>
              <div className="space-y-2">
                {analysis.strengths.map((strength, index) => (
                  <div key={`strength-${index}`} className="flex items-start">
                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 mr-2 mt-0.5">
                      +
                    </Badge>
                    <p>{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses Section */}
          {analysis.weaknesses && analysis.weaknesses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium flex items-center mb-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                <span>Weaknesses</span>
              </h3>
              <div className="space-y-2">
                {analysis.weaknesses.map((weakness, index) => (
                  <div key={`weakness-${index}`} className="flex items-start">
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 mr-2 mt-0.5">
                      !
                    </Badge>
                    <p>{weakness}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Section */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium flex items-center mb-3">
                <ArrowRight className="h-5 w-5 text-primary mr-2" />
                <span>Suggested Improvements</span>
              </h3>
              <div className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <div key={`suggestion-${index}`} className="flex items-start">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mr-2 mt-0.5">
                      {index + 1}
                    </Badge>
                    <p>{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!analysis && !hasAttemptedLoad) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            Get AI-powered suggestions to improve your resume
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Button onClick={handleInitialLoad} disabled={loading} className="mt-2">
            Analyze My Resume
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Analysis uses AI to provide personalized feedback on your resume
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            No resume found to analyze. Please upload your resume first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => loadAnalysis(false)} disabled={loading}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription className="mt-1">
            AI-powered insights to help improve your resume
            {analysis.last_analyzed_at && (
              <span className="block text-xs mt-1">
                Last analyzed: {formatDate(analysis.last_analyzed_at)}
              </span>
            )}
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
      
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
          <p>
            <strong>Note:</strong> This analysis focuses on resume structure and content quality. Future dates may be targets for graduation or certification completion and are not flagged as errors.
          </p>
        </div>

        {/* Strengths Section */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <h3 className="text-lg font-medium flex items-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span>Strengths</span>
            </h3>
            <div className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <div key={`strength-${index}`} className="flex items-start">
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 mr-2 mt-0.5">
                    +
                  </Badge>
                  <p>{strength}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses Section */}
        {analysis.weaknesses && analysis.weaknesses.length > 0 && (
          <div>
            <h3 className="text-lg font-medium flex items-center mb-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <span>Weaknesses</span>
            </h3>
            <div className="space-y-2">
              {analysis.weaknesses.map((weakness, index) => (
                <div key={`weakness-${index}`} className="flex items-start">
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 mr-2 mt-0.5">
                    !
                  </Badge>
                  <p>{weakness}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions Section */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <h3 className="text-lg font-medium flex items-center mb-3">
              <ArrowRight className="h-5 w-5 text-primary mr-2" />
              <span>Suggested Improvements</span>
            </h3>
            <div className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <div key={`suggestion-${index}`} className="flex items-start">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mr-2 mt-0.5">
                    {index + 1}
                  </Badge>
                  <p>{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 