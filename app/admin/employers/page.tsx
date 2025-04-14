"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Building2, ExternalLink, Pencil } from "lucide-react";
import { getUsers } from "@/lib/actions/admin";
import { UserRole } from "@/lib/types/database";
import { Pagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function EmployersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  useEffect(() => {
    loadEmployers(pagination.page);
  }, [pagination.page]);

  async function loadEmployers(page: number) {
    setLoading(true);
    try {
      const result = await getUsers(page, pagination.limit, "employer");
      
      if (!result.success) {
        throw new Error(result.error || "Failed to load employers");
      }
      
      setEmployers(result.data.users);
      setPagination({
        total: result.data.total,
        page: result.data.page,
        limit: result.data.limit,
        totalPages: result.data.totalPages,
      });
    } catch (error) {
      console.error("Error loading employers:", error);
      toast({
        title: "Error",
        description: "Failed to load employers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(newPage: number) {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Employers</h1>
        <Link href="/admin/employers/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Employer
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Employer Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : employers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No employer accounts found.</p>
              <Link href="/admin/employers/create">
                <Button variant="link" className="mt-2">
                  Create your first employer account
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employers.map((employer) => (
                    <TableRow key={employer.id}>
                      <TableCell className="font-medium">{employer.full_name}</TableCell>
                      <TableCell>{employer.email}</TableCell>
                      <TableCell>
                        {employer.created_at 
                          ? format(new Date(employer.created_at), 'MMM d, yyyy') 
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Link href={`/admin/employers/${employer.id}`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/admin/employers/${employer.id}/jobs`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Jobs
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 