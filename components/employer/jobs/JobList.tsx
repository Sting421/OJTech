"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  PlusCircle, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle 
} from "lucide-react";
import { 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { deleteJob } from "@/lib/actions/job";
import { Job } from "@/lib/types/employer";
import { EmployerJobCard } from "./EmployerJobCard";

interface JobListProps {
  jobs: Job[];
  totalJobs: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: string | null) => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  selectedStatus: string | null;
  searchQuery: string;
}

export default function JobList({
  jobs,
  totalJobs,
  currentPage,
  pageSize,
  onPageChange,
  onStatusFilter,
  onSearch,
  isLoading,
  selectedStatus,
  searchQuery
}: JobListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const totalPages = Math.ceil(totalJobs / pageSize);

  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobId(jobId);
    try {
      const result = await deleteJob(jobId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Job deleted successfully",
        });
        // Refresh the current page to update the job listing
        onPageChange(currentPage);
      } else {
        throw new Error(result.error || "Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  // Action handlers for the new card
  const handleViewApplications = (jobId: string) => {
    router.push(`/employer/jobs/${jobId}/applications`);
  };

  const handleEditJob = (jobId: string) => {
    router.push(`/employer/jobs/${jobId}/edit`);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={selectedStatus || "all"}
          onValueChange={(value) => onStatusFilter(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
          </SelectContent>
        </Select>

        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <Input
            placeholder="Search jobs..."
            value={searchInput}
            onChange={handleSearchInputChange}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Button asChild>
          <Link href="/employer/jobs/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Job
          </Link>
        </Button>
      </div>

      {/* Job Listings */}
      {jobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {jobs.map((job) => (
            <EmployerJobCard 
              key={job.id} 
              job={job} 
              onViewApplications={handleViewApplications}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob} 
              isDeleting={deletingJobId === job.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No jobs match your search criteria"
                  : selectedStatus
                  ? `You don't have any ${selectedStatus} jobs`
                  : "You haven't posted any jobs yet"}
              </p>
              <Button asChild>
                <Link href="/employer/jobs/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Post a Job
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                size="default"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {/* First page */}
            {currentPage > 2 && (
              <PaginationItem>
                <PaginationLink 
                  href="#" 
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            )}
            
            {/* Ellipsis */}
            {currentPage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            {/* Previous page */}
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationLink 
                  href="#" 
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(currentPage - 1);
                  }}
                >
                  {currentPage - 1}
                </PaginationLink>
              </PaginationItem>
            )}
            
            {/* Current page */}
            <PaginationItem>
              <PaginationLink href="#" size="default" isActive>
                {currentPage}
              </PaginationLink>
            </PaginationItem>
            
            {/* Next page */}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationLink 
                  href="#" 
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(currentPage + 1);
                  }}
                >
                  {currentPage + 1}
                </PaginationLink>
              </PaginationItem>
            )}
            
            {/* Ellipsis */}
            {currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            {/* Last page */}
            {currentPage < totalPages - 1 && (
              <PaginationItem>
                <PaginationLink 
                  href="#" 
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(totalPages);
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext 
                href="#" 
                size="default"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </div>
      )}
    </div>
  );
} 