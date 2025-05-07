"use server";

import { supabase } from "@/lib/supabase";
import { ApiResponse, CV } from "@/lib/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
// Import the pdf helper functions
import { 
  normalizePdfBase64, 
  isValidPdfBase64, 
  extractTextFromPdfBuffer 
} from '@/lib/utils/pdf-helper';
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { analyzeResume } from "./resume-analyzer";

// Configure Gemini API
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Gemini API key. Please add GEMINI_API_KEY to your .env file.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Configure PDF parsing options
const PDF_PARSE_OPTIONS = {
  // Disable the version property access which triggers the test file check
  version: null
};

interface ResumeData {
  skills: string[];
  experience: {
    company: string;
    position: string;
    duration: string;
    description: string;
    location?: string;
    type?: string; // Remote, Onsite, Hybrid
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year: string;
    location?: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    year?: string;
    url?: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }[];
  summary?: string;
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    github?: string;
    linkedin?: string;
  };
  hobbies?: string[];
  keywords: string[];
}

// Export the parsePdfContent function for testing
export async function parsePdfContent(pdfText: string): Promise<ResumeData> {
  try {
    console.log("Starting PDF content parsing with Gemini AI");
    console.log(`PDF text length: ${pdfText.length} characters`);
    
    // Trim PDF text to avoid token limits (roughly 100,000 chars is about 25,000 tokens)
    const trimmedText = pdfText.length > 100000 ? pdfText.substring(0, 100000) + "..." : pdfText;
    console.log(`Trimmed text length: ${trimmedText.length} characters`);
    
    const prompt = `
      Extract and structure the following information from this resume as comprehensively as possible:
      
      1. Personal Information:
         - Name, email, phone number, location
         - Website, GitHub, LinkedIn URLs
         
      2. Professional Summary/Objective (if present)
      
      3. Skills (technical and soft skills)
      
      4. Professional Experience:
         - Company name
         - Position/title
         - Duration/dates
         - Location and type (remote, onsite, etc.)
         - Description of responsibilities and achievements
      
      5. Education:
         - Institution name
         - Degree and field of study
         - Graduation year
         - Location
      
      6. Certifications:
         - Certificate name
         - Issuing organization
         - Year obtained
         - URL or credential ID (if present)
      
      7. Projects:
         - Project name
         - Description
         - Technologies used
         - URL (if available)
      
      8. Hobbies/Interests (if present)
      
      9. Keywords that would be relevant for job matching
      
      Format the response as JSON with the following structure:
      {
        "personal_info": {
          "name": "Full Name",
          "email": "email@example.com",
          "phone": "phone number",
          "location": "City, Country",
          "website": "personal website",
          "github": "GitHub URL",
          "linkedin": "LinkedIn URL"
        },
        "summary": "Professional summary text",
        "skills": ["skill1", "skill2", ...],
        "experience": [
          {
            "company": "Company Name",
            "position": "Position Title",
            "duration": "Start Date - End Date",
            "location": "City, Country",
            "type": "Remote/Onsite/Hybrid",
            "description": "Description of responsibilities"
          }
        ],
        "education": [
          {
            "institution": "University Name",
            "degree": "Degree Type",
            "field": "Field of Study",
            "year": "Year(s)",
            "location": "City, Country"
          }
        ],
        "certifications": [
          {
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "year": "Year",
            "url": "Verification URL"
          }
        ],
        "projects": [
          {
            "name": "Project Name",
            "description": "Project Description",
            "technologies": ["tech1", "tech2", ...],
            "url": "Project URL"
          }
        ],
        "hobbies": ["hobby1", "hobby2", ...],
        "keywords": ["keyword1", "keyword2", ...]
      }
      
      If any section doesn't exist in the resume, include an empty array or null value. Make sure all extracted data is accurate and exactly as presented in the resume.
      
      Here is the resume text:
      ${trimmedText}
    `;
    
    console.log("Sending prompt to Gemini AI");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Received response from Gemini AI");
    
    // Extract the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from the model response");
      console.log("Raw response text:", text);
      throw new Error("Failed to extract JSON from the model response");
    }
    
    const jsonStr = jsonMatch[0];
    console.log("Extracted JSON string from response");
    
    try {
      const parsedData = JSON.parse(jsonStr) as ResumeData;
      console.log("Successfully parsed JSON data");
      console.log(`Found ${parsedData.skills?.length || 0} skills, ${parsedData.experience?.length || 0} experience items, ${parsedData.education?.length || 0} education items, ${parsedData.certifications?.length || 0} certifications, ${parsedData.projects?.length || 0} projects`);
      
      // Ensure all arrays exist even if not in the parsed data
      parsedData.skills = parsedData.skills || [];
      parsedData.experience = parsedData.experience || [];
      parsedData.education = parsedData.education || [];
      parsedData.certifications = parsedData.certifications || [];
      parsedData.projects = parsedData.projects || [];
      parsedData.keywords = parsedData.keywords || [];
      parsedData.hobbies = parsedData.hobbies || [];
      
      return parsedData;
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError);
      console.log("Problematic JSON string:", jsonStr);
      throw new Error("Failed to parse JSON data from response");
    }
  } catch (error) {
    console.error("Error parsing PDF content:", error);
    console.log("Will return empty resume data");
    return {
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      keywords: [],
      hobbies: []
    };
  }
}

