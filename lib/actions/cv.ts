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
    
    const fileUrl = uploadResult.data.secure_url;
    
    // Create CV record in database
    const { data: cv, error } = await supabase
      .from("cvs")
      .insert([{
        user_id: userId,
        file_url: fileUrl,
        skills: extractedSkills || null
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
    const { error } = await supabase
      .from("cvs")
      .delete()
      .eq("id", id);

    if (error) throw error;
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
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (!cvs || cvs.length === 0) {
      return { 
        success: false, 
        error: "No CV found for this user" 
      };
    }
    
    return { success: true, data: cvs[0] };
  } catch (error) {
    console.error("Error fetching most recent CV:", error);
    return { success: false, error: "Failed to fetch CV data" };
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

    // Get all CVs for user, ordered by creation date
    const { data: cvs, error } = await supabaseClient
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (!cvs || cvs.length === 0) {
      return { 
        success: false, 
        error: "No CV found for this user" 
      };
    }
    
    return { success: true, data: cvs[0] };
  } catch (error) {
    console.error("Error fetching current user's CV:", error);
    return { success: false, error: "Failed to fetch CV data" };
  }
} 