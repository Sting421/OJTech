/**
 * Handles social login profile creation or merging
 * This checks if a profile already exists with the same email
 */
export async function handleSocialLoginProfile(
  userId: string,
  email: string,
  fullName: string
): Promise<ApiResponse<any>> {
  console.log(`Handling social login profile for: ${userId} with email ${email}`);
  
  try {
    // First check if a profile with this email already exists
    const { data: existingProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
      
    if (lookupError) {
      console.error("Error checking for existing profile:", lookupError);
    }
    
    if (existingProfile) {
      console.log(`Found existing profile with email ${email}, ID: ${existingProfile.id}`);
      
      // If the existing profile has a different ID than the new social login user,
      // we need to update auth.user to use the existing ID
      if (existingProfile.id !== userId) {
        console.log(`Existing profile ID ${existingProfile.id} differs from new user ID ${userId}`);
        console.log("Merging accounts...");
        
        // This is a complex operation - the best approach would be:
        // 1. Update the auth.users record with admin privileges (requires service role)
        // 2. OR update any user data to use the existing profile ID
        
        // For now, let the database trigger handle this case
        console.log("Using database trigger for profile merging");
      }
      
      // Return success - the database trigger will handle merging if needed
      return { success: true, data: existingProfile };
    }
    
    // If no existing profile, create a new one
    console.log("Creating new profile for social login user");
    return await createUserProfile(userId, email, fullName);
  } catch (error) {
    console.error("Error handling social login profile:", error);
    return { success: false, error: "Error handling social login profile" };
  }
} 