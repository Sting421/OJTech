"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ApiResponse, UserRole } from "@/lib/types/database";

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
    const supabase = createServerComponentClient({ cookies });
    
    // Check if the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { success: false, error: "Authentication required" };
    }
    
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    
    if (adminCheckError) throw adminCheckError;
    
    if (adminCheck.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }
    
    // Create the new user account
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
      },
    });
    
    if (signUpError) throw signUpError;
    
    if (!newUser?.user) {
      return { success: false, error: "Failed to create user account" };
    }
    
    // Create the profile with the specified role
    const profileData = {
      id: newUser.user.id,
      email: email,
      role: role,
      full_name: fullName,
    };
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert([profileData])
      .select()
      .single();
    
    if (profileError) {
      // If profile creation fails, attempt to delete the user
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id);
      } catch (deleteError) {
        console.error("Error deleting user after profile creation failure:", deleteError);
      }
      throw profileError;
    }
    
    // For employers, create a company profile
    if (role === "employer" && companyName) {
      const { error: companyError } = await supabase
        .from("companies")
        .insert([{
          employer_id: newUser.user.id,
          name: companyName,
          description: "",
          website: "",
          industry: "",
          location: "",
          size: "",
        }]);
      
      if (companyError) {
        console.error("Error creating company profile:", companyError);
        // Continue despite company creation error
      }
    }
    
    return { 
      success: true, 
      data: { userId: newUser.user.id } 
    };
  } catch (error) {
    console.error("Error creating user account:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create user" 
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
    const supabase = createServerComponentClient({ cookies });
    
    // Check if the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { success: false, error: "Authentication required" };
    }
    
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    
    if (adminCheckError) throw adminCheckError;
    
    if (adminCheck.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }
    
    // Build the query
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });
    
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
    const supabase = createServerComponentClient({ cookies });
    
    // Check if the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { success: false, error: "Authentication required" };
    }
    
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    
    if (adminCheckError) throw adminCheckError;
    
    if (adminCheck.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }
    
    // Update the user's role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    
    if (updateError) throw updateError;
    
    // If changing to employer and they don't have a company profile, create one
    if (newRole === "employer") {
      const { data: existingCompany, error: companyCheckError } = await supabase
        .from("companies")
        .select("id")
        .eq("employer_id", userId)
        .maybeSingle();
      
      if (companyCheckError) throw companyCheckError;
      
      if (!existingCompany) {
        // Get user's name to use for company
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();
        
        if (profileError) throw profileError;
        
        // Create default company profile
        const { error: createCompanyError } = await supabase
          .from("companies")
          .insert([{
            employer_id: userId,
            name: `${userProfile.full_name}'s Company`,
            description: "",
            website: "",
            industry: "",
            location: "",
            size: "",
          }]);
        
        if (createCompanyError) throw createCompanyError;
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