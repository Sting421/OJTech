"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import TinderCard from "react-tinder-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Briefcase,
  MapPin,
  Calendar,
  Undo2,
  DollarSign,
  Info,
  HelpCircle,
  ChevronRight,
  XIcon,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMatchedJobsForCurrentUser,
  applyForJob,
  declineJob,
} from "@/lib/actions/opportunities";
import { Job } from "@/lib/types/database";
import { JobStatus } from "@/lib/types/employer";
import { CompanyLogo } from "@/components/ui/company-logo";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import JobCard from "@/app/components/jobs/JobCard";

// Define the extended Job type with match score and company logo
interface JobWithMatchScore extends Job {
  match_score?: number | null;
  company_logo_url?: string | null;
  is_active?: boolean;
}

export default function OpportunitiesPage() {
  const [jobs, setJobs] = useState<JobWithMatchScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);

  // Keep track of removed jobs for undo functionality
  const [lastRemovedJob, setLastRemovedJob] = useState<{
    job: Job;
    direction: "left" | "right";
  } | null>(null);

  // Refs for controlling cards programmatically
  const childRefs = useMemo(
    () =>
      Array(jobs.length)
        .fill(0)
        .map(() => React.createRef<any>()),
    [jobs.length]
  );

  // Check if CV is currently being processed
  useEffect(() => {
    async function checkCVProcessingStatus() {
      try {
        // Get current user
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          return;
        }

        const userId = session.user.id;

        // Check if user has any CV records
        const { data: cvs, error: cvError } = await supabase
          .from("cvs")
          .select("id, skills")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (cvError) {
          console.error("Error checking CV status:", cvError);
          return;
        }

        // If no CVs, we're not processing anything
        if (!cvs || cvs.length === 0) {
          setIsProcessingCV(false);
          return;
        }

        const cv = cvs[0];

        // If skills is null, CV is still being processed
        setIsProcessingCV(cv.skills === null);

        // Check again after a short delay if still processing
        if (cv.skills === null) {
          setTimeout(checkCVProcessingStatus, 10000); // Check again in 10 seconds
        }
      } catch (error) {
        console.error("Error checking CV processing status:", error);
      }
    }

    checkCVProcessingStatus();
  }, []);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setError(null);
      try {
        const result = await getMatchedJobsForCurrentUser();
        if (result.success && result.data) {
          // Ensure data conforms to JobWithMatchScore and handle potentially missing fields
          const formattedJobs = result.data.map(
            (job: any): JobWithMatchScore => ({
              id: job.id as string,
              employer_id: job.employer_id as string,
              title: job.title as string,
              description:
                (job.description as string | null) ??
                "No description provided.",
              company_name:
                (job.company_name as string | null) ?? "Unknown Company",
              company_logo_url: job.company_logo_url as string | null,
              location: (job.location as string | null) ?? "Not specified",
              job_type: (job.job_type as string | null) ?? "Not specified",
              salary_range: (job.salary_range as string | null) ?? null,
              required_skills: Array.isArray(job.required_skills)
                ? job.required_skills.filter((s: any) => typeof s === "string")
                : [],
              preferred_skills: job.preferred_skills as Record<
                string,
                any
              > | null,
              application_deadline: job.application_deadline as string | null,
              created_at: job.created_at as string,
              updated_at: job.updated_at as string | null,
              status: (job.status as JobStatus) ?? "open",
              is_active: (job.is_active as boolean) ?? true,
              match_score:
                typeof job.match_score === "number" ? job.match_score : null,
            })
          );
          setJobs(formattedJobs);
          setCurrentIndex(formattedJobs.length - 1); // Start from the last job in the array for stack effect
        } else {
          setError(result.error || "Failed to load job opportunities.");
          toast({
            title: "Error Loading Jobs",
            description: result.error || "Could not fetch job opportunities.",
            variant: "default",
          });
        }
      } catch (err) {
        console.error("Fetch jobs error:", err);
        setError("An unexpected error occurred while fetching jobs.");
        toast({
          title: "Unexpected Error",
          description:
            "Could not fetch job opportunities due to an unexpected error.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [toast]);

  const handleSwipe = async (direction: string, job: Job) => {
    try {
      if (direction === "right") {
        // Handle apply
        const result = await applyForJob(job.id);
        if (result.success) {
          toast({
            title: "Application Submitted",
            description: `You've applied for ${job.title}`,
          });
        } else {
          toast({
            title: "Application Failed",
            description: result.error || "Failed to submit application",
            variant: "default",
          });
          return; // Don't remove the job card if application failed
        }
      } else if (direction === "left") {
        // Handle decline
        const result = await declineJob(job.id);
        if (result.success) {
          toast({
            title: "Job Declined",
            description: `You've passed on ${job.title}`,
          });
        } else {
          toast({
            title: "Action Failed",
            description: result.error || "Failed to decline job",
            variant: "default",
          });
          return; // Don't remove the job card if decline failed
        }
      }

      // Store the removed job for potential undo
      setLastRemovedJob({
        job: job as Job,
        direction: direction as "left" | "right",
      });

      // Update jobs state
      setJobs((prevJobs) => prevJobs.filter((j) => j.id !== job.id));
      setCurrentIndex((prevIndex) => prevIndex - 1);
    } catch (error) {
      console.error("Error handling swipe:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "default",
      });
    }
  };

  const outOfFrame = (jobTitle: string, index: number) => {
    console.log(`${jobTitle} left the screen at index ${index}`);
    // Consider removing the job from the state here if performance is an issue
    // const newJobs = jobs.filter((_, i) => i !== index)
    // setJobs(newJobs)
  };

  const swipe = async (dir: "left" | "right") => {
    if (currentIndex < 0 || currentIndex >= jobs.length) return; // No more cards
    if (!childRefs[currentIndex]?.current) {
      console.warn("Card ref not available for swiping");
      return;
    }
    await childRefs[currentIndex].current.swipe(dir); // Swipe the current card
  };

  const undoSwipe = () => {
    if (!lastRemovedJob) return;

    // Re-add the job to the state and update the index
    const { job } = lastRemovedJob;
    setJobs((prevJobs) => {
      const newJobs = [...prevJobs];
      // Find the correct insertion index based on original sorting (match_score)
      // For simplicity, we'll just add it back to the top of the swipe stack
      // A more robust undo might require storing original index or re-fetching
      newJobs.splice(currentIndex + 1, 0, job);
      return newJobs;
    });
    setCurrentIndex((prevIndex) => prevIndex + 1);

    // TODO: Optionally revert the database action (apply/decline)
    // This would require more complex state management or additional server actions
    console.log(
      "Undo action for job:",
      job.id,
      "Direction:",
      lastRemovedJob.direction
    );
    toast({
      title: "Undo Swipe",
      description: `Brought back ${job.title}. You can now re-decide.`,
    });

    setLastRemovedJob(null); // Clear the last removed job
  };

  // Helper function to get match score color - replaced with monochrome shades
  const getScoreColor = (score: number | null): string => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-gray-800 dark:text-gray-200";
    if (score >= 60) return "text-gray-700 dark:text-gray-300";
    if (score >= 40) return "text-gray-600 dark:text-gray-400";
    return "text-gray-500 dark:text-gray-500";
  };

  // Helper function to get human-readable match score label
  const getScoreLabel = (score: number | null): string => {
    if (score === null) return "No match data";
    if (score >= 80) return "Strong Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Potential Match";
    return "Low Match";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-gray-700 dark:text-gray-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Error Loading Jobs
        </h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-8 md:pt-12 overflow-hidden">
      {/* Header Section */}
      <header className="w-full max-w-3xl mx-auto px-4 text-center mb-6 md:mb-8">
        <h1 className="text-3xl lg:text-4xl font-semibold mb-2 text-gray-900 dark:text-gray-50">
          Job Opportunities
        </h1>
        <p className="text-muted-foreground text-lg mb-4">
          Drag card to the right to apply, left to pass.
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5 hover:underline mx-auto transition-colors">
                <HelpCircle className="h-4 w-4" />
                <span>How matching works</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4">
              <h4 className="font-bold mb-2">How Job Matching Works</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Our AI-powered system matches your skills and experience with
                job requirements.
              </p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li>
                  <span className="text-gray-800 dark:text-gray-200 font-bold">
                    80%+
                  </span>
                  : Strong match
                </li>
                <li>
                  <span className="text-gray-700 dark:text-gray-300 font-bold">
                    60-79%
                  </span>
                  : Good match
                </li>
                <li>
                  <span className="text-gray-600 dark:text-gray-400 font-bold">
                    40-59%
                  </span>
                  : Potential match
                </li>
                <li>
                  <span className="text-gray-500 dark:text-gray-500 font-bold">
                    &lt;40%
                  </span>
                  : Limited match
                </li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {/* Main Content Area (CV Alert + Cards) */}
      <main className="w-full flex-grow flex flex-col items-center justify-start px-4 mb-32">
        {/* CV Processing Alert */}
        {isProcessingCV && (
          <div className="w-full max-w-md mx-auto mb-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center gap-3 text-gray-700 dark:text-gray-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <div className="flex-grow">
              <p className="text-sm">
                Your resume is still being processed. Job matches will update
                when complete.
              </p>
            </div>
          </div>
        )}

        {/* Card Container */}
        <div className="card-container mb-8">
          {jobs.length > 0 ? (
            <div className="relative h-full w-full">
              {jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isActive={index === currentIndex}
                  onSwipe={handleSwipe}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    display:
                      index === currentIndex ||
                      index === currentIndex - 1 ||
                      index === currentIndex + 1
                        ? "block"
                        : "none", // Show 3 cards for smoother visual stacking
                    zIndex: jobs.length - index,
                    transform:
                      index === currentIndex
                        ? "scale(1)"
                        : index === currentIndex - 1
                        ? "scale(0.95) translateY(20px)"
                        : index === currentIndex + 1
                        ? "scale(0.95) translateY(20px)"
                        : "scale(0.9)",
                    opacity:
                      index === currentIndex
                        ? 1
                        : index === currentIndex - 1
                        ? 0.7
                        : index === currentIndex + 1
                        ? 0.7
                        : 0.3,
                    transition:
                      "transform 0.3s ease-out, opacity 0.3s ease-out",
                  }}
                  className={cn(
                    "swipe-card",
                    index === currentIndex && "active-card"
                  )}
                />
              ))}

              {/* Undo button */}
              {lastRemovedJob && (
                <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 z-20">
                  <button
                    onClick={undoSwipe}
                    className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 
                    rounded-full shadow-md text-sm font-medium flex items-center gap-2
                    hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-gray-100 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
              <Briefcase className="h-12 w-12 mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-2">
                No more jobs to show
              </p>
              <p className="text-sm max-w-xs mx-auto">
                Check back later for new opportunities that match your skills!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Update the CSS styles
const styles = `
.swipe-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 1rem; /* Keep this for the TinderCard, JobCard itself has rounded-2xl */
  background-color: transparent;
  will-change: transform;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  touch-action: manipulation;
  -webkit-user-drag: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px; /* Add some padding around the card if needed for shadow visibility */
}

.active-card {
  /* The primary scaling/transform for the active card (when not being dragged) is now on JobCard */
  /* This class can be used for other non-transform active-state styles if needed */
  transform: scale(1); /* Ensure it starts at normal scale */
}

.active-card:hover {
  /* Hover effects (translate, shadow) are now handled by the JobCard component itself when isActive is true. */
  /* No transform needed here; avoids conflict. */
}

.active-card:active {
  /* This is for when the card is actively being dragged/pressed */
  transform: scale(0.97);
  transition: transform 0.1s ease;
}

@keyframes swipeRight {
  from { transform: translateX(0) rotate(0); opacity: 1; }
  to { transform: translateX(100%) rotate(6deg); opacity: 0; }
}

@keyframes swipeLeft {
  from { transform: translateX(0) rotate(0); opacity: 1; }
  to { transform: translateX(-110%) rotate(-6deg); opacity: 0; }
}

.swiping-right {
  animation: swipeRight 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.swiping-left {
  animation: swipeLeft 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.opportunities-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

.card-container {
  position: relative;
  width: 100%;
  max-width: 480px; /* Increased max-width for bigger card */
  height: 580px; /* Match JobCard height */
  margin: 0 auto;
  overflow: hidden;
}
`;

if (typeof window !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
