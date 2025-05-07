"use server";

import { supabase } from "@/lib/supabase";
import { CV, ApiResponse } from "@/lib/types/database";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { uploadFileToCloudinary } from "@/lib/actions/upload";

// Get CV by ID
export async function getCvById(id: string): Promise<ApiResponse<CV>> {
  try {
    const { data: cv, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: cv };
  } catch (error) {
    console.error("Error fetching CV:", error);
    return { success: false, error: "Failed to fetch CV" };
  }
}

// Get all CVs for a user
export async function getCvsByUserId(userId: string): Promise<ApiResponse<CV[]>> {
  try {
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: cvs };
  } catch (error) {
    console.error("Error fetching CVs for user:", error);
    return { success: false, error: "Failed to fetch CVs" };
  }
}

// Get all CV versions for a user
export async function getAllUserCvVersions(userId: string): Promise<ApiResponse<CV[]>> {
  try {
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", userId)
      .order("version", { ascending: false });

    if (error) throw error;
    return { success: true, data: cvs };
  } catch (error) {
    console.error("Error fetching CV versions:", error);
    return { success: false, error: "Failed to fetch CV versions" };
  }
}

// Set a specific CV version as active
export async function setActiveCvVersion(cvId: string): Promise<ApiResponse<CV>> {
  try {
    // First get the CV to check user_id
    const { data: cv, error: fetchError } = await supabase
      .from("cvs")
      .select("user_id")
      .eq("id", cvId)
      .single();

    if (fetchError) throw fetchError;
    
    // Update the CV to be active
    const { data: updatedCv, error: updateError } = await supabase
      .from("cvs")
      .update({ is_active: true })
      .eq("id", cvId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    return { success: true, data: updatedCv };
  } catch (error) {
    console.error("Error setting active CV version:", error);
    return { success: false, error: "Failed to set active CV version" };
  }
}

// Get current user's CVs
export async function getCurrentUserCvs(): Promise<ApiResponse<CV[]>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    const { data: cvs, error } = await supabaseClient
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: cvs };
  } catch (error) {
    console.error("Error fetching current user CVs:", error);
    return { success: false, error: "Failed to fetch CVs" };
  }
}

// Get all CV versions for the current user
export async function getCurrentUserCvVersions(): Promise<ApiResponse<CV[]>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    return getAllUserCvVersions(user.id);
  } catch (error) {
    console.error("Error fetching current user CV versions:", error);
    return { success: false, error: "Failed to fetch CV versions" };
  }
}

// Upload and create new CV
export async function uploadAndCreateCv(
  userId: string,
  fileBase64: string,
  extractedSkills?: Record<string, any>
): Promise<ApiResponse<CV>> {
  try {
    // Upload to Cloudinary
    const uploadResult = await uploadFileToCloudinary(fileBase64, 'cvs');
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }
    
    if (!uploadResult.data) {
      throw new Error('Upload failed: No data returned');
    }
    
    // Get the next version number for this user's CV
    const { data: versionData, error: versionError } = await supabase
      .rpc('get_next_cv_version', { user_id_param: userId });
    
    // Use a separate variable for the version number
    let versionNumber = 1; // Default to version 1
    if (!versionError && versionData !== null) {
      versionNumber = versionData;
    } else {
      console.error("Error getting next version number:", versionError);
    }
    
    // Create CV record in database with version information
    const { data: cv, error } = await supabase
      .from("cvs")
      .insert([{
        user_id: userId,
        skills: extractedSkills || null,
        version: versionNumber,
        is_active: true // This will automatically set other CVs to inactive via trigger
      }])
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, data: cv };
  } catch (error) {
    console.error("Error uploading and creating CV:", error);
    return { success: false, error: "Failed to upload and create CV" };
  }
}

// Delete CV
export async function deleteCv(id: string): Promise<ApiResponse<void>> {
  try {
    // First get the CV to check if it's active
    const { data: cv, error: fetchError } = await supabase
      .from("cvs")
      .select("is_active, user_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    
    // Delete the CV record
    const { error } = await supabase
      .from("cvs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    // If the deleted CV was active, set the most recent CV as active
    if (cv.is_active) {
      const { data: latestCvs, error: latestError } = await supabase
        .from("cvs")
        .select("id")
        .eq("user_id", cv.user_id)
        .order("version", { ascending: false })
        .limit(1);
      
      if (!latestError && latestCvs && latestCvs.length > 0) {
        await setActiveCvVersion(latestCvs[0].id);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting CV:", error);
    return { success: false, error: "Failed to delete CV" };
  }
}

// Update CV skills
export async function updateCvSkills(
  id: string,
  skills: Record<string, any>
): Promise<ApiResponse<CV>> {
  try {
    const { data: cv, error } = await supabase
      .from("cvs")
      .update({ skills })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: cv };
  } catch (error) {
    console.error("Error updating CV skills:", error);
    return { success: false, error: "Failed to update CV skills" };
  }
}

// Get the most recent CV with parsed data for a user
export async function getMostRecentCvWithData(userId: string): Promise<ApiResponse<CV>> {
  try {
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", userId)
      .is("skills", "not.null") // Must have skills data
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (!cvs || cvs.length === 0) {
      return { success: false, error: "No CV with data found" };
    }
    
    return { success: true, data: cvs[0] };
  } catch (error) {
    console.error("Error fetching CV with data:", error);
    return { success: false, error: "Failed to fetch CV with data" };
  }
}

// Get the most recent CV with parsed data for the current authenticated user
export async function getCurrentUserMostRecentCv(): Promise<ApiResponse<CV>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Get active CV for user
    const { data: cvs, error } = await supabaseClient
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (error) throw error;
    
    if (!cvs || cvs.length === 0) {
      // Fall back to most recent CV if no active CV is found
      const { data: fallbackCvs, error: fallbackError } = await supabaseClient
        .from("cvs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (fallbackError) throw fallbackError;
      
      if (!fallbackCvs || fallbackCvs.length === 0) {
        return { 
          success: false, 
          error: "No CV found for this user" 
        };
      }
      
      return { success: true, data: fallbackCvs[0] };
    }
    
    return { success: true, data: cvs[0] };
  } catch (error) {
    console.error("Error fetching current user's CV:", error);
    return { success: false, error: "Failed to fetch CV data" };
  }
} 