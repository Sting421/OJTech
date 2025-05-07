"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Check } from "lucide-react";

interface JobMatchingButtonProps {
  cvId: string;
}

export function JobMatchingButton({ cvId }: JobMatchingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const { toast } = useToast();

  const handleMatchJobs = async () => {
    try {
      setLoading(true);
      setUpToDate(false);
      
      // Add force refresh header if user is explicitly requesting an update
      const forceRefresh = loading === false;
      
      const response = await fetch("/api/job-matching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(forceRefresh ? { "x-force-refresh": "true" } : {})
        },
        body: JSON.stringify({ cvId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to match jobs");
      }

      if (data.success) {
        // Check if matching was skipped because CV is up-to-date
        if (data.data?.upToDate) {
          setUpToDate(true);
          toast({
            title: "Already up-to-date",
            description: "Your job matches are already up-to-date with your current resume.",
          });
          return;
        }
        
        const totalMatches = 
          (data.data?.matchesCreated || 0) + 
          (data.data?.matchesUpdated || 0);
          
        toast({
          title: "Job matching complete",
          description: `Found ${totalMatches} potential job matches.`,
        });
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error matching jobs:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to match jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleMatchJobs} 
      disabled={loading}
      variant={upToDate ? "outline" : "default"}
      className="flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding Matches...</span>
        </>
      ) : upToDate ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span>Matches Up-to-date</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Find Job Matches</span>
        </>
      )}
    </Button>
  );
} 