"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadFileToCloudinary } from "@/lib/actions/upload";
import { readFileAsBase64, validateFileSize, validateImageFile, validatePDFFile } from "@/lib/utils/upload-helper";
import { createStudentProfile, updateStudentProfile, getStudentProfileBySchoolEmail } from "@/lib/actions/student-profile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries, philippineRegions, philippineCities, philippinePostalCodes } from "@/lib/constants/locations";

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availablePostalCodes, setAvailablePostalCodes] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    university: "",
    course: "",
    yearLevel: "",
    bio: "",
    githubLink: "",
    cv: null as File | null,
    // Contact Information
    schoolEmail: "",
    personalEmail: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "Philippines",
    avatar: null as File | null,
  });

  // Update available cities when region changes
  useEffect(() => {
    if (formData.region && formData.region in philippineCities) {
      setAvailableCities([...philippineCities[formData.region as keyof typeof philippineCities]]);
    } else {
      setAvailableCities([]);
    }
  }, [formData.region]);

  // Update available postal codes when city changes
  useEffect(() => {
    if (formData.city && formData.city in philippinePostalCodes) {
      setAvailablePostalCodes([...philippinePostalCodes[formData.city as keyof typeof philippinePostalCodes]]);
    } else {
      setAvailablePostalCodes([]);
    }
  }, [formData.city]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Error",
            description: "Please sign in to view your profile",
            variant: "destructive",
          });
          return;
        }

        setUserId(user.id);

          const { data: sessionData } = await supabase.auth.getSession();
          const email = sessionData.session?.user?.email;
          if (!email) {
            throw new Error("No authenticated user found");
          }

          const result = await getStudentProfileBySchoolEmail(email);
          
          if (!result.success) {
            // Create new profile if doesn't exist
            await createStudentProfile({
              full_name: "",
              university: "",
              course: "",
              year_level: 1,
              bio: "",
              github_profile: "",
              school_email: email,
              personal_email: null,
              phone_number: null,
              country: "Philippines",
              region_province: null,
              city: null,
              postal_code: null,
              street_address: null,
              photo_url: null,
              cv_url: null
            });
          } else if (result.data) {
            const profile = result.data!;
            setFormData({
              fullName: profile.full_name || "",
              university: profile.university || "",
              course: profile.course || "",
              yearLevel: profile.year_level?.toString() || "1",
              bio: profile.bio || "",
              githubLink: profile.github_profile || "",
              cv: null,
              schoolEmail: profile.school_email || "",
              personalEmail: profile.personal_email || "",
              phoneNumber: profile.phone_number || "",
              streetAddress: profile.street_address || "",
              city: profile.city || "",
              region: profile.region_province || "",
              postalCode: profile.postal_code || "",
              country: profile.country || "Philippines",
              avatar: null,
            });

            if (profile.photo_url) {
              setAvatarUrl(profile.photo_url);
            }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [toast, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const inputId = e.target.id;

      if (inputId === 'avatar') {
        setFormData(prev => ({ ...prev, avatar: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (inputId === 'cv') {
        setFormData(prev => ({ ...prev, cv: file }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoUrl = avatarUrl;
      let cvUrl = null;

      try {
        if (formData.avatar) {
          if (!validateImageFile(formData.avatar)) {
            toast({
              title: "Error",
              description: "Please upload a valid image file (JPEG, PNG, or GIF)",
              variant: "destructive",
            });
            return;
          }

          if (!validateFileSize(formData.avatar, 5)) {
            toast({
              title: "Error",
              description: "Profile photo must be less than 5MB",
              variant: "destructive",
            });
            return;
          }

          const base64Data = await readFileAsBase64(formData.avatar);
          const uploadResult = await uploadFileToCloudinary(base64Data, 'profile-photos');
          if (!uploadResult.success) throw new Error(uploadResult.error);
          if (!uploadResult.data) throw new Error('Upload failed: No data returned');
          photoUrl = uploadResult.data.secure_url;
        }

        if (formData.cv) {
          if (!validatePDFFile(formData.cv)) {
            toast({
              title: "Error",
              description: "Please upload a valid PDF file",
              variant: "destructive",
            });
            return;
          }

          if (!validateFileSize(formData.cv, 10)) {
            toast({
              title: "Error",
              description: "CV must be less than 10MB",
              variant: "destructive",
            });
            return;
          }

          const base64Data = await readFileAsBase64(formData.cv);
          const uploadResult = await uploadFileToCloudinary(base64Data, 'cvs');
          if (!uploadResult.success) throw new Error(uploadResult.error);
          if (!uploadResult.data) throw new Error('Upload failed: No data returned');
          cvUrl = uploadResult.data.secure_url;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;
      if (!email) throw new Error("No authenticated user found");

      const result = await updateStudentProfile(userId!, {
        full_name: formData.fullName,
        university: formData.university,
        course: formData.course,
        year_level: parseInt(formData.yearLevel),
        bio: formData.bio,
        github_profile: formData.githubLink,
        school_email: email,
        personal_email: formData.personalEmail || null,
        phone_number: formData.phoneNumber || null,
        street_address: formData.streetAddress || null,
        city: formData.city || null,
        region_province: formData.region || null,
        postal_code: formData.postalCode || null,
        country: formData.country,
        photo_url: photoUrl,
        cv_url: cvUrl,
      });

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Student Profile</h1>
        
        <Card className="max-w-5xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4 mb-8">
              <Avatar className="w-32 h-32">
                <AvatarImage src={avatarUrl || ""} />
                <AvatarFallback>{formData.fullName?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label
                  htmlFor="avatar"
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Upload Photo
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      value={formData.university}
                      onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      value={formData.course}
                      onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="yearLevel">Year Level</Label>
                    <Input
                      id="yearLevel"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.yearLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      className="h-32"
                    />
                  </div>

                  <div>
                    <Label htmlFor="githubLink">GitHub Profile Link</Label>
                    <Input
                      id="githubLink"
                      type="url"
                      placeholder="https://github.com/yourusername"
                      value={formData.githubLink}
                      onChange={(e) => setFormData(prev => ({ ...prev, githubLink: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Contact Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="schoolEmail">School Email</Label>
                    <Input
                      id="schoolEmail"
                      type="email"
                      value={formData.schoolEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolEmail: e.target.value }))}
                      placeholder="your.name@school.edu"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="personalEmail">Personal Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, personalEmail: e.target.value }))}
                      placeholder="your.name@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+63 XXX XXX XXXX"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Address Information</h3>
                    
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="region">Region/Province</Label>
                      <Select
                        value={formData.region}
                        onValueChange={(value) => {
                          setFormData(prev => ({
                            ...prev,
                            region: value,
                            city: "", // Reset city when region changes
                            postalCode: "", // Reset postal code when region changes
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {philippineRegions.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="Enter postal code"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="streetAddress">Street Address</Label>
                      <Textarea
                        id="streetAddress"
                        value={formData.streetAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
                        placeholder="Enter your street address"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cv">Upload CV (PDF)</Label>
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-8" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
