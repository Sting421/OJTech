"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import TinderCard from 'react-tinder-card'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, Briefcase, MapPin, Calendar, Undo2, DollarSign, Info, HelpCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getMatchedJobsForCurrentUser, applyForJob, declineJob } from "@/lib/actions/opportunities"
import { Job } from "@/lib/types/database"
import { CompanyLogo } from "@/components/ui/company-logo"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Define the extended Job type with match score
interface JobWithMatchScore {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  required_skills: string[] | null;
  preferred_skills?: Record<string, any> | null;
  application_deadline?: string | null;
  created_at: string;
  updated_at?: string | null;
  status?: string;
  company_name: string | null;
  company_logo_url?: string | null;
  match_score: number | null;
  is_active?: boolean;
}

export default function OpportunitiesPage() {
  const [jobs, setJobs] = useState<JobWithMatchScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const { toast } = useToast()

  // Keep track of removed jobs for undo functionality
  const [lastRemovedJob, setLastRemovedJob] = useState<{ job: JobWithMatchScore, direction: 'left' | 'right' } | null>(null)

  // Refs for controlling cards programmatically
  const childRefs = useMemo(() => Array(jobs.length).fill(0).map(() => React.createRef<any>()), [jobs.length])

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true)
      setError(null)
      try {
        const result = await getMatchedJobsForCurrentUser()
        if (result.success && result.data) {
          // Ensure data conforms to JobWithMatchScore and handle potentially missing fields
          const formattedJobs = result.data.map((job: any): JobWithMatchScore => ({
            id: job.id as string,
            employer_id: job.employer_id as string,
            title: job.title as string,
            description: (job.description as string | null) ?? 'No description provided.',
            company_name: (job.company_name as string | null) ?? 'Unknown Company',
            company_logo_url: job.company_logo_url as string | null,
            location: (job.location as string | null) ?? 'Not specified',
            job_type: (job.job_type as string | null) ?? 'Not specified',
            salary_range: (job.salary_range as string | null) ?? null,
            required_skills: Array.isArray(job.required_skills)
              ? job.required_skills.filter((s: any) => typeof s === 'string')
              : null,
            preferred_skills: job.preferred_skills as Record<string, any> | null,
            application_deadline: job.application_deadline as string | null,
            created_at: job.created_at as string,
            updated_at: job.updated_at as string | null,
            status: job.status as string,
            is_active: (job.is_active as boolean) ?? true,
            match_score: typeof job.match_score === 'number' ? job.match_score : null,
          }));
          setJobs(formattedJobs)
          setCurrentIndex(formattedJobs.length - 1) // Start from the last job in the array for stack effect
        } else {
          setError(result.error || "Failed to load job opportunities.")
          toast({
            title: "Error Loading Jobs",
            description: result.error || "Could not fetch job opportunities.",
            variant: "destructive",
          })
        }
      } catch (err) {
        console.error("Fetch jobs error:", err)
        setError("An unexpected error occurred while fetching jobs.")
        toast({
          title: "Unexpected Error",
          description: "Could not fetch job opportunities due to an unexpected error.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [toast])

  const swiped = (direction: string, job: JobWithMatchScore, index: number) => {
    // Ensure direction is only left or right before processing
    if (direction !== 'left' && direction !== 'right') return
    
    console.log(`Swiped ${direction} on ${job.title}`)
    setCurrentIndex(index - 1)
    setLastRemovedJob({ job, direction }) // Store last removed job for undo

    // Call server action based on direction
    if (direction === 'right') {
      applyForJob(job.id).then(result => {
        if (result.success) {
          toast({ 
            title: `Applying for ${job.title}...`, 
            description: result.data?.letterGenerated 
              ? "Generated recommendation and submitted application."
              : "Application submitted (recommendation generation failed)." 
          });
        } else {
          toast({ title: "Application Failed", description: result.error, variant: "destructive" });
          // Optionally, implement undo or retry logic here
        }
      });
    } else {
      declineJob(job.id).then(result => {
        if (result.success) {
          toast({ title: `Declined ${job.title}`, description: "We won't show you this job again." })
        } else {
          toast({ title: "Decline Failed", description: result.error, variant: "destructive" })
          // Optionally, implement undo or retry logic here
        }
      })
    }
  }

  const outOfFrame = (jobTitle: string, index: number) => {
    console.log(`${jobTitle} left the screen at index ${index}`)
    // Consider removing the job from the state here if performance is an issue
    // const newJobs = jobs.filter((_, i) => i !== index)
    // setJobs(newJobs)
  }

  const swipe = async (dir: 'left' | 'right') => {
    if (currentIndex < 0 || currentIndex >= jobs.length) return // No more cards
    if (!childRefs[currentIndex]?.current) {
      console.warn("Card ref not available for swiping")
      return
    }
    await childRefs[currentIndex].current.swipe(dir) // Swipe the current card
  }

  const undoSwipe = () => {
    if (!lastRemovedJob) return
    
    // Re-add the job to the state and update the index
    const { job } = lastRemovedJob
    setJobs(prevJobs => {
      const newJobs = [...prevJobs]
      // Find the correct insertion index based on original sorting (match_score)
      // For simplicity, we'll just add it back to the top of the swipe stack
      // A more robust undo might require storing original index or re-fetching
      newJobs.splice(currentIndex + 1, 0, job)
      return newJobs
    })
    setCurrentIndex(prevIndex => prevIndex + 1)

    // TODO: Optionally revert the database action (apply/decline)
    // This would require more complex state management or additional server actions
    console.log('Undo action for job:', job.id, 'Direction:', lastRemovedJob.direction)
    toast({ title: "Undo Swipe", description: `Brought back ${job.title}. You can now re-decide.` })
    
    setLastRemovedJob(null) // Clear the last removed job
  }

  // Helper function to get match score color
  const getScoreColor = (score: number | null): string => {
    if (score === null) return "text-gray-400"
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-blue-500"
    if (score >= 40) return "text-yellow-500"
    return "text-red-500"
  }
  
  // Helper function to get human-readable match score label
  const getScoreLabel = (score: number | null): string => {
    if (score === null) return "No match data"
    if (score >= 80) return "Strong Match"
    if (score >= 60) return "Good Match"
    if (score >= 40) return "Potential Match"
    return "Low Match"
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-semibold text-destructive mb-4">Error Loading Jobs</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen container mx-auto py-8 flex flex-col items-center relative overflow-hidden">
      <h1 className="text-4xl font-bold mb-6 text-center">Job Opportunities</h1>
      <p className="text-muted-foreground mb-2 text-center">Swipe right to apply, left to pass.</p>
      
      {/* How matching works tooltip */}
      <div className="mb-8">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-sm text-primary flex items-center gap-1 hover:underline">
                <HelpCircle size={14} />
                <span>How matching works</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4">
              <h4 className="font-bold mb-2">How Job Matching Works</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Our AI-powered system matches your skills and experience with job requirements.
              </p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li><span className="text-green-500 font-bold">80%+</span>: Strong match to your skills</li>
                <li><span className="text-blue-500 font-bold">60-79%</span>: Good match with some skill alignment</li>
                <li><span className="text-yellow-500 font-bold">40-59%</span>: Potential match worth exploring</li>
                <li><span className="text-red-500 font-bold">&lt;40%</span>: Limited match but still might be interesting</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="w-full max-w-xl h-[70vh] relative flex items-center justify-center">
        {jobs.length > 0 ? (
          jobs.map((job, index) => (
            <TinderCard
              ref={childRefs[index]}
              className={`absolute swipe-card ${index === currentIndex ? 'cursor-grab active-card' : 'cursor-default'}`}
              key={job.id}
              onSwipe={(dir) => swiped(dir, job, index)}
              onCardLeftScreen={() => outOfFrame(job.title, index)}
              preventSwipe={['up', 'down']} // Prevent vertical swipes
              swipeRequirementType="position"
              swipeThreshold={80}
              flickOnSwipe={true}
            >
              {/* Bento Card for Job */}
              <div className="w-full h-full overflow-hidden">
                {/* Swipe indicators - only visible on hover */}
                <div className="absolute inset-0 pointer-events-none z-10 flex">
                  <div className="flex-1 apply-overlay flex items-center justify-center opacity-0 transition-opacity">
                    <div className="bg-green-500/90 rounded-full p-3">
                      <Check className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 decline-overlay flex items-center justify-center opacity-0 transition-opacity">
                    <div className="bg-red-500/90 rounded-full p-3">
                      <X className="h-12 w-12 text-white" />
                    </div>
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "group relative h-full flex flex-col transition-all duration-300",
                    "border border-gray-100/80 dark:border-white/10 bg-white dark:bg-black rounded-xl",
                    "hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]",
                    "will-change-transform touch-manipulation",
                    "overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
                  )}
                >
                  {/* Background pattern and gradient effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:6px_6px]" />
                  </div>
                  
                  {/* Header area with company and match score */}
                  <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-gray-100/80 dark:border-white/10">
                    <div className="flex items-start gap-4">
                      {/* Company Logo */}
                      <CompanyLogo 
                        logoUrl={job.company_logo_url}
                        companyName={job.company_name || 'Company'}
                        size="md"
                        className="shadow-md"
                      />
                      
                      {/* Job Title & Company */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl text-primary tracking-tight mb-1">{job.title}</h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 font-medium">
                          {job.company_name ?? 'Unknown Company'}
                        </p>
                      </div>
                      
                      {/* Match Score */}
                      {job.match_score !== null && (
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "text-base font-bold px-3 py-1.5 rounded-lg",
                              "bg-black/5 dark:bg-white/10 backdrop-blur-sm",
                              getScoreColor(job.match_score)
                            )}
                          >
                            {job.match_score}%
                          </span>
                          <span className="text-xs mt-1 text-gray-500 dark:text-gray-400 font-medium">
                            {getScoreLabel(job.match_score)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Job details */}
                  <div className="relative flex-grow p-5 space-y-4">
                    {/* Job Details Pills */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 flex-shrink-0">
                          <MapPin className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {job.location || 'Remote'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 flex-shrink-0">
                          <Briefcase className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {job.job_type || 'Full-time'}
                        </span>
                      </div>
                      
                      {job.salary_range && (
                        <div className="flex items-center space-x-2 col-span-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 flex-shrink-0">
                            <DollarSign className="w-5 h-5 text-purple-500" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {job.salary_range}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Description */}
                    <div className="mt-4">
                      <h4 className="font-medium text-[15px] text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                        Description
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                        {job.description?.split('\n').map((paragraph, i) => (
                          paragraph.trim() ? 
                            <p key={i} className="whitespace-pre-line">{paragraph}</p> : 
                            <div key={i} className="h-2"></div>
                        )) || 'No description provided.'}
                      </div>
                    </div>
                    
                    {/* Skills Tags */}
                    {job.required_skills && Array.isArray(job.required_skills) && job.required_skills.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-[15px] text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                          Required Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {job.required_skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 text-xs rounded-md bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Hint */}
                    <div className="flex justify-end mt-6">
                      <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:underline">
                        Swipe right to apply →
                      </span>
                    </div>
                  </div>
                  
                  {/* Border gradient effect */}
                  <div className="absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br from-transparent via-primary/10 to-transparent dark:via-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            </TinderCard>
          ))
        ) : (
          !loading && (
            <div className="text-center text-muted-foreground bg-muted/20 p-8 rounded-lg border">
              <h2 className="text-xl font-semibold mb-3">No More Jobs</h2>
              <p>You've seen all available opportunities for now. Check back later!</p>
            </div>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-center gap-8 z-10">
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full p-4 h-20 w-20 border-2 border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:border-red-600 disabled:opacity-50"
          onClick={() => swipe('left')}
          disabled={currentIndex < 0}
        >
          <X size={36} />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full p-2 h-12 w-12 border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-600 disabled:opacity-50"
          onClick={undoSwipe}
          disabled={!lastRemovedJob}
        >
          <Undo2 size={20} />
        </Button>

        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full p-4 h-20 w-20 border-2 border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600 hover:border-green-600 disabled:opacity-50"
          onClick={() => swipe('right')}
          disabled={currentIndex < 0}
        >
          <Check size={36} />
        </Button>
      </div>
    </main>
  )
}

// Add some basic CSS for the card stack effect (optional, can be done via Tailwind)
const styles = `
.swipe-card {
  width: 95%;
  max-width: 560px; /* Made wider */
  height: 70vh;
  max-height: 700px; /* Made taller */
  position: absolute;
  border-radius: 1rem; /* Add rounded corners */
  background-color: transparent; /* Changed to transparent for bento card */
  will-change: transform;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  touch-action: manipulation;
  -webkit-user-drag: none;
  user-select: none;
}

.swipe-card:hover {
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08);
}

/* Active card animations and hover effects */
.active-card {
  transform: scale(1.02);
}

.active-card:hover .apply-overlay {
  opacity: 0;
}

.active-card:hover .decline-overlay {
  opacity: 0;
}

.active-card:hover {
  transform: scale(1.04);
}

/* Maintain hover state during drag */
.active-card:active {
  transform: scale(1.04);
  transition: none;
}

/* Hover effects for directional movement */
.active-card.moving-right .apply-overlay,
.active-card:active.moving-right .apply-overlay {
  opacity: 0.8 !important;
}

.active-card.moving-left .decline-overlay,
.active-card:active.moving-left .decline-overlay {
  opacity: 0.8 !important;
}

/* Card swipe animation classes */
@keyframes swipeRight {
  from { transform: translateX(0) rotate(0); opacity: 1; }
  to { transform: translateX(1000px) rotate(30deg); opacity: 0; }
}

@keyframes swipeLeft {
  from { transform: translateX(0) rotate(0); opacity: 1; }
  to { transform: translateX(-1000px) rotate(-30deg); opacity: 0; }
}

.swiping-right {
  animation: swipeRight 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}

.swiping-left {
  animation: swipeLeft 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}
`

if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style")
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
  
  // Add event listeners to handle dragging direction classes
  setTimeout(() => {
    const cards = document.querySelectorAll('.swipe-card')
    cards.forEach(card => {
      let startX = 0
      
      card.addEventListener('mousedown', function(e) {
        startX = (e as MouseEvent).clientX
        card.classList.remove('moving-left', 'moving-right')
      })
      
      card.addEventListener('touchstart', function(e) {
        startX = (e as TouchEvent).touches[0].clientX
        card.classList.remove('moving-left', 'moving-right')
      })
      
      card.addEventListener('mousemove', function(e) {
        if ((e as MouseEvent).buttons === 1) { // Left mouse button is pressed
          const diffX = (e as MouseEvent).clientX - startX
          updateCardDirection(diffX)
        }
      })
      
      card.addEventListener('touchmove', function(e) {
        const diffX = (e as TouchEvent).touches[0].clientX - startX
        updateCardDirection(diffX)
      })
      
      card.addEventListener('mouseup', function() {
        card.classList.remove('moving-left', 'moving-right')
      })
      
      card.addEventListener('touchend', function() {
        card.classList.remove('moving-left', 'moving-right')
      })
      
      function updateCardDirection(diffX: number) {
        card.classList.remove('moving-left', 'moving-right')
        if (diffX > 20) {
          card.classList.add('moving-right')
        } else if (diffX < -20) {
          card.classList.add('moving-left')
        }
      }
    })
  }, 1000) // Small delay to ensure cards are loaded
}
