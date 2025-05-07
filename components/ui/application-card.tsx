import React from 'react'
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/date-utils"
import { Progress } from "@/components/ui/progress"
import { Briefcase, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Building } from "lucide-react"

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
    'pending': 'bg-yellow-500',
    'reviewed': 'bg-blue-500',
    'shortlisted': 'bg-green-500',
    'rejected': 'bg-red-500',
    'hired': 'bg-purple-500'
  } as const

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-500'
}

export interface ApplicationCardProps {
  application: {
    id: string
    job_id: string
    status: string
    created_at: string
    updated_at: string
    cover_letter?: string
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
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>Job Type:</span>
              </div>
              <span className="font-medium">{application.job?.job_type || "Not specified"}</span>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Location:</span>
              </div>
              <span className="font-medium">{application.job?.location || "Not specified"}</span>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Skills Match:</span>
                <span className={cn(
                  "font-bold text-sm",
                  matchPercentage >= 80 ? "text-green-500" : 
                  matchPercentage >= 60 ? "text-blue-500" : 
                  matchPercentage >= 40 ? "text-yellow-500" : 
                  "text-red-500"
                )}>
                  {matchPercentage}%
                </span>
              </div>
              <Progress 
                value={matchPercentage} 
                className={cn(
                  "h-2",
                  matchPercentage >= 80 ? "progress-green progress-bg-green" : 
                  matchPercentage >= 60 ? "progress-blue progress-bg-blue" : 
                  matchPercentage >= 40 ? "progress-yellow progress-bg-yellow" : 
                  "progress-red progress-bg-red"
                )}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Application Status</h4>
              <div className="p-3 rounded-lg bg-muted flex items-start gap-3">
                {React.createElement(statusIcon, { 
                  className: cn(
                    "h-5 w-5 mt-0.5",
                    application.status === 'shortlisted' ? "text-green-500" :
                    application.status === 'rejected' ? "text-red-500" :
                    application.status === 'reviewed' ? "text-blue-500" :
                    "text-yellow-500"
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
            
            {application.cover_letter && (
              <div>
                <h4 className="text-sm font-medium mb-1">Your Cover Letter</h4>
                <div className="text-sm text-muted-foreground line-clamp-3 italic">
                  "{application.cover_letter}"
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 