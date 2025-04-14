# CV Upload Feature Implementation Plan

## Feature Overview
Implement a complete CV upload functionality for student profiles, allowing users to upload, view, and replace CV documents. This feature will support PDF file formats, validate uploads, store files in Cloudinary, and update the student profile with the CV URL.

## User Stories
1. As a student, I want to upload my CV in PDF format so that employers can view my qualifications
2. As a student, I want to see my currently uploaded CV so that I know which document is visible to employers
3. As a student, I want to replace my CV if needed so that I can keep my information updated
4. As a student, I want to receive feedback if my upload fails so that I can address any issues

## Implementation Requirements

### Frontend Requirements
1. CV upload area in the profile form with:
   - File input for PDF selection
   - Drag-and-drop support
   - Visual indication of upload status
   - Display of current CV filename if uploaded
   - Replace CV option
   - View CV option (if uploaded)
   - Validation feedback for file type and size

2. UI Components:
   - Enhanced file input component (styled according to system UI)
   - Progress indicator for upload process
   - Toast notifications for success/error feedback
   - Status badge for CV upload status

### Backend Requirements
1. Extend student profile data model for CV tracking:
   - CV URL field (already exists in database schema)
   - CV filename field (may need to be added)
   - CV upload timestamp
   - CV validation status

2. Server Actions:
   - Update upload functionality to handle PDF files
   - Validate file type and size before upload
   - Store CV in Cloudinary with appropriate folder structure
   - Update student profile with CV information

### File Handling Logic
1. Frontend validation:
   - Accept only PDF file formats
   - Limit file size to 5MB
   - Provide user feedback for invalid files

2. Upload process:
   - Convert file to base64 format
   - Send to server action for processing
   - Upload to Cloudinary with appropriate tags
   - Store URL and metadata in database

3. Retrieval process:
   - Fetch CV URL from student profile
   - Generate secure temporary URL if needed
   - Provide view/download options

## Technical Implementation Steps

### 1. Update Student Profile Type
```typescript
// Update in lib/types/student.ts
export interface StudentProfile {
  // Existing fields...
  cv_url: string | null;
  cv_filename: string | null; // Add this field
  cv_uploaded_at: string | null; // Add this field
}
```

### 2. Update Database Schema
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS cv_filename TEXT,
ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMP WITH TIME ZONE;
```

### 3. Enhance File Upload Utilities
```typescript
// Enhance lib/utils/upload-helper.ts
export function validatePDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
```

### 4. Update Cloudinary Upload Action
```typescript
// Enhance lib/actions/upload.ts
export async function uploadFileToCloudinary(
  base64Data: string,
  folder: string,
  options?: {
    fileName?: string;
    fileType?: string;
    tags?: string[];
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Implementation details...
}
```

### 5. Create CV Upload Component
```tsx
// New component: components/profile/CVUploadSection.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validatePDFFile, validateFileSize } from "@/lib/utils/upload-helper";

interface CVUploadSectionProps {
  currentCvUrl: string | null;
  currentCvFilename: string | null;
  onFileSelected: (file: File | null) => void;
}

export function CVUploadSection({
  currentCvUrl,
  currentCvFilename,
  onFileSelected,
}: CVUploadSectionProps) {
  // Implementation details...
}
```

### 6. Update Profile Page
```tsx
// Enhance app/profile/page.tsx
// Add CV upload section to the form
// Update form data state to include CV fields
// Update form submission logic to handle CV upload
```

### 7. Update Profile Server Actions
```typescript
// Enhance lib/actions/student-profile.ts
// Update the student profile update action to handle CV URL
```

## Testing Strategy
1. Unit tests:
   - File validation functions
   - Cloudinary upload function
   - Server actions error handling

2. Integration tests:
   - End-to-end upload process
   - Database updates

3. Manual testing:
   - Upload valid PDF file
   - Attempt upload of invalid file format
   - Attempt upload of oversized file
   - Replace existing CV
   - View uploaded CV

## Implementation Phases
1. **Phase 1**: Backend updates
   - Update database schema
   - Enhance file upload utilities
   - Update Cloudinary upload action

2. **Phase 2**: Frontend components
   - Create CV upload component
   - Integrate with profile page

3. **Phase 3**: Testing and refinement
   - Test all functionality
   - Address edge cases
   - Optimize performance

## Estimated Timeline
- Backend updates: 1 day
- Frontend components: 2 days
- Testing and refinement: 1 day
- Total: 4 days

## Success Criteria
- Students can upload PDF CVs up to 5MB
- Uploaded CVs are stored securely and linked to student profiles
- Students can view, replace, and manage their uploaded CVs
- Clear feedback is provided throughout the upload process
- The system validates file types and sizes before upload 