/**
 * Extract text from PDF using multiple methods
 */
export async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  try {
    console.log("Starting PDF text extraction");
    
    // Validate and normalize the base64 data
    if (!isValidPdfBase64(pdfBase64)) {
      console.error("Invalid PDF base64 data provided");
      throw new Error("Invalid PDF data format");
    }
    
    // Normalize the base64 data
    const normalizedBase64 = normalizePdfBase64(pdfBase64);
    
    // Convert base64 to buffer for pdf-parse
    const buffer = Buffer.from(normalizedBase64, 'base64');
    
    console.log(`PDF buffer size: ${buffer.length} bytes`);
    
    try {
      // First try the pdf-parse library
      console.log("Attempting to extract text using pdf-parse library");
      
      // Dynamically import pdf-parse to avoid the static import issues
      // @ts-ignore - Using dynamic import
      const pdfParse = await import('pdf-parse/lib/pdf-parse.js').then(m => m.default || m);
      
      // Parse PDF to extract text using the dynamically imported function with options
      const pdfData = await pdfParse(buffer, PDF_PARSE_OPTIONS);
      
      // Log the results
      console.log(`Successfully extracted text from PDF - Number of pages: ${pdfData.numpages || 'unknown'}`);
      console.log(`Extracted text length: ${pdfData.text.length} characters`);
      
      if (!pdfData.text || pdfData.text.length < 50) {
        console.warn("Warning: Extracted text is very short, trying fallback method");
        throw new Error("Extracted text too short");
      }
      
      // Return the extracted text
      return pdfData.text;
    } catch (pdfParseError) {
      // If pdf-parse fails, try our simplified extraction method
      console.log("pdf-parse failed, using simplified extraction method as fallback");
      console.error("pdf-parse error:", pdfParseError);
      
      const simplifiedText = extractTextFromPdfBuffer(buffer);
      console.log(`Simplified extraction result length: ${simplifiedText.length} characters`);
      
      if (simplifiedText.length > 100) {
        return simplifiedText;
      }
      
      // If both methods fail, use the fallback text
      throw new Error("All PDF extraction methods failed");
    }
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    
    if (error instanceof Error) {
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
    }
    
    // As a fallback for development, return a placeholder text when PDF parsing fails
    console.log("Using fallback placeholder text for development purposes");
    return "This is a fallback text for development purposes. In production, this would be text extracted from the actual PDF file. The text should contain details about skills, education, and work experience.";
  }
}

/**
 * Process a CV and extract information using Gemini
 */
