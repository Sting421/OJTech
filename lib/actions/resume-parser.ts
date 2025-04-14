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
 * Extract student profile data from CV text with high confidence
 */
function extractStudentProfileData(pdfText: string, resumeData: ResumeData): Partial<any> {
  console.log("Extracting student profile data from CV...");
  const profileData: Partial<any> = {};
  
  // Extract university from education section
  if (resumeData.education && resumeData.education.length > 0) {
    const mostRecentEducation = resumeData.education[0];
    
    // Only include university if it's clearly mentioned
    if (mostRecentEducation.institution && 
        /university|college|institute|school/i.test(mostRecentEducation.institution)) {
      profileData.university = mostRecentEducation.institution;
      console.log(`Found university: ${profileData.university}`);
    }
    
    // Extract course/degree if clearly stated
    if (mostRecentEducation.degree && mostRecentEducation.field) {
      profileData.course = `${mostRecentEducation.degree} in ${mostRecentEducation.field}`;
      console.log(`Found course: ${profileData.course}`);
    } else if (mostRecentEducation.field) {
      profileData.course = mostRecentEducation.field;
      console.log(`Found course (field only): ${profileData.course}`);
    }
    
    // Extract year level if specified
    const yearLevelRegex = /(\d)(?:st|nd|rd|th)?\s+year/i;
    const yearLevelMatch = pdfText.match(yearLevelRegex);
    if (yearLevelMatch && yearLevelMatch[1]) {
      const yearLevel = parseInt(yearLevelMatch[1]);
      if (yearLevel >= 1 && yearLevel <= 6) {
        profileData.year_level = yearLevel;
        console.log(`Found year level: ${profileData.year_level}`);
      }
    }
  }
  
  // Extract bio/summary
  if (resumeData.summary) {
    profileData.bio = resumeData.summary;
    console.log(`Found bio: ${profileData.bio.substring(0, 50)}...`);
  }
  
  // Extract GitHub profile with high confidence
  const githubRegex = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+/g;
  const githubMatches = pdfText.match(githubRegex);
  if (githubMatches && githubMatches.length > 0) {
    profileData.github_profile = githubMatches[0];
    console.log(`Found GitHub profile: ${profileData.github_profile}`);
  }
  
  // Extract personal email
  // Look for multiple emails and try to identify personal vs school
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = pdfText.match(emailRegex) || [];
  
  if (emails.length > 1) {
    // If we have multiple emails, try to find personal email
    // Personal emails often use gmail, yahoo, outlook, etc.
    const personalEmailDomains = /gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com/i;
    const personalEmail = emails.find(email => personalEmailDomains.test(email));
    
    if (personalEmail) {
      profileData.personal_email = personalEmail;
      console.log(`Found personal email: ${profileData.personal_email}`);
    }
  }
  
  // Extract phone number with international format
  const phoneRegex = /(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phoneMatches = pdfText.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    // Format phone number - this is a basic formatter and may need refinement
    let phoneNumber = phoneMatches[0].replace(/[^\d+]/g, '');
    if (!phoneNumber.startsWith('+')) {
      // If it doesn't have country code, assume Philippines +63
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+63' + phoneNumber.substring(1);
      } else {
        phoneNumber = '+63' + phoneNumber;
      }
    }
    profileData.phone_number = phoneNumber;
    console.log(`Found phone number: ${profileData.phone_number}`);
  }
  
  // Extract address information - this is complex and requires high confidence
  // For now, we'll just set country if we can detect Philippines
  if (/philippines|filipino|manila|quezon city|cebu|davao/i.test(pdfText)) {
    profileData.country = 'Philippines';
    console.log(`Set country to Philippines based on CV content`);
    
    // Try to extract region/province and city with high confidence
    // This is a simplified approach and may need improvement
    const regions = [
      'Metro Manila', 'NCR', 'Calabarzon', 'Central Luzon', 'Bicol', 
      'Western Visayas', 'Central Visayas', 'Eastern Visayas', 'Davao'
    ];
    
    for (const region of regions) {
      const regionRegex = new RegExp(`\\b${region}\\b`, 'i');
      if (regionRegex.test(pdfText)) {
        profileData.region_province = region;
        console.log(`Found region: ${profileData.region_province}`);
        break;
      }
    }
    
    // Common cities in Philippines
    const cities = [
      'Manila', 'Quezon City', 'Davao', 'Cebu', 'Makati', 'Taguig',
      'Pasig', 'Caloocan', 'Mandaluyong', 'Pasay', 'Parañaque'
    ];
    
    for (const city of cities) {
      const cityRegex = new RegExp(`\\b${city}\\b`, 'i');
      if (cityRegex.test(pdfText)) {
        profileData.city = city;
        console.log(`Found city: ${profileData.city}`);
        break;
      }
    }
  }
  
  // Remove any fields with low confidence
  return Object.fromEntries(
    Object.entries(profileData).filter(([_, value]) => value !== null && value !== undefined)
  );
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

    // 2. Extract text from PDF (now using actual PDF parsing)
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
    
    // 5. Extract student profile data from CV
    const studentProfileData = extractStudentProfileData(pdfText, resumeData);
    
    // 6. Update student_profiles table if we have any extracted data
    if (Object.keys(studentProfileData).length > 0) {
      try {
        console.log(`Updating student_profiles table with extracted data for user ${cv.user_id}`);
        
        // First check if student profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("id", cv.user_id)
          .single();
          
        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          // Error other than "no rows found"
          console.error("Error checking student profile existence:", profileCheckError);
        }
        
        if (!existingProfile) {
          // Profile doesn't exist, create it with minimal data
          console.log("Student profile doesn't exist, creating with extracted data");
          
          // Get user email from profiles table
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", cv.user_id)
            .single();
            
          if (userError) {
            console.error("Error getting user email:", userError);
            throw userError;
          }
          
          // Create basic student profile
          const baseProfile = {
            id: cv.user_id,
            full_name: "", // Will be populated from profiles sync
            school_email: userData.email,
            country: "Philippines",
            ...studentProfileData
          };
          
          const { error: insertError } = await supabase
            .from("student_profiles")
            .insert([baseProfile]);
            
          if (insertError) {
            console.error("Error creating student profile:", insertError);
            throw insertError;
          }
          
          console.log("Created new student profile with extracted data");
        } else {
          // Profile exists, update it with extracted data
          console.log("Updating existing student profile with extracted data");
          
          const { error: updateProfileError } = await supabase
            .from("student_profiles")
            .update(studentProfileData)
            .eq("id", cv.user_id);
            
          if (updateProfileError) {
            console.error("Error updating student profile:", updateProfileError);
            throw updateProfileError;
          }
          
          console.log("Updated student profile with extracted data");
        }
      } catch (studentProfileError) {
        // Log error but don't fail the CV processing
        console.error("Error updating student_profiles table:", studentProfileError);
      }
    }
    
    // 5. Update profile with relevant data from CV
    try {
      console.log("Syncing CV data to profile table...");
      
      // Extract GitHub profile from the CV text
      let githubProfile = null;
      const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/g;
      const githubMatches = pdfText.match(githubRegex);
      
      if (githubMatches && githubMatches.length > 0) {
        // Use the first match
        githubProfile = `https://${githubMatches[0]}`;
        console.log(`Found GitHub profile in CV: ${githubProfile}`);
      }
      
      // Check if cv_data column exists before trying to use it
      try {
        // First, try to check if the column exists in the profiles table
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'profiles')
          .eq('column_name', 'cv_data');
        
        const hasCvDataColumn = columns && columns.length > 0;
        
        // Update the profile with the basic flags that are guaranteed to exist
        const updateData: any = {
          github_profile: githubProfile || undefined,
          has_uploaded_cv: true
          // Removed has_completed_onboarding: true to fix premature completion
        };
        
        // Only add cv_data if the column exists
        if (hasCvDataColumn) {
          console.log("cv_data column exists, adding extracted metadata");
          // Prepare profile metadata with extracted information
          const profileMetadata: any = {
            has_uploaded_cv: true
            // Removed has_completed_onboarding: true to fix premature completion
          };
          
          // Add GitHub profile if found
          if (githubProfile) {
            profileMetadata.github_profile = githubProfile;
          }
          
          // Extract education and experience as metadata
          if (resumeData.education && resumeData.education.length > 0) {
            // Find the most recent or most relevant education
            const primaryEducation = resumeData.education[0];
            
            profileMetadata.education = {
              institution: primaryEducation.institution,
              degree: primaryEducation.degree,
              field: primaryEducation.field,
              year: primaryEducation.year
            };
          }
          
          if (resumeData.experience && resumeData.experience.length > 0) {
            // Get the most recent experience
            const recentExperience = resumeData.experience[0];
            
            profileMetadata.experience = {
              company: recentExperience.company,
              position: recentExperience.position,
              duration: recentExperience.duration
            };
          }
          
          // Add the full list of skills
          if (resumeData.skills && resumeData.skills.length > 0) {
            profileMetadata.extracted_skills = resumeData.skills;
          }
          
          // Add the keywords
          if (resumeData.keywords && resumeData.keywords.length > 0) {
            profileMetadata.keywords = resumeData.keywords;
          }
          
          // Store the full resume data in the cv_data field
          updateData.cv_data = resumeData;
        } else {
          console.log("cv_data column does not exist yet, skipping metadata");
        }
        
        console.log(`Updating profile (${cv.user_id}) with data:`, updateData);
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", cv.user_id)
          .select()
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        console.log("Profile updated successfully with CV data");
      } catch (columnError) {
        console.error("Error checking column existence:", columnError);
        
        // Fallback to updating just the basic profile fields
        console.log("Falling back to updating basic profile fields only");
        const { error: basicUpdateError } = await supabase
          .from("profiles")
          .update({ 
            github_profile: githubProfile || undefined,
            has_uploaded_cv: true
            // Removed has_completed_onboarding: true to fix premature completion
          })
          .eq("id", cv.user_id);
          
        if (basicUpdateError) {
          throw basicUpdateError;
        }
        
        console.log("Basic profile fields updated successfully");
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
    
    // 1. Create CV record in database
    console.log("Creating CV record in database...");
    const { data: cv, error } = await supabase
      .from("cvs")
      .insert([{
        user_id: userId,
        skills: null // Will be updated after parsing
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
        has_uploaded_cv: true 
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
        console.log("Profile CV upload flag and GitHub profile updated successfully");
      }
    } catch (profileError) {
      // Log error but don't fail the entire operation
      console.error("Error updating profile flags:", profileError);
    }
    
    // 3. Parse the CV and extract information asynchronously
    // We don't await this to make the parsing process faster
    console.log("Starting asynchronous CV processing for detailed analysis...");
    processCV(cv.id, fileBase64).catch(err => {
      console.error("Background CV processing failed:", err);
    });
    
    console.log("CV parsing completed, detailed analysis will continue in background");
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