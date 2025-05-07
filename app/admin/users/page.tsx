"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Search, Building2, CheckCircle, Briefcase, AlertTriangle, PlusCircle } from "lucide-react";
import { getUsers, updateUserRole, createUserAccount, getAllEmployers } from "@/lib/actions/admin";
import { UserRole } from "@/lib/types/database";
import { Employer } from "@/lib/types/employer";
import { CustomPagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function UsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUsers(pagination.page, roleFilter);
    loadEmployers();
  }, [pagination.page, roleFilter]);

  async function loadEmployers() {
    try {
      const result = await getAllEmployers();
      if (result.success && result.data) {
        setEmployers(result.data.employers.map((item: any) => ({
          id: item.id,
          name: item.name, // Use name from the action result (EmployerWithProfile)
          industry: item.industry,
          verified: item.verified,
          created_at: item.created_at,
          updated_at: item.updated_at,
          verification_date: item.verification_date || undefined,
          company_size: item.company_size, // Added missing field
          company_website: item.company_website, // Added missing field
          company_description: item.company_description, // Added missing field
          company_logo_url: item.company_logo_url, // Added missing field
          company_address: item.company_address, // Added missing field
          contact_person: item.contact_person, // Added missing field
          position: item.position, // Added missing field
          contact_email: item.contact_email, // Added missing field
          contact_phone: item.contact_phone, // Added missing field
          onboarding_progress: item.onboarding_progress, // Added missing field
          profile: item.profile ? { // Map profile if it exists
            id: item.profile.id || '',
            full_name: item.profile.full_name || '',
            email: item.profile.email || ''
          } : undefined,
          job_count: item.job_count || 0 // Use job_count from the action result
        })));
      }
    } catch (error) {
      console.error("Error loading employers:", error);
    }
  }

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // Debounce search to avoid excessive API calls
    const timeout = setTimeout(() => {
      loadUsers(1, roleFilter, searchTerm);
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTerm]);

  async function loadUsers(page: number, role: UserRole | 'all' = 'all', search: string = '') {
    setLoading(true);
    try {
      const result = await getUsers(page, pagination.limit, role === 'all' ? undefined : role);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load users");
      }
      
      // Filter by search term if provided
      let filteredUsers = result.data.users || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter((user: any) => 
          user.full_name?.toLowerCase().includes(searchLower) || 
          user.email?.toLowerCase().includes(searchLower)
        );
      }
      
      setUsers(filteredUsers);
      setPagination({
        total: result.data.total,
        page: result.data.page,
        limit: result.data.limit,
        totalPages: result.data.totalPages,
      });
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
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

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value as UserRole | 'all');
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      const result = await updateUserRole(userId, newRole);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update user role");
      }
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // If changing to/from employer, refresh employer list
      if (newRole === 'employer' || users.find(u => u.id === userId)?.role === 'employer') {
        await loadEmployers();
      }
      
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive",
      });
    }
  }

  function getRoleBadgeColor(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'employer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'student':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground">View and manage user accounts and roles.</p>
        </div>
      </div>

      <div className="flex items-center justify-end mb-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. Fill in the required information below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const role = formData.get('role') as UserRole;
              
              try {
                // Clear previous error
                setError(null);
                
                // Validate fields
                if (!formData.get('email') || !formData.get('password') || !formData.get('fullName')) {
                  setError("Please fill in all required fields");
                  return;
                }

                if (role === 'employer' && !formData.get('companyName')) {
                  setError("Company name is required for employer accounts");
                  return;
                }

                // Attempt to create user
                const result = await createUserAccount(
                  formData.get('email') as string,
                  formData.get('password') as string,
                  formData.get('fullName') as string,
                  role,
                  role === 'employer' ? formData.get('companyName') as string : undefined
                );

                if (result.success) {
                  toast({
                    title: "Success",
                    description: 'User account created successfully'
                  });
                  loadUsers(pagination.page, roleFilter);
                  if (role === 'employer') loadEmployers();
                  (e.target as HTMLFormElement).reset();
                  const closeButton = document.querySelector('[aria-label="Close"]');
                  if (closeButton instanceof HTMLButtonElement) closeButton.click();
                } else {
                  // Show specific error message based on the type of error
                  let errorTitle = "Failed to create user";
                  let errorDescription = result.error || 'An unexpected error occurred';
                  
                  // Customize error message based on specific error types
                  if (result.error?.includes("Email is already registered")) {
                    errorTitle = "Email already exists";
                    errorDescription = "This email address is already registered in the system. Please use a different email.";
                  } else if (result.error?.includes("duplicate")) {
                    errorTitle = "Duplicate account";
                    errorDescription = "An account with this email already exists.";
                  } else if (result.error?.includes("Company name is required")) {
                    errorTitle = "Missing company information";
                    errorDescription = "Company name is required when creating an employer account.";
                  } else if (result.error?.includes("Failed to create profile")) {
                    errorTitle = "Profile creation failed";
                    errorDescription = "There was an issue creating the user profile. Please try again.";
                  } else if (result.error?.includes("Failed to create company profile")) {
                    errorTitle = "Company profile creation failed";
                    errorDescription = "There was an issue creating the company profile. Please verify the company information and try again.";
                  } else if (result.error?.toLowerCase().includes("database")) {
                    errorTitle = "Database error";
                    errorDescription = "A database error occurred. Please try again later or contact support if the issue persists.";
                  }
                  
                  // Set the error message for in-form display
                  setError(errorDescription);
                  
                  // Also show toast notification
                  toast({
                    title: errorTitle,
                    description: errorDescription,
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Error creating user:", error);
                const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
                
                // Set the error message for in-form display
                setError(errorMessage);
                
                toast({
                  title: "Error",
                  description: errorMessage,
                  variant: "destructive"
                });
              }
            }} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="text" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="student" onValueChange={(value: string) => {
                  setSelectedRole(value as UserRole);
                  const companyField = document.getElementById('companyNameField');
                  if (companyField) {
                    companyField.style.display = value === 'employer' ? 'block' : 'none';
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div id="companyNameField" className="space-y-2" style={{display: selectedRole === 'employer' ? 'block' : 'none'}}>
                <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="companyName" 
                  name="companyName" 
                  required={selectedRole === 'employer'} 
                />
              </div>

              <Button type="submit" className="w-full">Create User</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Active user accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employers.length}</div>
            <p className="text-xs text-muted-foreground">Registered companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Employers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employers.filter(emp => emp.verified).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {((employers.filter(emp => emp.verified).length / employers.length) * 100 || 0).toFixed(1)}% of employers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Job Listings</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employers.reduce((sum, emp) => sum + (emp.job_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active job postings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Page</CardTitle>
            <div className="text-muted-foreground text-sm">{pagination.limit}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Page {pagination.page}</div>
            <p className="text-xs text-muted-foreground">of {pagination.totalPages} pages</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Filter</CardTitle>
            <div className="text-muted-foreground capitalize">{roleFilter}</div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center space-x-4">
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="employer">Employers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>User Accounts</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Showing {users.length} of {pagination.total} users
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found matching the criteria.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.role === 'employer' && (
                          employers.find(emp => emp.profile?.id === user.id)?.name || 'No company'
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'employer' && (
                          <>
                            {employers.find(emp => emp.profile && emp.profile.id === user.id)?.verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Change role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="employer">Employer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <CustomPagination
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
