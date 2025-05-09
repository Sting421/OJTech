"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, File, X } from "lucide-react";
import { Button } from "./button";

interface FileDropInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onRemove?: () => void;
}

const FileDropInput = React.forwardRef<HTMLInputElement, FileDropInputProps>(
  ({ className, onFileSelect, selectedFile, onRemove, ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    };

    const handleClick = () => {
      inputRef.current?.click();
    };

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:bg-muted/50",
            className
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            {...props}
          />
          
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <File className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering file selection
                      onRemove();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Click or drag & drop your file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF or Word files, up to 10MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

FileDropInput.displayName = "FileDropInput";

export { FileDropInput }; 