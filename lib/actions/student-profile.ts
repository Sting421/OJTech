"use server";

import { supabase } from "@/lib/supabase";
import { StudentProfile } from "@/lib/types/student";

export async function createStudentProfile(data: Omit<StudentProfile, "id" | "created_at" | "updated_at">) {
  try {
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error creating student profile:", error);
    return { success: false, error: "Failed to create student profile" };
  }
}

export async function updateStudentProfile(
  id: string,
  data: Partial<Omit<StudentProfile, "id" | "created_at" | "updated_at">>
) {
  try {
    // First check if the profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();
      
    // If profile doesn't exist, create it instead of updating
    if (!existingProfile) {
      console.log("Student profile doesn't exist, creating new profile for ID:", id);
      
      // Extract school_email from data or fetch it from profiles table
      let schoolEmail = data.school_email;
      
      if (!schoolEmail) {
        // Try to get email from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile email:", profileError);
          throw new Error("Failed to get email for profile creation");
        }
        
        schoolEmail = profileData.email;
      }
      
      // Create default student profile with provided data
      const createData = {
        id: id,
        full_name: data.full_name || "",
        school_email: schoolEmail,
        university: data.university || "",
        course: data.course || "",
        year_level: data.year_level || 1,
        bio: data.bio || "",
        github_profile: data.github_profile || "",
        personal_email: data.personal_email || null,
        phone_number: data.phone_number || null,
        country: data.country || "Philippines",
        region_province: data.region_province || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        street_address: data.street_address || null,
        photo_url: data.photo_url || null,
        cv_url: data.cv_url || null
      };
      
      const { data: newProfile, error: createError } = await supabase
        .from("student_profiles")
        .insert([createData])
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Sync with profiles table
      await syncWithProfilesTable(id, data);
      
      return { success: true, data: newProfile };
    }

    // Update the existing student_profiles table entry
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Sync relevant fields with profiles table
    await syncWithProfilesTable(id, data);
    
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error updating/creating student profile:", error);
    return { success: false, error: "Failed to update/create student profile" };
  }
}

// Helper function to sync student profile data with profiles table
async function syncWithProfilesTable(
  id: string, 
  data: Partial<Omit<StudentProfile, "id" | "created_at" | "updated_at">>
) {
  try {
    // Check if a profile exists with this ID
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, has_uploaded_cv, has_completed_onboarding")
      .eq("id", id)
      .maybeSingle();
    
    if (existingProfile) {
      // Prepare data for profiles table
      const profileData: any = {};
      
      // Map student_profiles fields to profiles fields
      if (data.full_name !== undefined) {
        profileData.full_name = data.full_name;
      }
      
      if (data.github_profile !== undefined) {
        profileData.github_profile = data.github_profile;
      }
      
      if (data.photo_url !== undefined) {
        profileData.avatar_url = data.photo_url;
      }
      
      // Mark has_uploaded_cv as true if a CV is provided
      if (data.cv_url) {
        profileData.has_uploaded_cv = true;
      }
      
      // Always mark onboarding as completed when profile is updated
      profileData.has_completed_onboarding = true;
      
      // Only update if we have data to update
      if (Object.keys(profileData).length > 0) {
        console.log("Syncing student profile changes to profiles table:", profileData);
        await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", id);
      }
    } else if (data.school_email) {
      // Try to find profile by email
      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("id, has_uploaded_cv, has_completed_onboarding")
        .eq("email", data.school_email)
        .maybeSingle();
        
      if (profileByEmail) {
        // Prepare data for profiles table
        const profileData: any = {};
        
        // Map student_profiles fields to profiles fields
        if (data.full_name !== undefined) {
          profileData.full_name = data.full_name;
        }
        
        if (data.github_profile !== undefined) {
          profileData.github_profile = data.github_profile;
        }
        
        if (data.photo_url !== undefined) {
          profileData.avatar_url = data.photo_url;
        }
        
        // Mark has_uploaded_cv as true if a CV is provided
        if (data.cv_url) {
          profileData.has_uploaded_cv = true;
        }
        
        // Always mark onboarding as completed when profile is updated
        profileData.has_completed_onboarding = true;
        
        // Only update if we have data to update
        if (Object.keys(profileData).length > 0) {
          console.log("Syncing student profile changes to profiles table via email:", profileData);
          await supabase
            .from("profiles")
            .update(profileData)
            .eq("id", profileByEmail.id);
        }
      }
    }
  } catch (syncError) {
    // Log the error but don't fail the student profile update
    console.error("Error syncing with profiles table:", syncError);
  }
}

export async function getStudentProfile(id: string) {
  try {
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return { success: false, error: "Failed to fetch student profile" };
  }
}

