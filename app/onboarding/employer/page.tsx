"use client";

import { useState, useEffect } from "react"; // Import useEffect
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { createEmployerProfile, updateOnboardingProgress, getEmployerByUserId, updateEmployerProfile } from "@/lib/actions/employer";
import CompanyInfoForm from "@/components/employer/onboarding/CompanyInfoForm";
import ContactDetailsForm from "@/components/employer/onboarding/ContactDetailsForm";
import LogoUpload from "@/components/employer/onboarding/LogoUpload";
import ReviewForm, { EmployerOnboardingData } from "@/components/employer/onboarding/ReviewForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/providers/auth-provider';
import dynamic from 'next/dynamic';

// Steps in the onboarding process
const steps = ["Company Info", "Contact Details", "Company Logo", "Review"];

function EmployerOnboardingComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Partial<EmployerOnboardingData>>({});
  // Remove isMounted state
  // Remove isMounted useEffect

  // Check if user is authenticated and is an employer
  useEffect(() => {
    if (!user || !profile) { // Revert check to only user and profile
      // If auth is still loading, wait
      return;
    }

    if (profile.role !== "employer") {
      router.push("/");
      return;
    }

    // If onboarding is already completed, redirect to dashboard
    if (profile.has_completed_onboarding) {
      router.push("/employer/dashboard");
      return;
    }
  }, [user, profile, router]);

  // Effect to load existing employer data and set initial state
  useEffect(() => {
    const loadEmployerData = async () => {
      if (!user || !profile) return;

      console.log("Attempting to load existing employer data for user:", user.id);

      // Get company name and contact person from profile initially
      const companyName = profile.full_name?.split(' - ')?.[1] || '';
      const contactPerson = profile.full_name?.split(' - ')?.[0] || '';

      // Fetch existing employer data
      const result = await getEmployerByUserId();

      console.log("Result of getEmployerByUserId:", result);

      if (result.success && result.data) {
        const employerData = result.data as any; // Use type assertion
        const initialOnboardingData = {
          companyName: employerData.name || employerData.company_name || companyName,
          companyWebsite: employerData.company_website || "",
          companySize: employerData.company_size || "",
          industry: employerData.industry || "",
          companyDescription: employerData.company_description || "",
          contactPerson: employerData.contact_person || contactPerson,
          position: employerData.position || profile.role || '',
          contactEmail: employerData.contact_email || profile.email || '',
          contactPhone: employerData.contact_phone || "",
          companyAddress: employerData.company_address || "",
          companyLogoUrl: employerData.company_logo_url || "",
        };
        setOnboardingData(initialOnboardingData);
        console.log("Initial onboarding data set from existing profile:", initialOnboardingData);

        // Determine current step based on saved progress
        if (employerData.onboarding_progress?.company_logo) {
          setCurrentStep(3); // Review step
        } else if (employerData.onboarding_progress?.contact_details) {
          setCurrentStep(2); // Company Logo step
        } else if (employerData.onboarding_progress?.company_info) {
          setCurrentStep(1); // Contact Details step
        } else {
          setCurrentStep(0); // Company Info step
        }
        console.log("Current step set based on progress:", currentStep);

      } else {
         // If no employer data found, initialize with profile data
         const initialOnboardingData = {
          ...onboardingData, // Keep any data already entered if user navigated back
          companyName,
          contactPerson,
          contactEmail: profile.email || '',
          position: profile.role || '',
        };
         setOnboardingData(initialOnboardingData);
         setCurrentStep(0);
         console.log("No existing employer profile found, initializing with profile data:", initialOnboardingData);
      }
    };

    loadEmployerData();
  }, [user, profile]); // Depend on user and profile

  // Show loader if auth is still loading or data is being loaded
  if (!user || !profile) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle company info form submission
  const handleCompanyInfoSubmit = async (data: any) => {
    try {
      // Update employer profile with company info
      const updateResult = await updateEmployerProfile({
        company_website: data.companyWebsite,
        company_size: data.companySize,
        industry: data.industry,
        company_description: data.companyDescription,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to save company info");
      }

      await updateOnboardingProgress('company_info', true);
      setOnboardingData({
        ...onboardingData,
        companyWebsite: data.companyWebsite,
        companySize: data.companySize,
        industry: data.industry,
        companyDescription: data.companyDescription,
      });
      setCurrentStep(1);
    } catch (error) {
      console.error("Error saving company info:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save company info",
        variant: "destructive",
      });
    }
  };

  // Handle contact details form submission
  const handleContactDetailsSubmit = async (data: any) => {
    try {
      await updateOnboardingProgress('contact_details', true);
      setOnboardingData({
        ...onboardingData,
        contactPerson: data.contactPerson,
        position: data.position,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        companyAddress: data.companyAddress,
      });
      setCurrentStep(2);
    } catch (error) {
      console.error("Error saving contact details progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      // Convert File to base64
      const base64Data = await fileToBase64(file);
      const result = await uploadFileToCloudinary(base64Data, "employer_logos", file.type); // Pass file.type
      if (!result.success || !result.data?.secure_url) {
        throw new Error(result.error || "Failed to upload logo");
      }
      return result.data.secure_url;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    }
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle logo submission
  const handleLogoSubmit = async (logoUrl: string) => {
    try {
      await updateOnboardingProgress('company_logo', true);
      setOnboardingData({
        ...onboardingData,
        companyLogoUrl: logoUrl,
      });
      setCurrentStep(3);
    } catch (error) {
      console.error("Error saving logo progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      // Make sure all required fields are present
      if (!onboardingData.companySize || !onboardingData.industry ||
          !onboardingData.companyDescription || !onboardingData.contactPerson || !onboardingData.position ||
          !onboardingData.contactEmail || !onboardingData.companyAddress) {
        throw new Error("Missing required fields. Please complete all steps.");
      }

      console.log("Final submission data:", onboardingData);

      // Attempt to update the employer profile first
      let result = await updateEmployerProfile({
        company_name: onboardingData.companyName!,
        company_size: onboardingData.companySize!,
        industry: onboardingData.industry!,
        company_website: onboardingData.companyWebsite,
        company_description: onboardingData.companyDescription!,
        company_logo_url: onboardingData.companyLogoUrl,
        company_address: onboardingData.companyAddress!,
        contact_person: onboardingData.contactPerson!,
        position: onboardingData.position!,
        contact_email: onboardingData.contactEmail!,
        contact_phone: onboardingData.contactPhone,
      });

      console.log("Result of updateEmployerProfile:", result);

      // If update failed and the error indicates profile not found, attempt to create
      if (!result.success && result.error?.includes("Employer profile not found")) {
        console.log("Employer profile not found during update, attempting creation...");
        result = await createEmployerProfile({
          profile_id: user.id,
          company_name: onboardingData.companyName!,
          company_size: onboardingData.companySize!,
          industry: onboardingData.industry!,
          company_website: onboardingData.companyWebsite,
          company_description: onboardingData.companyDescription!,
          company_logo_url: onboardingData.companyLogoUrl,
          company_address: onboardingData.companyAddress!,
          contact_person: onboardingData.contactPerson!,
          position: onboardingData.position!,
          contact_email: onboardingData.contactEmail!,
          contact_phone: onboardingData.contactPhone,
        });

        console.log("Result of createEmployerProfile:", result);

        if (result.success) {
           // Refresh user to update onboarding status only on successful creation
           await refreshUser();
        }

      } else if (!result.success) {
         // If update failed for another reason, throw the error
         throw new Error(result.error || "Failed to update employer profile");
      }

      // If we reach here, either update or creation was successful
      if (!result.success) {
         // This case should ideally not be reached if the logic is correct,
         // but as a fallback, throw an error if the final result is not successful.
         throw new Error(result.error || "Failed to complete employer profile setup");
      }


      toast({
        title: "Success",
        description: "Your employer profile has been updated successfully!", // Changed message to reflect update
      });

      // Redirect to employer dashboard
      router.push("/employer/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CompanyInfoForm
            onSubmit={handleCompanyInfoSubmit}
            defaultValues={{
              companyWebsite: onboardingData.companyWebsite || "",
              companySize: onboardingData.companySize || "",
              industry: onboardingData.industry || "",
              companyDescription: onboardingData.companyDescription || "",
            }}
            companyName={onboardingData.companyName}
          />
        );
      case 1:
        return (
          <ContactDetailsForm
            onSubmit={handleContactDetailsSubmit}
            defaultValues={{
              contactPerson: onboardingData.contactPerson || "",
              position: onboardingData.position || "",
              contactEmail: onboardingData.contactEmail || "",
              contactPhone: onboardingData.contactPhone || "",
              companyAddress: onboardingData.companyAddress || "",
            }}
          />
        );
      case 2:
        return (
          <LogoUpload
            onUpload={handleLogoUpload}
            onSubmit={handleLogoSubmit}
            defaultLogoUrl={onboardingData.companyLogoUrl}
          />
        );
      case 3:
        return (
          <ReviewForm
            data={onboardingData as EmployerOnboardingData}
            onSubmit={handleFinalSubmit}
            onEdit={setCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen max-w-5xl mx-auto py-10 px-4"> {/* Removed container, added mx-auto and px-4 */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Employer Onboarding</h1>
        <p className="text-muted-foreground">
          Set up your employer profile to start posting jobs and finding talent
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center"> {/* Removed space-x-2 */}
          {steps.map((step, index) => (
            <div key={index} className="flex items-center"> {/* Keep flex on individual step container */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-2 border-primary bg-background text-foreground"
                    : "border-2 border-muted bg-background text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 w-10 ${
                    index < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center">
          <p className="text-sm font-medium">{steps[currentStep]}</p>
        </div>
      </div>

      {/* Form Content */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">{steps[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
    </main>
  );
}

// Dynamically import the client component with SSR disabled
const DynamicEmployerOnboardingPage = dynamic(() => Promise.resolve(EmployerOnboardingComponent), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default DynamicEmployerOnboardingPage;
