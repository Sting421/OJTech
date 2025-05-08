import Link from "next/link";
import { Job } from "@/lib/types/employer";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Briefcase, MapPin, MoreVertical, Eye, Edit, Trash2, Users, Clock, ExternalLink, AlertCircle, CheckCircle2, XCircle, Building } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface EmployerJobCardProps {
  job: Job;
  onViewApplications: (jobId: string) => void;
  onEditJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  isDeleting: boolean;
}

// Helper function to render status badge (similar to existing one in JobList but adapted)
const renderStatusBadge = (status: string) => {
  let icon = null;
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let textColor = "";

  switch (status.toLowerCase()) {
    case "open":
      icon = <CheckCircle2 className="h-3 w-3 mr-1.5" />;
      badgeVariant = "default";
      // Relies on primary color for default badge
      break;
    case "draft":
      icon = <Clock className="h-3 w-3 mr-1.5" />;
      badgeVariant = "secondary";
      textColor = "text-yellow-600 dark:text-yellow-400";
      break;
    case "closed":
      icon = <XCircle className="h-3 w-3 mr-1.5" />;
      badgeVariant = "outline";
      textColor = "text-red-600 dark:text-red-400";
      break;
    default:
      icon = <AlertCircle className="h-3 w-3 mr-1.5" />;
      badgeVariant = "outline";
  }

  return (
    <Badge variant={badgeVariant} className={cn("capitalize", textColor)}>
      {icon}
      {status}
    </Badge>
  );
};

export function EmployerJobCard({
  job,
  onViewApplications,
  onEditJob,
  onDeleteJob,
  isDeleting,
}: EmployerJobCardProps) {
  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className={cn(
        "flex flex-col rounded-lg border-t overflow-hidden h-full", // Added h-full for consistent height in a grid
        "bg-gradient-to-b from-muted/50 to-muted/10",
        "transition-colors duration-300 group", // Added group for hover effects
      )}
    >
      {children}
    </div>
  );

  const applicationCount = job.application_count || 0; // Assuming application_count is on the job object
  const requiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];

  return (
    <CardWrapper>
      <div className="p-4 sm:p-6 flex-grow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link href={`/employer/jobs/${job.id}`} className="group-hover:text-brand transition-colors">
              <h3 className="text-lg font-semibold leading-tight truncate group-hover:underline">
                {job.title}
              </h3>
            </Link>
            <div className="flex items-center text-xs text-muted-foreground mt-1 flex-wrap">
              {job.company_name && (
                <span className="flex items-center mr-2">
                  <Building className="h-3 w-3 mr-1" /> {job.company_name}
                </span>
              )}
              <span className="flex items-center mr-2">
                <Briefcase className="h-3 w-3 mr-1" /> {job.job_type}
              </span>
              <span className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" /> {job.location}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {renderStatusBadge(job.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewApplications(job.id)}>
                  <Users className="h-4 w-4 mr-2" />
                  View Applications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditJob(job.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Job
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteJob(job.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 my-3">
          {job.description}
        </p>

        {requiredSkills.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Required Skills:</h4>
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.slice(0, 5).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {requiredSkills.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{requiredSkills.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:px-6 sm:py-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link href={`/employer/jobs/${job.id}/applications`} className="hover:underline hover:text-brand transition-colors">
            {applicationCount} {applicationCount === 1 ? "application" : "applications"}
          </Link>
          <span>
            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </CardWrapper>
  );
} 