"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployerJobs } from "@/lib/actions/job-actions";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import JobList from "@/components/employer/jobs/JobList";
import { Job } from "@/lib/types/employer";

const PAGE_SIZE = 9;

export default function EmployerJobsPage() {
  const [jobsData, setJobsData] = useState<{ jobs: Job[]; total: number }>({ jobs: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const fetchJobs = useCallback(async (page: number, status: string | null, search: string) => {
    setIsLoading(true);
    try {
      // Pass status and search to getEmployerJobs for server-side filtering
      const result = await getEmployerJobs(page, PAGE_SIZE, status, search);
      if (result.success && result.data) {
        setJobsData({ jobs: result.data.jobs || [], total: result.data.total || 0 });
      } else {
        console.error("Error fetching jobs:", result.error || "Unknown error");
        toast({
          title: "Error",
          description: "Failed to fetch job listings",
          variant: "destructive",
        });
        setJobsData({ jobs: [], total: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch job listings",
        variant: "destructive",
      });
      setJobsData({ jobs: [], total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs(currentPage, selectedStatus, searchQuery);
  }, [fetchJobs, currentPage, selectedStatus, searchQuery]);

  // Filter jobs based on status and search query
  const filteredJobs = jobsData.jobs.filter(job => {
    const statusMatch = selectedStatus ? job.status.toLowerCase() === selectedStatus.toLowerCase() : true;
    const searchMatch = searchQuery 
      ? job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.company_name && job.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return statusMatch && searchMatch;
  });

  // Calculate filtered total for pagination
  const filteredTotal = filteredJobs.length;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStatusFilter = (status: string | null) => {
    setCurrentPage(1); // Reset to first page when filter changes
    setSelectedStatus(status);
  };

  const handleSearch = (query: string) => {
    setCurrentPage(1); // Reset to first page when search changes
    setSearchQuery(query);
  };

  // Calculate counts for all jobs and different statuses
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
    <div className="py-6">
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
            <div className="text-2xl font-bold">{allFetchedJobs.length}</div>
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
            <div className="text-2xl font-bold">{jobCounts.open || 0}</div>
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
            <p className="text-xs text-muted-foreground mt-1">
              Total applications received
            </p>
          </CardContent>
        </Card>
      </div>

      <JobList
        jobs={filteredJobs}
        totalJobs={filteredTotal}
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
