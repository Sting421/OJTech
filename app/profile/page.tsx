"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readFileAsBase64, validateFileSize, validatePDFFile } from "@/lib/utils/upload-helper";
import { useAuth } from "@/providers/auth-provider";
import { getCurrentUserMostRecentCv } from "@/lib/actions/cv";
import { uploadAndParseCV } from "@/lib/actions/resume-parser";
import { Loader2 } from "lucide-react";
import { ResumeTips } from "@/components/resume/ResumeTips";
import { JobMatchingButton } from "@/components/resume/JobMatchingButton";
import { CvVersionList } from "@/components/resume/CvVersionList";
import { SkillAssessment } from "@/components/resume/SkillAssessment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumePreviewButton } from "@/components/resume/ResumePreviewButton";

// Add this utility function to filter out category labels from skills
function filterSkillCategoryLabels(skills: string[]): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  
  // Common category labels that should be excluded from actual skills
  const categoryLabels = [
    "backend development", "frontend development", "full stack", "other skills",
    "soft skills", "data analysis", "mobile development", "web development",
    "cloud services", "devops", "database", "testing", "ui/ux", "ux/ui", 
    "frameworks", "programming languages", "tools", "libraries", "platforms",
    "methodologies", "design", "analytics", "automation", "infrastructure"
  ];
  
  // Non-technical descriptive terms that shouldn't be listed as skills
  const descriptiveTerms = [
    "proficient in", "experienced with", "knowledge of", "familiar with",
    "expertise in", "specializing in", "skilled in", "advanced", "intermediate",
    "beginner", "expert in", "years of experience", "certified"
  ];
  
  return skills.filter(skill => {
    const lowerSkill = skill.toLowerCase().trim();
    
    // Filter out category labels
    if (categoryLabels.some(label => lowerSkill === label || 
                                   lowerSkill === label + "s" || 
                                   lowerSkill === label.replace(/s$/, ""))) {
      return false;
    }
    
    // Filter out purely descriptive terms
    if (descriptiveTerms.some(term => lowerSkill === term)) {
      return false;
    }
    
    // Filter out excessively long items (likely descriptions, not skills)
    if (skill.length > 30) {
      return false;
    }
    
    return true;
  });
}

