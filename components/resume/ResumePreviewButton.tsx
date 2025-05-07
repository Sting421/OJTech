"use client";

import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ResumePreviewButtonProps {
  fileUrl?: string | null;
  cvId?: string;
  label?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

export function ResumePreviewButton({ 
  fileUrl, 
  cvId,
  label = "Preview Resume",
  variant = "outline",
  size = "sm",
  className = "",
  showIcon = true
}: ResumePreviewButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handlePreview = async () => {
    // If we have a direct fileUrl, use it
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      return;
    }
    
    // Otherwise, if we have a cvId, show a message since we can't preview without a file_url
    if (cvId) {
      toast({
        title: "CV Preview Unavailable",
        description: "Direct CV preview is not available. Please download and view the file locally.",
        variant: "default",
      });
      return;
    }
    
    // If neither fileUrl nor cvId is provided
    toast({
      title: "Error",
      description: "No CV information available for preview",
      variant: "destructive",
    });
  };
  
  // If neither fileUrl nor cvId is provided, don't render the button
  if (!fileUrl && !cvId) {
    return null;
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={`${showIcon ? "flex items-center gap-1" : ""} ${className}`}
      onClick={handlePreview}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        <Eye className="h-4 w-4" />
      ) : null}
      {label && <span>{label}</span>}
    </Button>
  );
} 