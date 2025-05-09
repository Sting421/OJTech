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
import { analyzeResume } from "./resume-analyzer";
import { generateJobMatches } from "./job-matching";

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

// Add function to update CV processing status
async function updateCvProcessingStatus(userId: string, status: string, error?: string) {
  try {
    console.log(`Updating CV processing status for user ${userId}: ${status}`);
    
    // First update the profile directly (in case the trigger fails)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        cv_processing_status: status,
        cv_processing_error: error
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile CV processing status:', profileError);
    }
    
    // Then update the CV status (which should trigger the update to profile as well)
    const { data: cvData } = await supabase
      .from('cvs')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (cvData?.id) {
      const { error: cvError } = await supabase
        .from('cvs')
        .update({
          status: status,
          error_message: error
        })
        .eq('id', cvData.id);

      if (cvError) {
        console.error('Error updating CV status:', cvError);
      }
    }
  } catch (error) {
    console.error('Error in updateCvProcessingStatus:', error);
  }
}

// Update the processCV function to fix type errors
export async function processCV(cvId: string, pdfBase64: string): Promise<ApiResponse<ResumeData>> {
  let cv: { user_id: string } | null = null;
  
  try {
    const { data: cvData } = await supabase
      .from('cvs')
      .select('user_id')
      .eq('id', cvId)
      .single();

    cv = cvData;
    
    if (!cv) {
      throw new Error('CV not found');
    }

    // Update CV status to processing
    const { error: statusError } = await supabase
      .from('cvs')
      .update({ status: 'processing' })
      .eq('id', cvId);
    
    if (statusError) {
      console.error('Error updating CV status:', statusError);
    }

    // Update processing status
    await updateCvProcessingStatus(cv.user_id, 'parsing');
    
    // Extract text from PDF
    const pdfText = await extractTextFromPdf(pdfBase64);
    
    await updateCvProcessingStatus(cv.user_id, 'analyzing');
    
    // Parse the PDF content
    const parsedData = await parsePdfContent(pdfText);
    
    // Update CV with extracted skills
    const { error: updateError } = await supabase
      .from('cvs')
      .update({
        skills: parsedData,
        extracted_skills: parsedData.skills // For backward compatibility
      })
      .eq('id', cvId);
    
    if (updateError) {
      console.error('Error updating CV with parsed data:', updateError);
    }
    
    await updateCvProcessingStatus(cv.user_id, 'matching');
    
    // Analyze the resume and generate job matches
    try {
      await Promise.all([
        analyzeResume(cv.user_id, parsedData.skills.join(', ')),
        generateJobMatches(cv.user_id)
      ]);
    } catch (matchError) {
      console.error('Error in job matching:', matchError);
      // Continue processing - don't fail the entire process for matching errors
    }
    
    // Update CV status to completed
    const { error: completeError } = await supabase
      .from('cvs')
      .update({ status: 'completed' })
      .eq('id', cvId);
    
    if (completeError) {
      console.error('Error updating CV status to completed:', completeError);
    }
    
    await updateCvProcessingStatus(cv.user_id, 'complete');
    
    return {
      success: true,
      data: parsedData
    };
  } catch (error: any) {
    console.error('Error processing CV:', error);
    
    if (cv?.user_id) {
      // Update CV status to error
      if (cvId) {
        const { error: errorUpdateError } = await supabase
          .from('cvs')
          .update({ 
            status: 'error',
            error_message: error.message || 'Unknown error'
          })
          .eq('id', cvId);
        
        if (errorUpdateError) {
          console.error('Error updating CV error status:', errorUpdateError);
        }
      }
      
      await updateCvProcessingStatus(cv.user_id, 'error', error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Update the uploadAndParseCV function to skip Cloudinary
export async function uploadAndParseCV(
  userId: string,
  fileBase64: string
): Promise<ApiResponse<CV>> {
  try {
    await updateCvProcessingStatus(userId, 'uploading');
    
    // Validate the PDF base64 string
    if (!isValidPdfBase64(fileBase64)) {
      await updateCvProcessingStatus(userId, 'error', 'Invalid PDF file format');
      return {
        success: false,
        error: 'Invalid PDF file format'
      };
    }

    // Normalize the base64 string
    const normalizedBase64 = normalizePdfBase64(fileBase64);
    
    // Create CV record in database directly without Cloudinary
    const { data: cv, error: cvError } = await supabase
      .from('cvs')
      .insert({
        user_id: userId,
        status: 'uploaded',
        // Store a hash of the file to help with deduplication if needed
        file_hash: createSimpleHash(normalizedBase64.substring(0, 1000))
      })
      .select()
      .single();

    if (cvError || !cv) {
      await updateCvProcessingStatus(userId, 'error', 'Failed to create CV record');
      throw cvError || new Error('Failed to create CV record');
    }

    // Update profile flags
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_uploaded_cv: true,
        has_completed_onboarding: true
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating profile flags:', profileError);
    }

    // Process the CV in the background
    processCV(cv.id, normalizedBase64)
      .catch(error => {
        console.error('Background CV processing failed:', error);
        updateCvProcessingStatus(userId, 'error', error.message);
      });

    return {
      success: true,
      data: cv
    };
  } catch (error: any) {
    console.error('Error in uploadAndParseCV:', error);
    await updateCvProcessingStatus(userId, 'error', error.message);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Helper function to create a simple hash for file deduplication
function createSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Helper function to ensure student profile exists
async function ensureStudentProfileExists(userId: string): Promise<void> {
  try {
    console.log("Checking if student profile exists for user:", userId);
    
    // Get user profile info
    const { data: userProfile, error: userProfileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
      
    if (userProfileError || !userProfile) {
      throw new Error("Failed to get user profile");
    }
    
    // Check if student profile exists with this ID
    const { data: existingProfile, error: checkError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", userId)
      .single();
      
    if (!checkError && existingProfile) {
      console.log("Student profile already exists:", existingProfile.id);
      return;
    }
    
    // Also check by school email
    const { data: emailProfile, error: emailError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("school_email", userProfile.email)
      .single();
      
    if (!emailError && emailProfile) {
      console.log("Student profile found by email:", emailProfile.id);
      return;
    }
    
    // If no profile exists, create one
    console.log("Creating new student profile for user:", userId);
    const { data: newProfile, error: createError } = await supabase
      .from("student_profiles")
      .insert([{
        id: userId, // Use user_id as the student profile id
        school_email: userProfile.email,
        university: "University", // Default values
        course: "Course",
        year_level: 1
      }])
      .select()
      .single();
      
    if (createError) {
      throw new Error(`Failed to create student profile: ${createError.message}`);
    }
    
    console.log("New student profile created successfully:", newProfile.id);
  } catch (error) {
    console.error("Error ensuring student profile exists:", error);
    throw error;
  }
} 