export async function getStudentProfileBySchoolEmail(email: string) {
  try {
    // Get the current user ID for additional filtering
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (userId) {
      // First try to find a profile with both matching email AND matching user ID
      const { data: profileByIdAndEmail, error: idEmailError } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("school_email", email)
        .eq("id", userId)
        .maybeSingle();
        
      if (!idEmailError && profileByIdAndEmail) {
        console.log("Found student profile by both ID and email:", profileByIdAndEmail.id);
        return { success: true, data: profileByIdAndEmail };
      }
      
      // If not found by both, try with just the ID
      const { data: profileById, error: idError } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (!idError && profileById) {
        console.log("Found student profile by ID only:", profileById.id);
        return { success: true, data: profileById };
      }
    }
    
    // If no user ID or not found by ID, fall back to email-only search
    console.log("Attempting to find student profile by email only:", email);
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("school_email", email)
      .single();

    if (error) throw error;
    console.log("Found student profile by email only:", profile.id);
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return { success: false, error: "Failed to fetch student profile" };
  }
}

// Populate student profile from CV data
export async function populateStudentProfileFromCv(userId: string): Promise<{ success: boolean, message: string }> {
  console.log(`Attempting to populate student profile from CV for user: ${userId}`);
  try {
    // First check if user exists and has a CV
    const { getCurrentUserMostRecentCv } = await import('@/lib/actions/cv');
    const cvResult = await getCurrentUserMostRecentCv();
    
    if (!cvResult.success || !cvResult.data) {
      console.log("No CV found for user, cannot populate profile");
      return { success: false, message: "No CV found" };
    }
    
    const cvData = cvResult.data.skills;
    if (!cvData) {
      console.log("CV has no extracted skills data");
      return { success: false, message: "CV has no extracted data" };
    }
    
    console.log("Found CV with extracted data, proceeding to update profile");
    
    // First, check if student profile exists for this user
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
      
    // Prepare data for update
    const profileData: Partial<Omit<StudentProfile, "id" | "created_at" | "updated_at">> = {};
    
    // Extract personal info
    if (cvData.personal_info) {
      if (cvData.personal_info.name) {
        profileData.full_name = cvData.personal_info.name;
      }
      
      if (cvData.personal_info.email) {
        profileData.personal_email = cvData.personal_info.email;
      }
      
      if (cvData.personal_info.phone) {
        profileData.phone_number = cvData.personal_info.phone;
      }
      
      if (cvData.personal_info.github) {
        profileData.github_profile = cvData.personal_info.github;
      }
      
      // Try to extract location information
      if (cvData.personal_info.location) {
        const location = cvData.personal_info.location;
        const locationParts = location.split(',').map((part: string) => part.trim());
        
        if (locationParts.length > 0) {
          profileData.city = locationParts[0]; // First part is usually city
        }
        
        if (locationParts.length > 1) {
          const lastPart = locationParts[locationParts.length - 1];
          if (lastPart === "Philippines" || lastPart.includes("Philippines")) {
            profileData.country = "Philippines";
          } else {
            profileData.country = lastPart;
          }
        }
      }
    }
    
    // Extract summary as bio
    if (cvData.summary) {
      profileData.bio = cvData.summary;
    }
    
    // Extract education info
    if (cvData.education && cvData.education.length > 0) {
      const education = cvData.education[0]; // Get the most recent education
      
      if (education.institution) {
        profileData.university = education.institution;
      }
      
      if (education.field) {
        profileData.course = education.field;
      }
      
      // Try to infer year level from education year
      if (education.year) {
        const currentYear = new Date().getFullYear();
        const gradYear = parseInt(education.year);
        
        if (!isNaN(gradYear)) {
          if (gradYear > currentYear) {
            // Still studying, calculate year level based on expected graduation
            const yearDiff = gradYear - currentYear;
            if (yearDiff <= 4 && yearDiff >= 1) {
              profileData.year_level = 5 - yearDiff; // Assuming 4-year degree
            }
          } else if (gradYear === currentYear) {
            profileData.year_level = 4; // Graduating or graduated this year
          } else {
            profileData.year_level = 4; // Already graduated
          }
        }
      }
    }
    
    // Set CV URL if available
    // file_url no longer exists in the CV table
    // if (cvResult.data.file_url) {
    //   profileData.cv_url = cvResult.data.file_url;
    // }
    
    // Update or create the student profile
    if (studentProfile) {
      console.log("Updating existing student profile with CV data");
      await updateStudentProfile(userId, profileData);
    } else {
      console.log("Creating new student profile with CV data");
      // Get user email from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();
        
      if (profileError) {
        throw new Error("Failed to get user email");
      }
      
      // Add school email to the profile data
      const createData = {
        ...profileData,
        school_email: profileData.email
      };
      
      await createStudentProfile(createData);
    }
    
    return { success: true, message: "Profile successfully populated from CV" };
  } catch (error) {
    console.error("Error populating student profile from CV:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to populate profile from CV" 
    };
  }
}
