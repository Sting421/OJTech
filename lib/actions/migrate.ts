"use server";

import { supabase } from "@/lib/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ApiResponse } from "@/lib/types/database";

interface StudentProfile {
  id: string;
  photo_url: string | null;
  full_name: string;
  university: string;
  course: string;
  year_level: number;
  bio: string | null;
  github_profile: string | null;
  school_email: string;
  personal_email: string | null;
  phone_number: string | null;
  country: string;
  region_province: string | null;
  city: string | null;
  postal_code: string | null;
  street_address: string | null;
  cv_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Migrates a student profile to the new profiles schema
 * and creates a CV record if needed
 */
export async function migrateStudentProfile(
  studentProfileId: string
): Promise<ApiResponse<{ profileId: string, cvId: string | null }>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check admin privileges
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminError) throw adminError;
    
    if (adminCheck.role !== "admin") {
      return { success: false, error: "Only admins can run migrations" };
    }

    // Fetch student profile
    const { data: studentProfile, error: fetchError } = await supabaseClient
      .from("student_profiles")
      .select("*")
      .eq("id", studentProfileId)
      .single();

    if (fetchError) throw fetchError;
    
    // Start a transaction
    const { data: newProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .insert([{
        id: studentProfile.id,
        email: studentProfile.school_email,
        role: "student",
        full_name: studentProfile.full_name,
        avatar_url: studentProfile.photo_url
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    let cvId = null;
    
    // Create CV record if student has a CV
    if (studentProfile.cv_url) {
      const { data: newCv, error: cvError } = await supabaseClient
        .from("cvs")
        .insert([{
          user_id: studentProfile.id,
          file_url: studentProfile.cv_url,
          skills: null // Skills will need to be extracted separately
        }])
        .select()
        .single();

      if (cvError) throw cvError;
      cvId = newCv.id;
    }

    return { 
      success: true, 
      data: { 
        profileId: newProfile.id,
        cvId 
      }
    };
  } catch (error) {
    console.error("Error migrating student profile:", error);
    return { success: false, error: "Failed to migrate student profile" };
  }
}

/**
 * Migrates all student profiles to the new schema
 */
export async function migrateAllStudentProfiles(): Promise<ApiResponse<{ 
  migratedCount: number, 
  failedCount: number,
  cvCount: number
}>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check admin privileges
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminError) throw adminError;
    
    if (adminCheck.role !== "admin") {
      return { success: false, error: "Only admins can run migrations" };
    }

    // Fetch all student profiles
    const { data: studentProfiles, error: fetchError } = await supabaseClient
      .from("student_profiles")
      .select("*");

    if (fetchError) throw fetchError;
    
    let migratedCount = 0;
    let failedCount = 0;
    let cvCount = 0;

    // Process each profile
    for (const profile of studentProfiles) {
      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", profile.school_email)
          .maybeSingle();

        if (existingProfile) {
          console.log(`Profile for ${profile.school_email} already exists, skipping`);
          continue;
        }

        // Create new profile
        const { error: profileError } = await supabaseClient
          .from("profiles")
          .insert([{
            id: profile.id,
            email: profile.school_email,
            role: "student",
            full_name: profile.full_name,
            avatar_url: profile.photo_url
          }]);

        if (profileError) throw profileError;

        // Create CV record if student has a CV
        if (profile.cv_url) {
          const { error: cvError } = await supabaseClient
            .from("cvs")
            .insert([{
              user_id: profile.id,
              file_url: profile.cv_url,
              skills: null // Skills will need to be extracted separately
            }]);

          if (cvError) throw cvError;
          cvCount++;
        }

        migratedCount++;
      } catch (error) {
        console.error(`Error migrating profile ${profile.id}:`, error);
        failedCount++;
      }
    }

    return { 
      success: true, 
      data: { 
        migratedCount,
        failedCount,
        cvCount
      }
    };
  } catch (error) {
    console.error("Error running migration:", error);
    return { success: false, error: "Failed to run migration" };
  }
} 