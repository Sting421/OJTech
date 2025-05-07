"use client";

import { useState, useEffect } from "react";
import { CV } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Trash2, FileText, RotateCcw, AlertCircle } from "lucide-react";
import { 
  getCurrentUserCvVersions, 
  setActiveCvVersion, 
  deleteCv 
} from "@/lib/actions/cv";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { ResumePreviewButton } from "./ResumePreviewButton";

interface CvVersionListProps {
  activeCvId?: string;
  onVersionChange?: () => void;
}

export function CvVersionList({ activeCvId, onVersionChange }: CvVersionListProps) {
  const [cvVersions, setCvVersions] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCvVersions();
  }, []);

  const loadCvVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getCurrentUserCvVersions();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to load CV versions");
      }
      
      setCvVersions(result.data || []);
    } catch (error) {
      console.error("Error loading CV versions:", error);
      setError("Failed to load CV versions. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load CV versions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (cvId: string) => {
    try {
      setActionLoading(cvId);
      
      const result = await setActiveCvVersion(cvId);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to activate CV version");
      }
      
      toast({
        title: "Success",
        description: "CV version activated successfully",
      });
      
      // Refresh the versions list
      await loadCvVersions();
      
      // Notify parent component about the change
      if (onVersionChange) {
        onVersionChange();
      }
    } catch (error) {
      console.error("Error activating CV version:", error);
      toast({
        title: "Error",
        description: "Failed to activate CV version",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteVersion = async (cvId: string) => {
    try {
      setActionLoading(cvId);
      
      const result = await deleteCv(cvId);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete CV version");
      }
      
      toast({
        title: "Success",
        description: "CV version deleted successfully",
      });
      
      // Refresh the versions list
      await loadCvVersions();
      
      // Notify parent component about the change
      if (onVersionChange) {
        onVersionChange();
      }
    } catch (error) {
      console.error("Error deleting CV version:", error);
      toast({
        title: "Error",
        description: "Failed to delete CV version",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Versions</CardTitle>
          <CardDescription>View and manage your resume versions</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Versions</CardTitle>
          <CardDescription>View and manage your resume versions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-destructive gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button onClick={loadCvVersions}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (cvVersions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Versions</CardTitle>
          <CardDescription>No resume versions found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload a resume to get started with version management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Resume Versions</CardTitle>
        <CardDescription>Manage your resume history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cvVersions.map((cv) => (
            <div
              key={cv.id}
              className={`p-4 rounded-lg border ${
                cv.is_active ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    Version {cv.version || "Unknown"}
                  </span>
                  {cv.is_active && (
                    <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ResumePreviewButton
                          fileUrl={cv.file_url}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          showIcon={true}
                          label=""
                        />
                      </TooltipTrigger>
                      <TooltipContent>View resume</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {!cv.is_active && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetActive(cv.id)}
                            disabled={actionLoading === cv.id}
                            className="h-8 w-8"
                          >
                            {actionLoading === cv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set as active</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={actionLoading === cv.id}
                      >
                        {actionLoading === cv.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Resume Version</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete version {cv.version}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="gap-2 sm:justify-start">
                        <DialogClose asChild>
                          <Button variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDeleteVersion(cv.id)}
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Uploaded {formatDate(cv.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 