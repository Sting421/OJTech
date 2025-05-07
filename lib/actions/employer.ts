"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { ApiResponse } from "@/lib/types/database";
import { 
  Employer, 
  EmployerWithProfile, 
  CreateEmployerInput, 
  UpdateEmployerInput 
} from "@/lib/types/employer";

/**
 * Get employer profile by user ID
 */
export async function getEmployerByUserId(): Promise<ApiResponse<Employer>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "employer") {
      return { success: false, error: "User is not an employer" };
    }

    // Get employer profile
    const { data: employer, error } = await supabaseClient
      .from("employers")
      .select("id, name:company_name, industry, verified, created_at, updated_at, verification_date, company_size, company_website, company_description, company_logo_url, company_address, contact_person, position, contact_email, contact_phone, onboarding_progress")
      .eq("profile_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") { // Record not found
        return { success: false, error: "Employer profile not found", warning: "Please complete your employer profile" };
      }
      throw error;
    }

    return { success: true, data: employer };
  } catch (error) {
    console.error("[EMPLOYER] Error getting employer profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch employer profile" 
    };
  }
}

/**
 * Create employer profile
 */
export async function createEmployerProfile(
  data: CreateEmployerInput
): Promise<ApiResponse<Employer>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an employer
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "employer") {
      return { success: false, error: "User is not an employer" };
    }

    // Check if employer profile already exists
    const { data: existingEmployer, error: checkError } = await supabaseClient
      .from("employers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (checkError) throw checkError;
    
    if (existingEmployer) {
      return { success: false, error: "Employer profile already exists" };
    }

    // Create new employer profile
    const { data: employer, error } = await supabaseClient
      .from("employers")
      .insert([{
        ...data,
        profile_id: user.id, // Ensure correct profile_id
      }])
      .select()
      .single();

    if (error) throw error;

    // Update user's onboarding status in profiles table
    await supabaseClient
      .from("profiles")
      .update({
        has_completed_onboarding: true
      })
      .eq("id", user.id);

    return { success: true, data: employer };
  } catch (error) {
    console.error("[EMPLOYER] Error creating employer profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create employer profile" 
    };
  }
}

/**
 * Update employer profile
 */
export async function updateEmployerProfile(
  data: UpdateEmployerInput
): Promise<ApiResponse<Employer>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Get current employer profile
    const { data: employer, error: getError } = await supabaseClient
      .from("employers")
      .select("id, onboarding_progress")
      .eq("profile_id", user.id)
      .single();

    if (getError) {
      if (getError.code === "PGRST116") { // Record not found
        return { success: false, error: "Employer profile not found" };
      }
      throw getError;
    }

    // Update employer profile
    const { data: updatedEmployer, error } = await supabaseClient
      .from("employers")
      .update(data)
      .eq("id", employer.id)
      .select()
      .single();

    if (error) throw error;

    // Removed incorrect update of has_completed_onboarding here.
    // This should be handled client-side after checking onboarding_progress.

    return { success: true, data: updatedEmployer };
  } catch (error) {
    console.error("[EMPLOYER] Error updating employer profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update employer profile"
    };
  }
}

/**
 * Get employer profile by ID (Admin only)
 */
export async function getEmployerById(
  employerId: string
): Promise<ApiResponse<EmployerWithProfile>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }

    // Get employer profile with user profile data
    const { data: employer, error } = await supabaseClient
      .from("employers")
      .select(`
        *,
        profile:profile_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("id", employerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") { // Record not found
        return { success: false, error: "Employer profile not found" };
      }
      throw error;
    }

    return { success: true, data: employer };
  } catch (error) {
    console.error("[EMPLOYER] Error getting employer profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch employer profile" 
    };
  }
}

/**
 * Get all employer profiles (Admin only)
 */
export async function getAllEmployers(
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<{ employers: EmployerWithProfile[]; total: number }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get employer profiles with user profile data
    const { data: employers, error, count } = await supabaseClient
      .from("employers")
      .select(`
        *,
        profile:profile_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `, { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { 
      success: true, 
      data: { 
        employers: employers || [], 
        total: count || 0 
      } 
    };
  } catch (error) {
    console.error("[EMPLOYER] Error getting all employer profiles:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch employer profiles" 
    };
  }
}

/**
 * Verify employer profile (Admin only)
 */
export async function verifyEmployer(
  employerId: string,
  verified: boolean
): Promise<ApiResponse<{ verified: boolean }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== "admin") {
      return { success: false, error: "Admin privileges required" };
    }

    // Update verification status
    const { error } = await supabaseClient
      .from("employers")
      .update({
        verified,
        verification_date: verified ? new Date().toISOString() : null
      })
      .eq("id", employerId);

    if (error) throw error;

    return { success: true, data: { verified } };
  } catch (error) {
    console.error("[EMPLOYER] Error verifying employer:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update verification status" 
    };
  }
}

/**
 * Update employer onboarding progress
 */
export async function updateOnboardingProgress(
  step: 'company_info' | 'contact_details' | 'company_logo',
  completed: boolean
): Promise<ApiResponse<void>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Get employer ID
    const { data: employer, error: getError } = await supabaseClient
      .from("employers")
      .select("id, onboarding_progress")
      .eq("profile_id", user.id)
      .single();

    if (getError) throw getError;

    // Update the onboarding progress directly
    const { error } = await supabaseClient
      .from('employers')
      .update({
        onboarding_progress: {
          ...employer.onboarding_progress,
          [step]: completed
        }
      })
      .eq('id', employer.id);

    if (error) throw error;

    // Check if all onboarding steps are completed
    const progress = {
      ...employer.onboarding_progress,
      [step]: completed
    };
    
    console.log('[EMPLOYER] Current onboarding progress:', progress);
    
    // Verify all required fields are completed
    const hasCompletedAllSteps = progress.company_info && progress.company_logo && progress.contact_details;
    
    console.log('[EMPLOYER] Onboarding completion check:', {
      hasCompletedAllSteps
    });
    
    if (hasCompletedAllSteps) {
      // Set has_completed_onboarding to true in profiles table
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      console.log('[EMPLOYER] Updated has_completed_onboarding to true for user:', user.id);
    } else {
      console.log('[EMPLOYER] Onboarding not yet completed, missing steps:', {
        company_info: !progress.company_info,
        company_logo: !progress.company_logo,
        contact_details: !progress.contact_details
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[EMPLOYER] Error updating onboarding progress:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update onboarding progress" 
    };
  }
}
