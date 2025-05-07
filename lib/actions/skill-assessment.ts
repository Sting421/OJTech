"use server";

import { supabase } from "@/lib/supabase";
import { ApiResponse, SkillAssessment } from "@/lib/types/database";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Get all skill assessments for the current user
export async function getCurrentUserSkillAssessments(): Promise<ApiResponse<SkillAssessment[]>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    const { data, error } = await supabaseClient
      .from("skill_assessments")
      .select("*")
      .eq("user_id", user.id)
      .order("skill_name", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching skill assessments:", error);
    return { success: false, error: "Failed to fetch skill assessments" };
  }
}

// Add or update a skill assessment
export async function saveSkillAssessment(
  skillName: string,
  proficiencyLevel: number,
  notes?: string
): Promise<ApiResponse<SkillAssessment>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Validate proficiency level
    if (proficiencyLevel < 1 || proficiencyLevel > 5) {
      return { success: false, error: "Proficiency level must be between 1 and 5" };
    }

    // Check if assessment already exists
    const { data: existingAssessment, error: fetchError } = await supabaseClient
      .from("skill_assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("skill_name", skillName)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let result;

    if (existingAssessment) {
      // Update existing assessment
      const { data, error } = await supabaseClient
        .from("skill_assessments")
        .update({
          proficiency_level: proficiencyLevel,
          notes: notes || null
        })
        .eq("id", existingAssessment.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new assessment
      const { data, error } = await supabaseClient
        .from("skill_assessments")
        .insert({
          user_id: user.id,
          skill_name: skillName,
          proficiency_level: proficiencyLevel,
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving skill assessment:", error);
    return { success: false, error: "Failed to save skill assessment" };
  }
}

// Delete a skill assessment
export async function deleteSkillAssessment(id: string): Promise<ApiResponse<void>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Verify ownership before deleting
    const { data: assessment, error: fetchError } = await supabaseClient
      .from("skill_assessments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (assessment.user_id !== user.id) {
      return { success: false, error: "You don't have permission to delete this assessment" };
    }

    const { error } = await supabaseClient
      .from("skill_assessments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting skill assessment:", error);
    return { success: false, error: "Failed to delete skill assessment" };
  }
}

// Get suggested skills based on CV content
export async function getSuggestedSkills(): Promise<ApiResponse<string[]>> {
  try {
    const supabaseClient = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Get the most recent CV
    const { data: cvs, error: cvError } = await supabaseClient
      .from("cvs")
      .select("skills")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (cvError) throw cvError;

    if (!cvs || cvs.length === 0 || !cvs[0].skills) {
      // Fall back to most recent CV if no active CV is found
      const { data: fallbackCvs, error: fallbackError } = await supabaseClient
        .from("cvs")
        .select("skills")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (fallbackError) throw fallbackError;
      
      if (!fallbackCvs || fallbackCvs.length === 0 || !fallbackCvs[0].skills) {
        return { success: false, error: "No CV with skills found" };
      }
      
      cvs[0] = fallbackCvs[0];
    }

    // Extract skills from CV
    const cvData = cvs[0].skills;
    let suggestedSkills: string[] = [];

    // Parse skills from different possible formats
    if (cvData.skills && Array.isArray(cvData.skills)) {
      suggestedSkills = cvData.skills;
    } else if (cvData.extracted_skills && Array.isArray(cvData.extracted_skills)) {
      suggestedSkills = cvData.extracted_skills;
    } else if (cvData.keywords && Array.isArray(cvData.keywords)) {
      suggestedSkills = cvData.keywords;
    } else {
      // If no direct skill arrays, try to extract from all keys
      Object.values(cvData).forEach(value => {
        if (Array.isArray(value) && typeof value[0] === 'string') {
          suggestedSkills = [...suggestedSkills, ...value];
        }
      });
    }

    // Get existing assessments to filter them out
    const { data: existingAssessments, error: assessError } = await supabaseClient
      .from("skill_assessments")
      .select("skill_name")
      .eq("user_id", user.id);

    if (assessError) throw assessError;

    const existingSkills = new Set(existingAssessments?.map(a => a.skill_name) || []);
    
    // Filter out skills that already have assessments
    const filteredSkills = suggestedSkills.filter(skill => !existingSkills.has(skill));

    return { success: true, data: filteredSkills };
  } catch (error) {
    console.error("Error getting suggested skills:", error);
    return { success: false, error: "Failed to get suggested skills" };
  }
} 