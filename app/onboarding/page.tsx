"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { readFileAsBase64, validateFileSize, validatePDFFile } from "@/lib/utils/upload-helper";
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { uploadAndCreateCv } from "@/lib/actions/cv";
import { updateProfile } from "@/lib/actions/profile";
import { Progress } from "@/components/ui/progress";
import { Check, Github, Upload, Loader2, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

enum OnboardingStep {
  WELCOME = 0,
  CV_UPLOAD = 1,
  GITHUB_PROFILE = 2,
  COMPLETE = 3
}

export default function OnboardingPage() {
  const { user, profile, refreshUser, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [githubProfile, setGithubProfile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const router = useRouter();

  // Check if user came from GitHub OAuth
  const [isGithubUser, setIsGithubUser] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // If no user is logged in, redirect to login
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Check if user has already completed onboarding or has uploaded a CV
    // If either flag is true, consider onboarding complete
    if (profile && (profile.has_completed_onboarding || profile.has_uploaded_cv)) {
      console.log("User has already completed onboarding or uploaded a CV, redirecting to home page");
      
      // If the has_completed_onboarding flag is false but has_uploaded_cv is true,
      // update the has_completed_onboarding flag in the background for consistency
      if (profile.has_uploaded_cv && !profile.has_completed_onboarding && user.id) {
        console.log("Updating has_completed_onboarding flag to match has_uploaded_cv");
        updateProfile(user.id, { has_completed_onboarding: true })
          .then(result => {
            console.log("Profile update result:", result);
            // No need to wait for this to complete since we're already redirecting
          })
          .catch(error => {
            console.error("Error updating profile:", error);
          });
      }
      
      router.push("/");
      return;
    }

    // Check if the user authenticated with GitHub
    if (user.app_metadata?.provider === "github") {
      setIsGithubUser(true);
      
      // If they used GitHub OAuth, we can potentially get their GitHub profile
      if (user.user_metadata?.user_name) {
        setGithubProfile(`https://github.com/${user.user_metadata.user_name}`);
      }
    }

    // Calculate initial progress
    updateProgress();
  }, [user, profile, isLoading, router]);

  const updateProgress = () => {
    let newProgress = 0;
    
    if (currentStep > OnboardingStep.WELCOME) newProgress += 25;
    if (cvFile || currentStep > OnboardingStep.CV_UPLOAD) newProgress += 25;
    if ((githubProfile || isGithubUser) || currentStep > OnboardingStep.GITHUB_PROFILE) newProgress += 25;
    if (currentStep === OnboardingStep.COMPLETE) newProgress += 25;
    
    setProgress(newProgress);
  };

  const handleCvUpload = async () => {
    if (!cvFile || !user) return;
    
    setLoading(true);
    console.log("Uploading CV:", cvFile.name);
    
    // Add upload timeout
    const uploadTimeout = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Upload timeout",
        description: "The upload is taking longer than expected. Please try again with a smaller file.",
        variant: "destructive",
      });
    }, 30000); // 30 second timeout
    
    try {
      // Validate the file
      if (!validatePDFFile(cvFile)) {
        toast({
          title: "Invalid file",
          description: "Please upload a valid PDF file",
          variant: "destructive",
        });
        clearTimeout(uploadTimeout);
        setLoading(false);
        return;
      }

      if (!validateFileSize(cvFile, 10)) {
        toast({
          title: "File too large",
          description: "CV must be less than 10MB",
          variant: "destructive",
        });
        clearTimeout(uploadTimeout);
        setLoading(false);
        return;
      }

      // Upload to Cloudinary and process with AI
      const base64Data = await readFileAsBase64(cvFile);
      
      // Instead of the old uploadAndCreateCv function, use the new AI-powered one
      const { uploadAndParseCV } = await import('@/lib/actions/resume-parser');
      
      // Try-catch specifically for the upload operation
      try {
        const cvResult = await uploadAndParseCV(user.id, base64Data);
        console.log("CV upload result:", cvResult);

        if (!cvResult.success) {
          throw new Error(cvResult.error || 'Failed to save CV information');
        }
      } catch (uploadError: any) {
        console.error("CV upload failed:", uploadError);
        clearTimeout(uploadTimeout);
        setLoading(false);
        toast({
          title: "Upload failed",
          description: uploadError.message || "CV upload failed. Please try again with a smaller file.",
          variant: "destructive",
        });
        return;
      }

      // Wait a moment for the background CV processing to complete
      // This helps ensure GitHub profile is extracted before completing onboarding
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh user data to get latest profile info including extracted GitHub profile
      await refreshUser();
      
      // Force the onboarding completion status with a direct update
      // This is a critical update, so we'll try multiple times if needed
      let updateSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!updateSuccess && retryCount < maxRetries) {
        try {
          console.log(`Explicitly marking onboarding as complete (attempt ${retryCount + 1})`);
          const result = await updateProfile(user.id, {
            has_uploaded_cv: true,
            has_completed_onboarding: true
          });
          
          if (result.success) {
            updateSuccess = true;
            console.log("Successfully marked onboarding as complete:", result);
          } else {
            throw new Error(result.error);
          }
        } catch (updateError) {
          console.error(`Failed to mark onboarding as complete (attempt ${retryCount + 1}):`, updateError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!updateSuccess) {
        console.warn("Warning: Could not mark onboarding as complete after multiple attempts");
      }
      
      // Refresh user data one more time to ensure we have the latest profile state
      await refreshUser();
      
      // Check if we have profile data with GitHub profile
      if (profile && profile.github_profile) {
        // Move to GitHub step to show the profile for confirmation
        setGithubProfile(profile.github_profile);
        setCurrentStep(OnboardingStep.GITHUB_PROFILE);
        updateProgress();
        
        toast({
          title: "CV uploaded successfully",
          description: "We found your GitHub profile in your CV. Please confirm or edit it.",
        });
        
        clearTimeout(uploadTimeout);
        setLoading(false);
        return;
      }

      // No GitHub profile found or no profile data available, go to completion
      toast({
        title: "CV uploaded successfully",
        description: "Your CV has been uploaded and we're analyzing it to extract your skills",
      });

      // Skip GitHub step and go directly to completion
      setCurrentStep(OnboardingStep.COMPLETE);
      updateProgress();

      clearTimeout(uploadTimeout);
    } catch (error: any) {
      console.error("Error uploading CV:", error);
      toast({
        title: "Error uploading CV",
        description: error.message || "An error occurred while uploading your CV",
        variant: "destructive",
      });
      clearTimeout(uploadTimeout);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubProfileSave = async () => {
    if (!user) return;
    
    setLoading(true);
    console.log("Saving GitHub profile:", githubProfile);
    
    try {
      // Update profile with GitHub profile and mark onboarding as completed
      const result = await updateProfile(user.id, { 
        github_profile: githubProfile,
        has_completed_onboarding: true
      });

      console.log("Update profile result:", result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save GitHub profile');
      }

      // Advance to completion
      setCurrentStep(OnboardingStep.COMPLETE);
      updateProgress();
      
      toast({
        title: "Profile updated",
        description: "Your GitHub profile has been saved",
      });

      // Refresh user data
      await refreshUser();
    } catch (error: any) {
      console.error("Error saving GitHub profile:", error);
      toast({
        title: "Error saving profile",
        description: error.message || "An error occurred while saving your profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    console.log("Completing onboarding and redirecting to home page");
    // Redirect to home page after completion
    router.push("/");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        return (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Welcome to OJTech!</h2>
            <p className="text-muted-foreground">
              Let's complete your profile to help you find the perfect internship opportunity.
            </p>
            <Button onClick={() => { setCurrentStep(OnboardingStep.CV_UPLOAD); updateProgress(); }}>
              Get Started
            </Button>
          </div>
        );
      
      case OnboardingStep.CV_UPLOAD:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Upload your CV</h2>
            <p className="text-muted-foreground">
              Your CV helps employers understand your skills and experience. Please upload a PDF file.
            </p>
            
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center space-y-4">
              <Input 
                id="cv" 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange}
                className={cvFile ? "hidden" : ""}
                disabled={loading}
              />
              
              {cvFile && (
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{cvFile.name}</span>
                  {!loading && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCvFile(null)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  )}
                </div>
              )}
              
              {!cvFile && (
                <Label 
                  htmlFor="cv" 
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Drag and drop or click to upload</span>
                </Label>
              )}
            </div>
            
            <Button 
              onClick={handleCvUpload} 
              disabled={!cvFile || loading} 
              className="w-full"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Upload CV</span>
                </>
              )}
            </Button>
            
            {loading && (
              <div className="text-xs text-center text-muted-foreground">
                <p>Please wait while we upload and analyze your CV. This may take a moment.</p>
                <p>Do not refresh the page or navigate away.</p>
              </div>
            )}
          </div>
        );
      
      case OnboardingStep.GITHUB_PROFILE:
        return (
          <section className="min-h-96 w-full">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter">
                  GitHub Profile (Optional)
                </h1>
                <p className="text-muted-foreground">
                  Link your GitHub profile to showcase your projects and contributions.
                </p>
              </div>

              <div className="flex flex-col space-y-4">
                <Label htmlFor="github">GitHub Username</Label>
                <div className="flex space-x-2">
                  <Input
                    id="github"
                    placeholder="e.g., octocat"
                    value={githubProfile}
                    onChange={(e) => setGithubProfile(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleGithubProfileSave} 
                    disabled={loading || !githubProfile}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span>Save</span>
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCurrentStep(OnboardingStep.CV_UPLOAD);
                      updateProgress();
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={async () => {
                      if (!user) return;
                      
                      setLoading(true);
                      try {
                        // Mark onboarding as complete without GitHub profile
                        await updateProfile(user.id, { 
                          has_completed_onboarding: true 
                        });
                        
                        // Refresh user data
                        await refreshUser();
                        
                        // Go to completion step
                        setCurrentStep(OnboardingStep.COMPLETE);
                        updateProgress();
                        
                        toast({
                          title: "Onboarding completed",
                          description: "You can always update your GitHub profile later in your settings.",
                        });
                      } catch (error: any) {
                        console.error("Error skipping GitHub step:", error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to complete onboarding",
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>Skip <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        );
      
      case OnboardingStep.COMPLETE:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
            <p className="text-muted-foreground">
              Thanks for setting up your profile. We've extracted information from your CV to pre-fill your profile.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">What happens next:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Your CV is analyzed to match you with relevant opportunities
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Your profile is pre-filled with information from your CV
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  You can review and edit your profile at any time
                </li>
              </ul>
            </div>
            <Button onClick={handleComplete} className="mt-4">
              Go to Dashboard
            </Button>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="space-y-2">
          <div className="w-full">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Get Started</span>
            <span>Upload CV</span>
            <span>GitHub</span>
            <span>Complete</span>
          </div>
        </div>
        
        {renderStep()}
      </Card>
    </div>
  );
} 