export async function processCV(cvId: string, pdfBase64: string): Promise<ApiResponse<ResumeData>> {
  console.log(`Starting CV processing for CV ID: ${cvId}`);
  try {
    // 1. Check if CV exists
    const { data: cv, error: cvError } = await supabase
      .from("cvs")
      .select("user_id, id")
      .eq("id", cvId)
      .single();

    if (cvError) {
      console.error(`CV not found, error: ${cvError.message}`);
      throw new Error(`CV not found: ${cvError.message}`);
    }
    
    console.log(`Found CV record: ${cv.id} for user: ${cv.user_id}`);

    // 2. Extract text from PDF using the provided base64 data (already in memory)
    console.log("Extracting text from PDF...");
    const pdfText = await extractTextFromPdf(pdfBase64);
    
    if (!pdfText) {
      console.error("PDF text extraction returned empty result");
      throw new Error("Failed to extract text from PDF");
    }

    console.log(`Successfully extracted text from PDF (${pdfText.length} characters)`);

    // 3. Parse PDF content using Gemini
    console.log("Parsing PDF content with Gemini AI...");
    const resumeData = await parsePdfContent(pdfText);
    
    console.log('Resume data parsed successfully');
    console.log('Skills extracted:', resumeData.skills);
    console.log('Keywords extracted:', resumeData.keywords);

    // 4. Update CV record with extracted skills and data
    // We're only storing the metadata, not the raw content
    console.log(`Updating CV record (${cvId}) with parsed data...`);
    const { error: updateError } = await supabase
      .from("cvs")
      .update({
        skills: resumeData,
        extracted_skills: resumeData.skills // For backward compatibility
      })
      .eq("id", cvId);

    if (updateError) {
      console.error(`Failed to update CV: ${updateError.message}`);
      throw new Error(`Failed to update CV with parsed data: ${updateError.message}`);
    }
    
    console.log(`CV record updated successfully`);
    
    // 5. Extract and process user information for profile updates
    try {
      // Extract GitHub profile if present in the data
      let githubProfile = null;
      
      // Try to extract from personal_info first
      if (resumeData.personal_info?.github) {
        githubProfile = resumeData.personal_info.github;
        console.log(`Found GitHub profile in personal info: ${githubProfile}`);
      } else {
        // Fallback: search in the raw text
        const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/g;
        const githubMatches = pdfText.match(githubRegex);
        
        if (githubMatches && githubMatches.length > 0) {
          // Use the first match
          githubProfile = `https://${githubMatches[0]}`;
          console.log(`Found GitHub profile in CV text: ${githubProfile}`);
        }
      }
      
      // Update profile with CV information
      console.log("Syncing CV data to profile table...");
      
      const updateData: any = { 
        has_uploaded_cv: true
      };
      
      if (githubProfile) {
        updateData.github_profile = githubProfile;
      }
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", cv.user_id);
        
      if (profileError) {
        console.error("Error updating profile with CV data:", profileError);
      } else {
        console.log("Profile updated successfully with CV data");
      }
    } catch (profileError) {
      // Log error but don't fail the CV processing
      console.error("Error updating profile with CV data:", profileError);
    }

    return { success: true, data: resumeData };
  } catch (error) {
    console.error("Error processing CV:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to process CV" 
    };
  }
}

/**
 * Upload CV, create database record, and parse skills
 */