export default function ResumePage() {
  const { toast } = useToast();
  const { user, profile: authProfile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [hasResume, setHasResume] = useState(false);
  const [cvId, setCvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  // Track if we're already loading data
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initial data load
  useEffect(() => {
    if (!user || isInitialized) return;
    
    async function loadResumeData() {
      try {
        setLoading(true);
        setUserId(user?.id || null);

        // Load CV data from profile if available
        if (authProfile?.cv_data) {
          console.log("Using CV data from profile:", authProfile.cv_data);
          setCvData(authProfile.cv_data);
          setHasResume(true);
        }
        
        // Always load CV record to get the ID
        await loadCvData();
        
        // Mark that we've successfully initialized data
        setIsInitialized(true);
      } catch (error) {
        console.error("Error loading resume data:", error);
        toast({
          title: "Error",
          description: "Failed to load resume data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadResumeData();
  }, [user, authProfile, isInitialized]);

  // Function to load CV data
  async function loadCvData() {
    if (!user) return;
    
    try {
      const result = await getCurrentUserMostRecentCv();
      if (result.success && result.data) {
        console.log("Retrieved CV data:", result.data);
        
        // Store CV ID
        setCvId(result.data.id);
        
        // Store CV skills data if not already loaded from profile
        if (!cvData) {
          setCvData(result.data.skills);
        }
        
        // Mark that we have a resume
        setHasResume(true);
      }
    } catch (error) {
      console.error("Error loading CV data:", error);
    }
  }

  // Function to handle CV version changes
  const handleCvVersionChange = async () => {
    // Reload CV data when the version changes
    await loadCvData();
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;
    
    const file = e.target.files[0];
    
    // Validate PDF file
    if (!validatePDFFile(file)) {
      toast({
        title: "Error",
        description: "Please upload a valid PDF file",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (10MB max)
    if (!validateFileSize(file, 10)) {
      toast({
        title: "Error",
        description: "Resume must be less than 10MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadLoading(true);
    
    try {
      // Convert to base64
      const base64Data = await readFileAsBase64(file);
      
      // Upload and parse
      const result = await uploadAndParseCV(userId, base64Data);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to upload resume");
      }
      
      toast({
        title: "Success",
        description: "Your resume has been uploaded and is being processed",
      });
      
      // Only refresh data, not the whole user
      // This prevents additional authentication cycles
      await loadCvData();
      setHasResume(true);
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Resume Upload Section */}
            <Card className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <h2 className="text-xl font-semibold">Upload Your Resume</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Upload your resume to automatically extract your skills, experience, and education.
                  Employers will be able to view this information when reviewing your profile.
                </p>
                
                <div className="flex items-center gap-4">
                  <Input
                    id="resume"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Label
                    htmlFor="resume"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : hasResume ? "Upload New Version" : "Upload Resume"}
                  </Label>
                  
                  {hasResume && resumeUrl && (
                    <ResumePreviewButton 
                      fileUrl={resumeUrl}
                      label="Preview Resume"
                    />
                  )}
                  
                  {hasResume && cvId && (
                    <JobMatchingButton cvId={cvId} />
                  )}
                </div>
              </div>
            </Card>
            
            {/* Resume Optimization Section */}
            {hasResume && <ResumeTips autoLoad={true} />}
            
            {/* Resume Tabs */}
            {hasResume && (
              <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                  <TabsTrigger value="info">Resume Info</TabsTrigger>
                  <TabsTrigger value="versions">Version History</TabsTrigger>
                  <TabsTrigger value="skills">Skill Assessment</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="mt-6">
                  {/* Resume Information Section */}
                  {cvData && (
                    <Card className="p-6">
                      <h2 className="text-2xl font-bold mb-6">Resume Information</h2>
                      
                      {/* Personal Info Section */}
                      {cvData.personal_info && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
                          <div className="space-y-2">
                            {cvData.personal_info.name && (
                              <p><span className="font-medium">Name:</span> {cvData.personal_info.name}</p>
                            )}
                            {cvData.personal_info.email && (
                              <p><span className="font-medium">Email:</span> {cvData.personal_info.email}</p>
                            )}
                            {cvData.personal_info.phone && (
                              <p><span className="font-medium">Phone:</span> {cvData.personal_info.phone}</p>
                            )}
                            {cvData.personal_info.location && (
                              <p><span className="font-medium">Location:</span> {cvData.personal_info.location}</p>
                            )}
                            {cvData.personal_info.github && (
                              <p>
                                <span className="font-medium">GitHub:</span>{" "}
                                <a 
                                  href={cvData.personal_info.github}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {cvData.personal_info.github}
                                </a>
                              </p>
                            )}
                            {cvData.personal_info.linkedin && (
                              <p>
                                <span className="font-medium">LinkedIn:</span>{" "}
                                <a 
                                  href={cvData.personal_info.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {cvData.personal_info.linkedin}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Summary Section */}
                      {cvData.summary && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Professional Summary</h3>
                          <p className="text-muted-foreground">{cvData.summary}</p>
                        </div>
                      )}
                      
                      {/* Skills Section */}
                      {(cvData.skills || cvData.extracted_skills) && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {filterSkillCategoryLabels(cvData.skills || cvData.extracted_skills || []).map((skill: string, index: number) => (
                              <div 
                                key={index} 
                                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                              >
                                {skill}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Education Section */}
                      {cvData.education && cvData.education.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Education</h3>
                          <div className="space-y-4">
                            {cvData.education.map((education: any, index: number) => (
                              <div key={index} className="border-l-2 border-primary/20 pl-4 py-1">
                                <h4 className="font-medium text-lg">{education.degree} in {education.field}</h4>
                                <p className="text-muted-foreground">{education.institution}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {education.year && <span>{education.year}</span>}
                                  {education.location && <span>• {education.location}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Experience Section */}
                      {cvData.experience && cvData.experience.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Experience</h3>
                          <div className="space-y-8">
                            {cvData.experience.map((experience: any, index: number) => (
                              <div key={index} className="border-l-2 border-primary/20 pl-6 py-3 relative">
                                {/* Position and Duration */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-lg text-foreground">{experience.position}</h4>
                                  {experience.duration && (
                                    <span className="inline-flex items-center text-sm bg-muted px-3 py-1 rounded-full font-medium whitespace-nowrap">
                                      {experience.duration}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Company and Type */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <p className="font-medium text-base">{experience.company}</p>
                                  {experience.type && (
                                    <span className="text-xs bg-secondary/40 text-secondary-foreground px-2 py-0.5 rounded-full">
                                      {experience.type}
                                    </span>
                                  )}
                                  {experience.location && !experience.location.includes('Remote') && (
                                    <span className="text-sm text-muted-foreground">• {experience.location}</span>
                                  )}
                                </div>
                                
                                {/* Description */}
                                {experience.description && (
                                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                    {experience.description.split('\n').map((paragraph: string, i: number) => (
                                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                        {paragraph}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Certifications Section */}
                      {cvData.certifications && cvData.certifications.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Certifications</h3>
                          <div className="space-y-4">
                            {cvData.certifications.map((cert: any, index: number) => (
                              <div key={index} className="border-l-2 border-primary/20 pl-4 py-1">
                                <div className="flex items-start gap-2">
                                  <span className="text-amber-500 mt-1">🏆</span>
                                  <div>
                                    <h4 className="font-medium">{cert.name}</h4>
                                    <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                    {cert.year && <p className="text-xs text-muted-foreground">{cert.year}</p>}
                                    {cert.url && (
                                      <a 
                                        href={cert.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline mt-1 inline-block"
                                      >
                                        View credential
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Projects Section */}
                      {cvData.projects && cvData.projects.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Projects</h3>
                          <div className="space-y-5">
                            {cvData.projects.map((project: any, index: number) => (
                              <div key={index} className="border-l-2 border-primary/20 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-medium text-lg">{project.name}</h4>
                                  {project.url && (
                                    <a 
                                      href={project.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View project
                                    </a>
                                  )}
                                </div>
                                <p className="mt-1 text-sm">{project.description}</p>
                                {project.technologies && project.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {project.technologies.map((tech: string, techIndex: number) => (
                                      <span 
                                        key={techIndex}
                                        className="bg-secondary/50 text-secondary-foreground text-xs px-2 py-0.5 rounded-full"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="versions" className="mt-6">
                  {/* Resume Version Control Section */}
                  <CvVersionList 
                    activeCvId={cvId || undefined}
                    onVersionChange={handleCvVersionChange}
                  />
                </TabsContent>

                <TabsContent value="skills" className="mt-6">
                  {/* Skill Assessment Section */}
                  <SkillAssessment />
                </TabsContent>
              </Tabs>
            )}
            
            {!cvData && !loading && (
              <Card className="p-6">
                <div className="flex flex-col items-center space-y-4 py-8">
                  <h3 className="text-xl font-semibold">No Resume Found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Please upload your resume to get started. We'll automatically extract your skills,
                    experience, and education to make your profile more attractive to employers.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
