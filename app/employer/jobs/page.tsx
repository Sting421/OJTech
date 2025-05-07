"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployerJobs } from "@/lib/actions/job-actions";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import JobList from "@/components/employer/jobs/JobList";
import { Job } from "@/lib/types/employer";

// Sample job data for fallback if API fails
const SAMPLE_JOB_DATA: Job = {
  id: "sample-job-1",
  title: "Sample Frontend Developer Position",
  description: "This is a sample job listing. Create a real job to see it here.",
  location: "Remote",
  job_type: "Full-time",
  required_skills: ["JavaScript", "React", "TypeScript"],
  preferred_skills: ["Next.js", "Tailwind CSS"],
  company_id: "sample-company",
  status: "open",
  created_at: new Date().toISOString(),
  application_count: 0,
  company_name: "Your Company" 
};

const PAGE_SIZE = 9;

export default function EmployerJobsPage() {
  const [jobsData, setJobsData] = useState<{ jobs: Job[]; total: number }>({ jobs: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchJobs = useCallback(async (page: number, status: string | null, search: string) => {
    setIsLoading(true);
    try {
      const result = await getEmployerJobs(page, PAGE_SIZE);
      if (result.success && result.data) {
        setJobsData({ jobs: result.data.jobs || [], total: result.data.total || 0 });
      } else {
        console.error("Error fetching jobs:", result.error || "Unknown error");
        // Show sample data as fallback
        setJobsData({ jobs: [SAMPLE_JOB_DATA], total: 1 });
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      // Show sample data as fallback
      setJobsData({ jobs: [SAMPLE_JOB_DATA], total: 1 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(currentPage, selectedStatus, searchQuery);
  }, [fetchJobs, currentPage, selectedStatus, searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStatusFilter = (status: string | null) => {
    setCurrentPage(1);
    setSelectedStatus(status);
  };

  const handleSearch = (query: string) => {
    setCurrentPage(1);
    setSearchQuery(query);
  };

  const filteredJobs = jobsData.jobs.filter(job => {
    const statusMatch = selectedStatus ? job.status.toLowerCase() === selectedStatus.toLowerCase() : true;
    const searchMatch = searchQuery 
      ? job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.company_name && job.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return statusMatch && searchMatch;
  });

  const allFetchedJobs = jobsData.jobs;
  const jobCounts = allFetchedJobs.reduce(
    (acc, job) => {
      const status = job.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalApplications = allFetchedJobs.reduce((sum, job) => sum + (job.application_count || 0), 0);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Job Listings</h1>
        <Link href="/employer/jobs/create">
          <Button className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsData.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All your job listings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobCounts.active || jobCounts.open || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently visible to candidates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalApplications}
            </div>
            <Link
              href="/employer/applications"
              className="text-xs text-primary flex items-center mt-1 hover:underline"
            >
              View all applications
              <ArrowRightIcon className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <JobList
        jobs={filteredJobs}
        totalJobs={jobsData.total}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onStatusFilter={handleStatusFilter}
        onSearch={handleSearch}
        isLoading={isLoading}
        selectedStatus={selectedStatus}
        searchQuery={searchQuery}
      />
    </div>
  );
}
