"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ApiResponse, UserRole, Profile } from "@/lib/types/database";
import { getSupabaseServerClient, createServerSupabaseClient } from "@/lib/utils/supabase-helpers";

/**
 * Create a new user account with specified role
 */
export async function createUserAccount(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  companyName?: string
): Promise<ApiResponse<{ userId: string }>> {
  try {
    const supabase = getSupabaseServerClient();
    
    console.log("Starting user account creation for:", { email, role, fullName });
    
    // Check if email exists in auth using admin API
    const checkEmailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=eq.${encodeURIComponent(email.toLowerCase().trim())}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
        }
      }
    );

    const existingAuthUser = await checkEmailResponse.json();

    if (Array.isArray(existingAuthUser) && existingAuthUser.length > 0) {
      return { success: false, error: "Email is already registered in the authentication system" };
    }

    // Double-check profiles table as well
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      return { success: false, error: "Email is already associated with a profile" };
    }

    // Validate required fields
    if (role === "employer" && !companyName) {
      return { success: false, error: "Company name is required for employer accounts" };
    }

    console.log("User existence check completed:", { 
      authUser: existingAuthUser, 
      profile: existingProfile,
      email: email.toLowerCase().trim()
    });

    // First, create the auth user
    console.log("Attempting to create Supabase auth user...");
    // Validate email format
    if (!email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$/i)) {
      return { success: false, error: "Invalid email format" };
    }

    // Validate password
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long" };
    }

    // Try to create auth user with admin API
    let newUser;
    interface AuthError {
      message: string;
      code: string;
    }
    let signUpError: AuthError | null = null;
    try {
      console.log('Creating user via direct API call...');
      
      // Create auth user with admin API directly
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        email_confirm: true,
        user_metadata: { 
          full_name: fullName
        },
        app_metadata: { 
          role: role,
          provider: 'email'
        }
      });

      console.log("Auth creation response:", {
        data: authUser,
        error: authError
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      // Check for valid auth user data
      if (!authUser?.user) {
        throw new Error('No user data returned from auth creation');
      }

      // Always update user metadata after creation for consistency
      await supabase.auth.admin.updateUserById(authUser.user.id, {
        user_metadata: { 
          full_name: fullName,
          email_verified: true
        },
        app_metadata: { 
          role: role,
          provider: 'email'
        },
        email_confirm: true
      });
      console.log("User metadata and email confirmation updated");

      newUser = { 
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          user_metadata: authUser.user.user_metadata
        }
      };

      // Log successful user creation
      console.log('User created successfully:', {
        id: authUser.user.id,
        email: authUser.user.email,
        role: role,
        metadata: authUser.user.user_metadata
      });
    } catch (error) {
      console.error("Detailed auth creation error:", error);
      signUpError = {
        message: error instanceof Error ? error.message : 'Failed to create auth user',
        code: (error as any)?.code || 'UNKNOWN_ERROR'
      };
    }
    
    console.log("Auth user creation result:", { 
      success: !!newUser?.user,
      userId: newUser?.user?.id,
      error: signUpError 
    });

    if (signUpError) {
      console.error("Failed to create auth user:", signUpError);
      console.error("Detailed auth error:", JSON.stringify(signUpError));
      
      // Extract error code if available
      const errorCode = signUpError.code || '';
      const errorMessage = signUpError.message || 'Unknown error occurred';
      
      if (errorCode) {
        // Handle specific Supabase auth error codes
        switch(errorCode) {
          case '23505':
          case 'user_already_exists':
            return { success: false, error: `Email is already registered in the authentication system (${errorCode})` };
          case 'invalid_password':
            return { success: false, error: `Password does not meet requirements: ${errorMessage}` };
          case 'invalid_email':
            return { success: false, error: `Invalid email format: ${errorMessage}` };
          default:
            return { success: false, error: `Authentication error (${errorCode}): ${errorMessage}` };
        }
      } else if (signUpError.message.includes("duplicate")) {
        return { success: false, error: "Email is already registered in the authentication system" };
      } else if (signUpError.message.includes("password")) {
        return { success: false, error: "Password does not meet requirements. Please use a stronger password with at least 6 characters." };
      } else if (signUpError.message.includes("email")) {
        return { success: false, error: "Invalid email format. Please provide a valid email address." };
      }
      return { success: false, error: `Authentication error: ${signUpError.message}` };
    }
    
    if (!newUser?.user) {
      return { success: false, error: "Failed to create user account" };
    }
    
    console.log("Creating profile record for user...");
    // Create profile manually instead of relying on trigger
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert([{
        id: newUser.user.id,
        email: email.toLowerCase().trim(),
        role: role,
        full_name: fullName,
        has_completed_onboarding: false,
        has_uploaded_cv: false,
        github_profile: null,
        avatar_url: null,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      // Clean up the auth user if profile creation failed
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id);
      } catch (deleteError) {
        console.error("Error cleaning up auth user:", deleteError);
      }
      return {
        success: false,
        error: "Failed to create user profile"
      };
    }

    if (!profile) {
      // Clean up the auth user if profile wasn't created
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id);
      } catch (deleteError) {
        console.error("Error cleaning up auth user:", deleteError);
      }
      return {
        success: false,
        error: "Failed to create user profile - no profile returned"
      };
    }
    
    // For employers, create a company profile
    if (role === "employer" && companyName) {
      console.log("Creating company profile for employer...");
      const { error: employerError } = await supabase
        .from("employers")
        .insert([{
          profile_id: newUser.user.id,
          company_name: companyName,
          company_size: "1-10",
          industry: "Other",
          company_website: "",
          company_description: "",
          contact_person: fullName,
          position: "Owner",
          contact_email: email.toLowerCase().trim(),
          contact_phone: "",
          company_address: "Not specified",
          verified: false
        }]);
      
      console.log("Employer profile creation result:", { error: employerError });

      if (employerError) {
        console.error("Error creating employer profile:", { error: employerError });
        console.error("Detailed employer error:", JSON.stringify(employerError));
        
        // Prepare specific error message based on the error type
        let errorMessage = "Failed to create employer profile";
        
        if ('code' in (employerError as any)) {
          const pgError = employerError as any;
          const errorCode = pgError.code;
          const errorDetails = pgError.details || '';
          
          switch(errorCode) {
            case '23505': // unique_violation
              errorMessage = `Employer already exists: ${errorDetails}`;
              break;
            case '23503': // foreign_key_violation
              errorMessage = `Database constraint error: Unable to link employer to profile (${errorDetails})`;
              break;
            case '23502': // not_null_violation
              errorMessage = `Missing required employer field: ${errorDetails}`;
              break;
            case '23514': // check_violation
              errorMessage = `Invalid employer data: ${errorDetails}`;
              break;
            default:
              errorMessage = `Database error (${errorCode}): ${errorDetails || employerError.message}`;
          }
        } else if (employerError.message.includes("duplicate")) {
          errorMessage = "Employer profile already exists";
        } else if (employerError.message.includes("violates foreign key constraint")) {
          errorMessage = "Database constraint error: Unable to link employer to profile";
        }
        
        // Delete user and profile if company creation fails
        try {
          await supabase.auth.admin.deleteUser(newUser.user.id);
          await supabase
            .from("profiles")
            .delete()
            .eq("id", newUser.user.id);
        } catch (cleanupError) {
          console.error("Error cleaning up after employer creation failure:", cleanupError);
          console.error("Detailed cleanup error:", JSON.stringify(cleanupError));
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }
    
    // If we reach here, company creation was successful
    return { 
      success: true, 
      data: { userId: newUser.user.id } 
    };
  } catch (error) {
    console.error("Error creating user account:", error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = "Failed to create user";
    
    if (error instanceof Error) {
      // Check for specific error patterns
      const errorMsg = error.message.toLowerCase();
      console.error("Detailed error object:", JSON.stringify(error));
      
      // Check if it's a Supabase PostgreSQL error with code
      if ('code' in (error as any)) {
        const pgError = error as any;
        const errorCode = pgError.code;
        const errorDetails = pgError.details || '';
        
        // Map PostgreSQL error codes to user-friendly messages
        // See: https://www.postgresql.org/docs/current/errcodes-appendix.html
        switch(errorCode) {
          case '23505': // unique_violation
            errorMessage = `Duplicate entry: ${errorDetails}`;
            break;
          case '23503': // foreign_key_violation
            errorMessage = `Reference error: ${errorDetails}`;
            break;
          case '23502': // not_null_violation
            errorMessage = `Missing required field: ${errorDetails}`;
            break;
          case '23514': // check_violation
            errorMessage = `Validation failed: ${errorDetails}`;
            break;
          case '22001': // string_data_right_truncation
            errorMessage = `Input value too long: ${errorDetails}`;
            break;
          default:
            errorMessage = `Database error (${errorCode}): ${errorDetails || pgError.message}`;
        }
      } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        errorMessage = "Network error: Please check your internet connection and try again";
      } else if (errorMsg.includes("timeout")) {
        errorMessage = "Request timed out: The server took too long to respond, please try again";
      } else if (errorMsg.includes("permission") || errorMsg.includes("access")) {
        errorMessage = "Permission error: You don't have sufficient permissions to perform this action";
      } else if (errorMsg.includes("database")) {
        errorMessage = "Database error: There was an issue with the database operation";
      } else {
        // Use the original error message if it's specific enough
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Get all users with pagination
 */
export async function getUsers(
  page: number = 1,
  limit: number = 10,
  role?: UserRole
): Promise<ApiResponse<{ 
  users: any[]; 
  total: number; 
  page: number; 
  limit: number;
  totalPages: number;
}>> {
  try {
    const supabase = getSupabaseServerClient();
    
    // Direct admin access with service role
    let query = supabase
      .from("profiles")
      .select("id, email, role, full_name, updated_at", { count: "exact" });
    
    // Apply role filter if provided
    if (role) {
      query = query.eq("role", role);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order("updated_at", { ascending: false });
    
    // Execute the query
    const { data: users, error, count } = await query;
    
    if (error) throw error;
    
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return { 
      success: true, 
      data: { 
        users: users || [], 
        total, 
        page, 
        limit,
        totalPages
      } 
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch users" 
    };
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const supabase = getSupabaseServerClient();
    
    // Update the user's role using admin access
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    
    if (updateError) throw updateError;
    
    // If changing to employer, ensure they have a company profile
    if (newRole === "employer") {
      // Get user's profile first
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .single();
      
      if (profileError) throw profileError;

      // Check if they already have an employer profile
      const { data: existingEmployer } = await supabase
        .from("employers")
        .select("id")
        .eq("profile_id", userProfile.id)
        .maybeSingle();
      
      // Create employer profile if it doesn't exist
      if (!existingEmployer) {
        const { error: createEmployerError } = await supabase
          .from("employers")
          .insert([{
            profile_id: userProfile.id,
            company_name: `${userProfile.full_name}'s Company`,
            company_description: "No description provided",
            company_website: "",
            industry: "Not specified",
            company_address: "Not specified",
            company_size: "Not specified",
            contact_person: userProfile.full_name,
            position: "Not specified",
            contact_email: userProfile.email,
            contact_phone: "",
            verified: false
          }]);
        
        if (createEmployerError) {
          console.error("Error creating employer profile:", createEmployerError);
          throw new Error("Failed to create employer profile");
        }
      }
    }
    
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update user role" 
    };
  }
}

/**
 * Get company details by id
 * @param companyId - ID of the company to retrieve
 * @returns Company details with profile information or error
 */
export async function getCompanyById(companyId: string) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get employer details with profile information using admin access
    const { data: employer, error } = await supabase
      .from("employers")
      .select(`
        *,
        profile:profile_id(id, email, full_name, avatar_url)
      `)
      .eq("id", companyId)
      .single();
    
    if (error) {
      console.error("Error fetching employer:", error);
      return { success: false, error: "Failed to fetch employer details" };
    }
    
    if (!employer) {
      return { success: false, error: "Employer not found" };
    }
    
    return { success: true, data: employer };
  } catch (error) {
    console.error("Error in getCompanyById:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Verify an employer's account
 * @param employerId ID of the employer to verify
 * @param verified Whether to verify (true) or unverify (false) the employer
 * @returns Success status and message
 */
export async function verifyEmployer(employerId: string, verified: boolean) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Update employer verification status with admin access
    const { error } = await supabase
      .from("employers")
      .update({ 
        verified: verified,
        verification_date: verified ? new Date().toISOString() : null
      })
      .eq("id", employerId);
    
    if (error) {
      console.error("Error verifying employer:", error);
      return { success: false, error: "Failed to update verification status" };
    }
    
    // Log this admin action
    await supabase.from("admin_logs").insert({
      admin_id: employerId,
      action: verified ? "verify_employer" : "unverify_employer",
      target_id: employerId,
      details: verified ? "Employer account verified" : "Employer verification removed"
    });
    
    return { 
      success: true, 
      message: verified ? "Employer verified successfully" : "Employer verification removed" 
    };
  } catch (error) {
    console.error("Error in verifyEmployer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete an employer's account
 * @param employerId ID of the employer to delete
 * @returns Success status and message
 */
export async function deleteEmployer(employerId: string) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get the employer info first using admin access
    const { data: employer, error: fetchError } = await supabase
      .from("employers")
      .select("profile_id")
      .eq("id", employerId)
      .single();
    
    if (fetchError || !employer) {
      return { success: false, error: "Employer not found" };
    }
    
    // Start a transaction to delete all related data
    // Delete company jobs first (cascade will handle applications)
    const { error: jobsError } = await supabase
      .from("jobs")
      .delete()
      .eq("employer_id", employerId);
    
    if (jobsError) {
      console.error("Error deleting employer jobs:", jobsError);
      return { success: false, error: "Failed to delete employer jobs" };
    }
    
    // Delete the employer record
    const { error: employerError } = await supabase
      .from("employers")
      .delete()
      .eq("id", employerId);
    
    if (employerError) {
      console.error("Error deleting employer:", employerError);
      return { success: false, error: "Failed to delete employer" };
    }
    
    // Log this admin action
    await supabase.from("admin_logs").insert({
      admin_id: employerId,  // Use the employer's ID for logging
      action: "delete_employer",
      target_id: employerId,
      details: "Employer account deleted"
    });
    
    return { success: true, message: "Employer deleted successfully" };
  } catch (error) {
    console.error("Error in deleteEmployer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all employers with job counts
 * @returns List of all employers with job counts and profile information
 */
export async function getAllEmployers() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get all employers with profile data and job counts using admin access
    // First get all employers
    const { data: employers, error } = await supabase
      .from("employers")
      .select('id, company_name, industry, verified, created_at, updated_at, verification_date, profile:profile_id(id, email, full_name)')
      .order('created_at', { ascending: false }) as { data: any[] | null, error: any }; // Explicitly cast to any[]

    if (error) {
      throw error;
    }

    if (!employers) {
      console.error("No employers data returned");
      return { success: false, error: "Failed to fetch employers" };
    }

    // Map results to rename company_name to name and add job_count
    const employersWithJobCounts = await Promise.all(
      employers.map(async (employer: any) => { // Explicitly type employer as any
        const { count } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("employer_id", employer.id);

        return {
          id: employer.id,
          name: employer.company_name, // Rename company_name to name
          industry: employer.industry,
          verified: employer.verified,
          created_at: employer.created_at,
          updated_at: employer.updated_at,
          verification_date: employer.verification_date,
          profile: employer.profile,
          job_count: count || 0 // Add job_count
        };
      })
    );

    return {
      success: true,
      data: employersWithJobCounts
    };
  } catch (error) {
    console.error("Error in getAllEmployers:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