export async function uploadAndParseCV(
  userId: string,
  fileBase64: string
): Promise<ApiResponse<CV>> {
  console.log(`Starting CV parsing for user: ${userId}`);
  try {
    // First, upload the file to Cloudinary - we'll store it externally even though we don't track the URL
    console.log("Uploading CV to Cloudinary...");
    const uploadResult = await uploadFileToCloudinary(fileBase64, 'cvs', 'application/pdf');
    
    if (!uploadResult.success || !uploadResult.data) {
      console.error("Failed to upload CV to Cloudinary:", uploadResult.error);
      throw new Error(uploadResult.error || "Failed to upload CV");
    }
    
    console.log(`Successfully uploaded CV to Cloudinary: ${uploadResult.data.secure_url}`);
    
    // Extract GitHub profile from PDF content
    console.log("Extracting GitHub profile from CV...");
    let githubProfile = null;
    
    // Extract text from PDF for immediate processing
    const pdfText = await extractTextFromPdf(fileBase64);
    if (pdfText) {
      // Search for GitHub profile URL pattern
      const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/g;
      const githubMatches = pdfText.match(githubRegex);
      
      if (githubMatches && githubMatches.length > 0) {
        // Use the first match
        githubProfile = `https://${githubMatches[0]}`;
        console.log(`Found GitHub profile in CV: ${githubProfile}`);
      }
    }
    
    // Get the next version number for this user's CV
    console.log("Getting next CV version number...");
    const { data: versionData, error: versionError } = await supabase
      .rpc('get_next_cv_version', { user_id_param: userId });
    
    let versionNumber = 1; // Default to version 1
    if (!versionError && versionData !== null) {
      versionNumber = versionData;
    } else {
      console.error("Error getting next version number:", versionError);
    }
    
    // 1. Create CV record in database
    console.log("Creating CV record in database...");
    const { data: cv, error } = await supabase
      .from("cvs")
      .insert([{
        user_id: userId,
        skills: null, // Will be updated after parsing
        version: versionNumber,
        is_active: true // This will automatically set other CVs to inactive via trigger
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating CV record:", error);
      throw error;
    }
    
    console.log(`CV record created successfully with ID: ${cv.id}`);
    
    // 2. Update profile flags and GitHub profile if found
    try {
      console.log("Updating profile flags and GitHub profile after CV parsing...");
      const { data: profileData } = await supabase
        .from("profiles")
        .select("has_uploaded_cv, github_profile")
        .eq("id", userId)
        .single();
        
      // Prepare update data
      const updateData: any = { 
        has_uploaded_cv: true,
        has_completed_onboarding: true // Mark onboarding as completed immediately
      };
      
      // Only set GitHub profile if it was found and the user doesn't already have one
      if (githubProfile && (!profileData?.github_profile || profileData.github_profile === '')) {
        updateData.github_profile = githubProfile;
        console.log(`Setting GitHub profile from CV: ${githubProfile}`);
      }
      
      // Update the profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);
      
      if (updateError) {
        console.error("Error updating profile:", updateError);
      } else {
        console.log("Profile CV upload flag and onboarding completion updated successfully");
      }
    } catch (profileError) {
      // Log error but don't fail the entire operation
      console.error("Error updating profile flags:", profileError);
    }
    
    // 3. Parse the CV and extract information asynchronously using the PDF content in memory
    // We don't await this to make the parsing process faster
    console.log("Starting asynchronous CV processing for detailed analysis...");
    processCV(cv.id, fileBase64)
      .then(async () => {
        // 4. Once the CV is processed, trigger the resume analysis
        console.log("CV processing completed, now triggering resume analysis...");
        try {
          // Add a small delay to ensure skills data is fully saved
          // This helps avoid race conditions where analysis starts before skills are fully saved
          console.log("Waiting 3 seconds before starting analysis to ensure data is settled...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Start resume analysis in the background with retry logic
          const analyzeWithRetry = async (retries = 2) => {
            try {
              console.log(`Attempting to analyze CV (attempt ${3 - retries}/3)...`);
              return await analyzeResume(userId, cv.id);
            } catch (err) {
              console.error(`Analysis attempt failed: ${err}`);
              if (retries > 0) {
                console.log(`Retrying analysis in 2 seconds... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return analyzeWithRetry(retries - 1);
              }
              throw err;
            }
          };
          
          // Start the analysis with retry logic
          analyzeWithRetry().catch(analysisErr => {
            console.error("Background CV analysis failed after all retry attempts:", analysisErr);
          });
        } catch (analysisError) {
          console.error("Error starting resume analysis:", analysisError);
        }
      })
      .catch(err => {
        console.error("Background CV processing failed:", err);
      });
    
    console.log("CV parsing initiated, detailed analysis will continue in background");
    return { success: true, data: cv };
  } catch (error) {
    console.error("Error parsing CV:", error);
    if (error instanceof Error) {
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to parse CV" 
    };
  }
} 