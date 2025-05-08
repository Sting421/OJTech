"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getJobById, JobWithMatchScore, applyForJob, declineJob } from '@/lib/actions/opportunities';
import { Loader2, MapPin, Briefcase, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/ui/company-logo";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';

// Helper function to get match score color (can be imported if used elsewhere)
const getScoreColor = (score: number | null): string => {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
};

// Helper function to get human-readable match score label
const getScoreLabel = (score: number | null): string => {
  if (score === null) return "No match data";
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Potential Match";
  return "Low Match";
};


export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobWithMatchScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (jobId) {
      const fetchJobDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await getJobById(jobId);
          if (result.success && result.data) {
            setJob(result.data);
          } else {
            setError(result.error || "Failed to load job details.");
          }
        } catch (err: any) {
          console.error("Fetch job detail error:", err);
          setError(err?.message || "An unexpected error occurred.");
        } finally {
          setLoading(false);
        }
      };
      fetchJobDetails();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Link href="/opportunities" className="absolute top-8 left-8">
            <Button variant="outline" size="icon">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </Link>
        <h2 className="text-2xl font-semibold text-destructive mb-4">Error Loading Job Details</h2>
        <p className="text-muted-foreground mb-6">{error || "Job not found."}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8 md:py-12 flex flex-col items-center">
      <div className="container max-w-4xl px-4">
        <div className="mb-6">
          <Link href="/opportunities">
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Opportunities</span>
            </Button>
          </Link>
        </div>

        {/* Job Card - Based on original card design but larger */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "group relative flex flex-col transition-shadow duration-300",
            "border border-gray-100/80 dark:border-gray-700 bg-white dark:bg-black rounded-xl",
            "shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.1)]",
            "w-full overflow-hidden",
            "transform hover:scale-[1.01] transition-transform"
          )}
        >
          {/* Background pattern and gradient effect - visible by default */}
          <div className="absolute inset-0 opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:6px_6px]" />
          </div>
          
          {/* Header area with company and match score */}
          <div className="relative px-6 py-6 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/5 dark:to-transparent border-b border-gray-100/80 dark:border-gray-700">
            <div className="flex items-start gap-5">
              {/* Company Logo */}
              <CompanyLogo 
                logoUrl={job.company_logo_url}
                companyName={job.company_name || 'Company'}
                size="lg"
                className="shadow-md"
              />
              
              {/* Job Title & Company */}
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-2xl sm:text-3xl text-primary tracking-tight mb-1">{job.title}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  {job.company_name ?? 'Unknown Company'}
                </p>
              </div>
              
              {/* Match Score */}
              {job.match_score !== null && (
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-xl font-bold px-4 py-2 rounded-lg",
                      "bg-black/5 dark:bg-white/10 backdrop-blur-sm",
                      getScoreColor(job.match_score)
                    )}
                  >
                    {job.match_score}%
                  </span>
                  <span className="text-sm mt-1 text-gray-500 dark:text-gray-400 font-medium">
                    {getScoreLabel(job.match_score)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Job details */}
          <div className="relative flex-grow p-6 space-y-6">
            {/* Job Details Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {job.location || 'Remote'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {job.job_type || 'Full-time'}
                </span>
              </div>
              
              {job.salary_range && (
                <div className="flex items-center space-x-3">
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
            <div className="mt-6">
              <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100 tracking-tight mb-3">
                Full Job Description
              </h4>
              <div className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-3">
                {job.description?.split('\n')
                  .filter(p => p.trim())
                  .map((paragraph: string, i: number) => (
                    <p key={i} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  )) || <p>No description provided.</p>}
              </div>
            </div>
            
            {/* Skills Tags */}
            {job.required_skills && Array.isArray(job.required_skills) && job.required_skills.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100 tracking-tight mb-3">
                  Required Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill: string, i: number) => (
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
            
            {/* Application Deadline & Other Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {job.application_deadline && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Application Deadline:</span> {new Date(job.application_deadline).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                <span className="font-medium">Posted:</span> {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Border gradient effect - visible by default */}
          <div className="absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br from-transparent via-primary/10 to-transparent dark:via-primary/20 opacity-100 transition-opacity duration-500" />
        </motion.div>
      </div>
    </main>
  );
} 