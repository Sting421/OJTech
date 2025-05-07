"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface LogoUploadProps {
  onUpload: (file: File) => Promise<string>;
  onSubmit: (logoUrl: string) => Promise<void>;
  defaultLogoUrl?: string;
}

export default function LogoUpload({ onUpload, onSubmit, defaultLogoUrl }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPG, PNG, SVG, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("File size exceeds 5MB limit");
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUpload(file);
      setLogoUrl(url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async () => {
    if (!logoUrl) {
      alert("Please upload a company logo first");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(logoUrl);
    } catch (error) {
      console.error("Error saving logo:", error);
      alert("Failed to save logo. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Upload Your Company Logo</h3>
        <p className="text-sm text-muted-foreground">
          Your logo will be displayed on your job postings and company profile
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        {logoUrl ? (
          <Card className="relative w-48 h-48 overflow-hidden">
            <CardContent className="p-0">
              {logoUrl.endsWith('.svg') ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image 
                  src={logoUrl}
                  alt="Company Logo"
                  width={192}
                  height={192}
                  className="w-full h-full object-contain"
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={handleRemoveLogo}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="w-48 h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-6">
              {isUploading ? (
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to upload your company logo
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/jpeg,image/png,image/svg+xml,image/webp"
        />

        {!logoUrl && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            type="button"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </>
            )}
          </Button>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!logoUrl || isUploading || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
