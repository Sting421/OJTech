"use client";

import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";

interface ResumePreviewButtonProps {
  fileUrl?: string | null;
  cvId?: string;
  label?: string;
}

export function ResumePreviewButton({ 
  fileUrl, 
  cvId,
  label = "Preview Resume" 
}: ResumePreviewButtonProps) {
  const [loading, setLoading] = useState(false);
  
  const handlePreview = async () => {
    if (!fileUrl) {
      console.error("No file URL available for preview");
      return;
    }
    
    setLoading(true);
    
    try {
      // Open the file URL in a new window
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error("Error opening resume preview:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!fileUrl) {
    return null;
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1"
      onClick={handlePreview}
      disabled={loading}
    >
      <Eye className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
} 