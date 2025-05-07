"use client";

import { ApiResponse } from "@/lib/types/database";
import { Job, CreateJobInput, UpdateJobInput } from "@/lib/types/employer";
import { createJob as serverCreateJob, updateJob as serverUpdateJob, getJobById as serverGetJobById } from "./job";

export async function createJob(data: CreateJobInput): Promise<ApiResponse<Job>> {
  try {
    return await serverCreateJob(data);
  } catch (error) {
    console.error("[CLIENT] Error creating job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create job"
    };
  }
}

export async function updateJob(jobId: string, data: UpdateJobInput): Promise<ApiResponse<Job>> {
  try {
    return await serverUpdateJob(jobId, data);
  } catch (error) {
    console.error("[CLIENT] Error updating job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update job"
    };
  }
}

export async function getJobById(jobId: string): Promise<ApiResponse<Job>> {
  try {
    return await serverGetJobById(jobId);
  } catch (error) {
    console.error("[CLIENT] Error getting job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch job"
    };
  }
}
