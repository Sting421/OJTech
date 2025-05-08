import React, { useState } from 'react'
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/date-utils"
import { Progress } from "@/components/ui/progress"
import { Briefcase, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Building, ChevronDown, ChevronUp, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

// Get the next step message based on application status
const getNextStepMessage = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Your application is awaiting review by the employer';
    case 'reviewed':
      return 'Employer has reviewed your application and is considering shortlisting';
    case 'shortlisted':
      return 'Congratulations! You have been shortlisted for an interview';
    case 'rejected':
      return 'The employer has chosen to proceed with other candidates';
    case 'hired':
      return 'Congratulations! You have been hired for this position';
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

export interface ApplicationCardProps {
  application: {
    id: string
    job_id: string
    status: string
    created_at: string
    updated_at: string
    cover_letter?: string
    match_score?: number
    job?: {
      id: string
      title: string
      company_name?: string
      job_type?: string
      location?: string
      required_skills?: string[]
    }
  }
  userSkills: string[]
  matchPercentage: number
  onViewDetails: (jobId: string) => void
  className?: string
}

export function ApplicationCard({ 
  application,
  userSkills,
  matchPercentage,
  onViewDetails,
  className
}: ApplicationCardProps) {
  const [showFullCoverLetter, setShowFullCoverLetter] = useState(false);
  
  const statusIcon = application.status === 'pending' 
    ? AlertCircle 
    : application.status === 'shortlisted' 
      ? CheckCircle 
      : Clock;
  
  const requiredSkills = application.job?.required_skills || [];
  
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg overflow-hidden",
        className
      )}
    >
      <div className="p-4 sm:p-6 flex flex-col bg-gradient-to-b from-muted/50 to-muted/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold leading-tight">
              {application.job?.title || "Unknown Job"}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="text-sm">{application.job?.company_name || "Unknown Company"}</span>
            </div>
          </div>
          <Badge className={`${getStatusColor(application.status)} text-white px-3 py-1 text-xs uppercase`}>
            {application.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Applied:</span>
                <span className="font-medium text-foreground">{formatDate(application.created_at)}</span>
              </div>
            </div>
              
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last Updated:</span>
                <span className="font-medium text-foreground">{formatDate(application.updated_at)}</span>
              </div>
            </div>
              
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Job Type:</span>
                <span className="font-medium text-foreground">{application.job?.job_type || "Not specified"}</span>
              </div>
            </div>
              
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Location:</span>
                <span className="font-medium text-foreground">{application.job?.location || "Not specified"}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Application Status</h4>
              <div className="p-3 rounded-lg bg-muted flex items-start gap-3">
                {React.createElement(statusIcon, { 
                  className: cn(
                    "h-5 w-5 mt-0.5",
                    application.status === 'shortlisted' ? "text-gray-900" :
                    application.status === 'rejected' ? "text-gray-700" :
                    application.status === 'reviewed' ? "text-gray-800" :
                    "text-gray-600"
                  ) 
                })}
                <span className="text-sm">{getNextStepMessage(application.status)}</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Required Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(requiredSkills) && requiredSkills.length > 0 ? (
                  requiredSkills.map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant={userSkills.some(s => 
                        s.toLowerCase().includes(skill.toLowerCase()) || 
                        skill.toLowerCase().includes(s.toLowerCase())
                      ) ? "default" : "outline"}
                      className={userSkills.some(s => 
                        s.toLowerCase().includes(skill.toLowerCase()) || 
                        skill.toLowerCase().includes(s.toLowerCase())
                      ) ? "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20" : ""}
                    >
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No skills specified</span>
                )}
              </div>
            </div>
          </div>
        </div>
            
            {application.cover_letter && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Cover Letter
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => setShowFullCoverLetter(!showFullCoverLetter)}
              >
                {showFullCoverLetter ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Full Letter
                  </>
                )}
              </Button>
            </div>
            
            <div className={cn(
              "text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 whitespace-pre-line",
              !showFullCoverLetter && "max-h-24 overflow-hidden relative"
            )}>
              {application.cover_letter}
              
              {/* Fade out effect when collapsed */}
              {!showFullCoverLetter && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/80 to-transparent"></div>
              )}
                </div>
              </div>
            )}
      </div>
    </div>
  )
} 