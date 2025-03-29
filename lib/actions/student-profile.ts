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
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error updating student profile:", error);
    return { success: false, error: "Failed to update student profile" };
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
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("school_email", email)
      .single();

    if (error) throw error;
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return { success: false, error: "Failed to fetch student profile" };
  }
}
