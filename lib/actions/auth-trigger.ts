"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ApiResponse } from "@/lib/types/database";
import { randomUUID } from "crypto";

/**
 * Creates a profile for a newly registered user
 * Use this when the database trigger isn't working
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string = ""
): Promise<ApiResponse<{ success: boolean }>> {
  console.log('Starting profile creation for:', { userId, email, fullName });
  
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Check if profile already exists
    console.log('Checking for existing profile...');
    const { data: existingProfile, error: checkError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing profile:', checkError);
      throw checkError;
    }
    
    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      
      // Even if profile exists, check if student_profile exists
      const { data: existingStudentProfile, error: studentCheckError } = await supabaseClient
        .from("student_profiles")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();
      
      if (studentCheckError) {
        console.error('Error checking existing student profile:', studentCheckError);
      } else if (!existingStudentProfile) {
        // Create student profile if it doesn't exist
        await createStudentProfile(supabaseClient, userId, email, fullName);
      }
      
      return { 
        success: true, 
        data: { success: true },
        error: "Profile already exists" 
      };
    }
    
    // Create the profile
    console.log('Creating new profile with data:', {
      id: userId,
      email: email,
      role: "student",
      full_name: fullName,
    });

    const { data: insertedProfile, error } = await supabaseClient
      .from("profiles")
      .insert([{
        id: userId,
        email: email,
        role: "student",
        full_name: fullName,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting profile:', error);
      console.log('Full error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('Successfully created profile:', insertedProfile);
    
    // Create student profile
    await createStudentProfile(supabaseClient, userId, email, fullName);
    
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error creating user profile:", error);
    if (error instanceof Error) {
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create user profile" 
    };
  }
}

/**
 * Helper function to create a student profile
 */
async function createStudentProfile(
  supabaseClient: any,
  userId: string,
  email: string,
  fullName: string
) {
  console.log('Creating student profile for user:', userId);
  
  try {
    const { data: studentProfile, error: studentProfileError } = await supabaseClient
      .from("student_profiles")
      .insert([{
        id: randomUUID(),
        school_email: email,
        university: '',
        course: '',
        year_level: 1,
        country: 'Philippines'
      }])
      .select()
      .single();
      
    if (studentProfileError) {
      console.error('Error creating student profile:', studentProfileError);
      throw studentProfileError;
    }
    
    console.log('Successfully created student profile:', studentProfile);
    return studentProfile;
  } catch (error) {
    console.error('Failed to create student profile:', error);
    throw error;
  }
} 