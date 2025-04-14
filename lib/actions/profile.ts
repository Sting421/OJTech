"use server";

import { supabase } from "@/lib/supabase";
import { Profile, ApiResponse } from "@/lib/types/database";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { readFileAsBase64 } from "@/lib/utils/upload-helper";

// Get profile by ID
export async function getProfileById(id: string): Promise<ApiResponse<Profile>> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

// Get profile by email
export async function getProfileByEmail(email: string): Promise<ApiResponse<Profile>> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching profile by email:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

// Get current user's profile
export async function getCurrentProfile(): Promise<ApiResponse<Profile>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching current profile:", error);
    return { success: false, error: "Failed to fetch current profile" };
  }
}

// Update profile
export async function updateProfile(
  id: string,
  data: Partial<Omit<Profile, "id" | "email" | "updated_at">>
): Promise<ApiResponse<Profile>> {
  console.log("Updating profile:", { id, data });
  try {
    // First update the profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      console.log("Full error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    // Log the update result
    console.log("Profile updated successfully. Updated values:", { 
      id: profile.id,
      full_name: profile.full_name,
      github_profile: profile.github_profile,
      avatar_url: profile.avatar_url ? "[Set]" : "[Not set]",
      has_completed_onboarding: profile.has_completed_onboarding,
      has_uploaded_cv: profile.has_uploaded_cv
    });

    // Also update the corresponding student_profiles record
    try {
      const { data: existingProfiles } = await supabase
        .from("student_profiles")
        .select("id, school_email")
        .eq("id", id)
        .maybeSingle();
      
      // If a student profile exists with this ID, update it
      if (existingProfiles) {
        const studentProfileData: any = {};
        
        // Map profile fields to student_profiles fields
        if (data.full_name !== undefined) {
          studentProfileData.full_name = data.full_name;
        }
        
        if (data.github_profile !== undefined) {
          studentProfileData.github_profile = data.github_profile;
        }
        
        if (data.avatar_url !== undefined) {
          studentProfileData.photo_url = data.avatar_url;
        }
        
        // Only update if we have data to update
        if (Object.keys(studentProfileData).length > 0) {
          await supabase
            .from("student_profiles")
            .update(studentProfileData)
            .eq("id", id);
        }
      } else {
        // Try to find by email instead
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", id)
          .single();
          
        if (profileData?.email) {
          const { data: studentProfileByEmail } = await supabase
            .from("student_profiles")
            .select("id")
            .eq("school_email", profileData.email)
            .maybeSingle();
            
          if (studentProfileByEmail) {
            const studentProfileData: any = {};
            
            // Map profile fields to student_profiles fields
            if (data.full_name !== undefined) {
              studentProfileData.full_name = data.full_name;
            }
            
            if (data.github_profile !== undefined) {
              studentProfileData.github_profile = data.github_profile;
            }
            
            if (data.avatar_url !== undefined) {
              studentProfileData.photo_url = data.avatar_url;
            }
            
            // Only update if we have data to update
            if (Object.keys(studentProfileData).length > 0) {
              await supabase
                .from("student_profiles")
                .update(studentProfileData)
                .eq("id", studentProfileByEmail.id);
            }
          }
        }
      }
    } catch (syncError) {
      // Log the error but don't fail the profile update
      console.error("Error syncing with student_profiles:", syncError);
    }
    
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error instanceof Error) {
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
    }
    return { success: false, error: "Failed to update profile" };
  }
}

// Update profile avatar
export async function updateProfileAvatar(
  id: string,
  avatarBase64: string
): Promise<ApiResponse<{ avatar_url: string }>> {
  try {
    // Upload to Cloudinary
    const uploadResult = await uploadFileToCloudinary(avatarBase64, 'profile-photos');
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }
    
    if (!uploadResult.data) {
      throw new Error('Upload failed: No data returned');
    }
    
    const avatarUrl = uploadResult.data.secure_url;
    
    // Update profile with new avatar URL
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", id)
      .select('avatar_url')
      .single();

    if (error) throw error;
    
    return { 
      success: true, 
      data: { avatar_url: avatarUrl } 
    };
  } catch (error) {
    console.error("Error updating profile avatar:", error);
    return { success: false, error: "Failed to update profile avatar" };
  }
} 