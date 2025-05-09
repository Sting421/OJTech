"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { readFileAsBase64, validateFileSize, validateCVFile } from "@/lib/utils/upload-helper";
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { uploadAndCreateCv } from "@/lib/actions/cv";
import { updateProfile } from "@/lib/actions/profile";
import { Progress } from "@/components/ui/progress";
import { Check, Github, Upload, Loader2, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";
import { FileDropInput } from "@/components/ui/file-drop-input";

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

  // Add new state for CV processing status
  const [cvProcessingStatus, setCvProcessingStatus] = useState<{
    stage: 'uploading' | 'parsing' | 'analyzing' | 'matching' | 'complete' | 'error';
    progress: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Log current state for debugging
    console.log("Onboarding state check:", {
      user: user?.id,
      profile: {
        has_uploaded_cv: profile?.has_uploaded_cv,
        has_completed_onboarding: profile?.has_completed_onboarding
      },
      isLoading,
      currentStep
    });

    // If no user is logged in, redirect to login
    if (!user) {
      console.log("No user found, redirecting to login");
      window.location.href = "/auth/login";
      return;
    }

    // Check if user has already completed onboarding or has uploaded a CV
    if (profile && (profile.has_completed_onboarding || profile.has_uploaded_cv)) {
      console.log("Onboarding completion check:", {
        has_completed_onboarding: profile.has_completed_onboarding,
        has_uploaded_cv: profile.has_uploaded_cv
      });
      
      // If the has_completed_onboarding flag is false but has_uploaded_cv is true,
      // update the has_completed_onboarding flag and wait for it to complete
      if (profile.has_uploaded_cv && !profile.has_completed_onboarding && user.id) {
        console.log("Detected inconsistency, updating has_completed_onboarding flag");
        (async () => {
          try {
            const result = await updateProfile(user.id, { 
              has_completed_onboarding: true 
            });
            console.log("Profile update result:", result);
            
            if (result.success) {
              // Refresh user data before redirecting
              await refreshUser();
              console.log("User data refreshed, redirecting to success guide");
              window.location.href = "/success-guide";
            } else {
              console.error("Failed to update profile:", result.error);
            }
          } catch (error) {
            console.error("Error updating profile:", error);
          }
        })();
        return;
      }
      
      console.log("Redirecting to success guide");
      window.location.href = "/success-guide";
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
  }, [user, profile, isLoading, currentStep]);

  const updateProgress = () => {
    let newProgress = 0;
    
    if (currentStep > OnboardingStep.WELCOME) newProgress += 25;
    if (cvFile || currentStep > OnboardingStep.CV_UPLOAD) newProgress += 25;
    if ((githubProfile || isGithubUser) || currentStep > OnboardingStep.GITHUB_PROFILE) newProgress += 25;
    if (currentStep === OnboardingStep.COMPLETE) newProgress += 25;
    
    setProgress(newProgress);
  };

  // Add new function to handle CV processing status updates
  const updateCvProcessingStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cv_processing_status, cv_processing_error')
        .eq('id', userId)
        .single();
      
      if (profile?.cv_processing_status) {
        setCvProcessingStatus({
          stage: profile.cv_processing_status,
          progress: getProgressForStage(profile.cv_processing_status),
          error: profile.cv_processing_error || undefined
        });
      }
    } catch (error) {
      console.error('Error checking CV processing status:', error);
    }
  };

  // Helper function to get progress percentage for each stage
  const getProgressForStage = (stage: string): number => {
    switch (stage) {
      case 'uploading': return 25;
      case 'parsing': return 50;
      case 'analyzing': return 75;
      case 'matching': return 90;
      case 'complete': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile || !user) return;
    
    setLoading(true);
    setCvProcessingStatus({
      stage: 'uploading',
      progress: 25
    });
    
    try {
      // Validate the file
      if (!validateCVFile(cvFile)) {
        setCvProcessingStatus({
          stage: 'error',
          progress: 0,
          error: 'Invalid file format. Please upload a PDF or Word file.'
        });
        toast({
          title: "Invalid file",
          description: "Please upload a valid PDF or Word file",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!validateFileSize(cvFile, 10)) {
        setCvProcessingStatus({
          stage: 'error',
          progress: 0,
          error: 'File size exceeds 10MB limit.'
        });
        toast({
          title: "File too large",
          description: "CV must be less than 10MB",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Upload to Cloudinary and process with AI
      const base64Data = await readFileAsBase64(cvFile);
      
      // Import and use the AI-powered parser
      const { uploadAndParseCV } = await import('@/lib/actions/resume-parser');
      
      console.log("Starting CV upload and parsing...");
      
      // Update profile flags immediately to prevent redirect loops
      await updateProfile(user.id, {
        has_uploaded_cv: true,
        has_completed_onboarding: true
      });

      // Start the CV upload and parsing in the background
      const result = await uploadAndParseCV(user.id, base64Data);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process CV');
      }

      // Show success message
      toast({
        title: "CV upload successful",
        description: "Your CV is being processed. Redirecting to success guide...",
      });

      // Small delay to ensure state updates and toast are visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force a full page refresh when redirecting to success guide
      window.location.href = "/success-guide";
      
    } catch (error: any) {
      console.error("Error uploading CV:", error);
      setCvProcessingStatus({
        stage: 'error',
        progress: 0,
        error: error.message || 'Failed to upload CV'
      });
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload and process your CV. Please try again.",
        variant: "destructive",
      });
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
    // Redirect to home page with full page refresh
    window.location.href = "/";
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
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Upload your CV</h2>
              <p className="text-muted-foreground">
                Upload your CV in PDF or Word format. We'll analyze it to match you with the best opportunities.
              </p>
            </div>

            <div className="space-y-4">
              <FileDropInput
                accept=".pdf,.doc,.docx"
                onFileSelect={(file) => {
                  setCvFile(file);
                }}
                selectedFile={cvFile}
                onRemove={() => {
                  setCvFile(null);
                  setCvProcessingStatus(null);
                }}
                disabled={loading || cvProcessingStatus?.stage === 'uploading'}
              />

              {cvFile && !cvProcessingStatus && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleCvUpload}
                    disabled={loading}
                    className="w-full h-12 text-base font-medium"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Process CV
                      </>
                    )}
                  </Button>
                </div>
              )}

              {cvProcessingStatus && cvProcessingStatus.stage !== 'complete' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {cvProcessingStatus.stage === 'error' ? 'Error' : 'Processing CV'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {cvProcessingStatus.progress}%
                    </span>
                  </div>
                  <Progress value={cvProcessingStatus.progress} className="h-2" />
                  {cvProcessingStatus.stage === 'error' && (
                    <div className="text-sm text-destructive">
                      {cvProcessingStatus.error}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCvProcessingStatus(null);
                          setCvFile(null);
                        }}
                        className="ml-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                  {cvProcessingStatus.stage !== 'error' && (
                    <p className="text-sm text-muted-foreground">
                      {cvProcessingStatus.stage === 'uploading' && 'Uploading your CV...'}
                      {cvProcessingStatus.stage === 'parsing' && 'Extracting information from your CV...'}
                      {cvProcessingStatus.stage === 'analyzing' && 'Analyzing your skills and experience...'}
                      {cvProcessingStatus.stage === 'matching' && 'Finding matching job opportunities...'}
                    </p>
                  )}
                </div>
              )}
            </div>
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