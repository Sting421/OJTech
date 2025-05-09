import { cn } from "@/lib/utils"
import { Job } from "@/lib/types/database"
import { Briefcase, ChevronRight, MapPin } from "lucide-react"
import Link from "next/link"
import { CompanyLogo } from "@/components/ui/company-logo"
import TinderCard from "react-tinder-card"

interface JobCardProps {
  job: Job & {
    company_logo_url?: string | null;
    match_score?: number | null;
  };
  isActive: boolean;
  onSwipe: (direction: string, job: Job) => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function JobCard({ job, isActive, onSwipe, style, className }: JobCardProps) {
  return (
    <TinderCard
      className={className}
      onSwipe={(dir) => onSwipe(dir, job)}
      preventSwipe={['up', 'down']}
      swipeRequirementType="position"
      swipeThreshold={40}
      flickOnSwipe={true}
    >
      <div className="w-full h-full" style={style}>
        <div
          className={cn(
            "group relative flex flex-col h-[580px] p-6 rounded-xl overflow-hidden transition-all duration-300 ease-out",
            "border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-black",
            "shadow-md dark:shadow-lg dark:shadow-gray-950/40",
            isActive && 
              "hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-gray-950/50 hover:-translate-y-1"
          )}>
          <div
            className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isActive ? "opacity-0 group-hover:opacity-100" : "opacity-0"
            )}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          <div className="relative flex flex-col space-y-5 flex-grow">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 group-hover:bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transition-all duration-300">
                <CompanyLogo
                  logoUrl={job.company_logo_url}
                  companyName={job.company_name || "Company"}
                  size="md"
                  className="w-10 h-10 object-contain"
                />
              </div>
              {job.match_score !== null && (
                <span
                  className={cn(
                    "text-sm font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm",
                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
                    "transition-colors duration-300 group-hover:bg-gray-200/80 dark:group-hover:bg-gray-600/80"
                  )}
                >
                  {job.match_score}% Match
                </span>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-50 tracking-tight text-xl">
                {job.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-base">
                {job.company_name}
              </p>
            </div>

            <div className="flex flex-col space-y-2 text-gray-600 dark:text-gray-400 pt-2 text-sm">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-500 flex-shrink-0" />
                <span>{job.location || "Remote"}</span>
              </div>
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-500 flex-shrink-0" />
                <span>{job.job_type || "Full-time"}</span>
              </div>
            </div>
            
            <div className="pt-3">
              <Link
                href={`/opportunities/${job.id}`}
                className={cn(
                  "inline-flex items-center text-sm font-medium gap-2 px-4 py-2 rounded-lg",
                  "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100",
                  "hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors"
                )}
              >
                Show Full Details
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {job.required_skills && job.required_skills.length > 0 && (
              <div className="pt-3 flex-grow">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2.5">
                  Required Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.slice(0, 8).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-gray-200/70 dark:group-hover:bg-gray-700/70 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 8 && (
                     <span className="px-2.5 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        +{job.required_skills.length - 8} more
                     </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative mt-auto pt-5 pb-1">
             <p className="text-center text-sm text-gray-500 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Swipe to decide
            </p>
          </div>

          <div
            className={cn(
                "absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br from-transparent via-gray-200/50 to-transparent dark:via-gray-700/30 transition-opacity duration-300",
                isActive ? "opacity-0 group-hover:opacity-100" : "opacity-0"
            )}
           />
        </div>
      </div>
    </TinderCard>
  )
} 