# Software Design Document: Employer Job Management

## 1. Introduction

### 1.1 Purpose
This document provides a detailed technical overview of the Employer Job Management feature in the OJTech platform. It outlines the system architecture, data models, component interactions, and implementation details.

### 1.2 Scope
The Employer Job Management feature allows employers to:
- Create, edit, and delete job postings
- View their job listings with status and application counts
- Filter jobs by status (active, draft, closed)
- View detailed information about each job
- Manage job applications (planned future enhancement)

### 1.3 Definitions
- **Employer**: A registered user with the role "employer" who can post jobs
- **Job**: A job posting with details such as title, description, required skills, etc.
- **Job Application**: A submission by a student/candidate for a specific job

## 2. System Architecture

### 2.1 Overview
The Employer Job Management feature is built using:
- **Next.js App Router**: For the frontend routing and page structure
- **React**: For UI components and state management
- **Supabase**: For database storage and authentication
- **Server Actions**: For handling data operations securely on the server

### 2.2 Component Diagram
```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  UI Components    │────▶│  Server Actions   │────▶│  Supabase Database│
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        ▲                           │                         │
        │                           │                         │
        └───────────────────────────┴─────────────────────────┘
```

### 2.3 Data Flow
1. User interacts with UI components (create/edit/delete jobs)
2. UI components invoke server actions
3. Server actions validate inputs and perform CRUD operations
4. Server actions return responses that update UI state
5. UI reflects the updated state to the user

## 3. Database Design

### 3.1 Jobs Table
```sql
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB,
    skills_required JSONB, -- For backward compatibility
    preferred_skills JSONB,
    salary_range VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    application_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Job Applications Table
```sql
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL,
    student_id UUID NOT NULL,
    cv_id UUID,
    cover_letter TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    employer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 4. Component Details

### 4.1 Server Actions
Located in `/lib/actions/job-actions.ts`, these functions handle all job-related operations:
- `getEmployerJobs`: Fetches all jobs for the current employer
- `createJob`: Creates a new job posting
- `getJobById`: Retrieves a specific job by ID
- `updateJob`: Updates an existing job
- `deleteJob`: Deletes a job posting
- `getPublicJobs`: Retrieves active jobs for student/candidate view

### 4.2 UI Components

#### 4.2.1 JobList Component
Located in `/components/employer/JobList.tsx`:
- Displays a list of jobs with key information
- Provides options to edit and delete jobs
- Shows loading skeletons during data fetching
- Handles job deletion with confirmation

#### 4.2.2 JobForm Component
Located in `/components/employer/jobs/JobForm.tsx`:
- Form for creating and editing jobs
- Handles validation using Zod
- Manages required and preferred skills
- Provides feedback during form submission

### 4.3 Pages

#### 4.3.1 Jobs Dashboard
Located in `/app/employer/jobs/page.tsx`:
- Main dashboard for employers to view all their jobs
- Shows job statistics and counts by status
- Provides filtering by job status
- Links to create new jobs

#### 4.3.2 Job Detail Page
Located in `/app/employer/jobs/[id]/page.tsx`:
- Displays detailed information about a specific job
- Shows required and preferred skills
- Provides actions to edit the job
- Will link to job applications in future enhancements

#### 4.3.3 Create Job Page
Located in `/app/employer/jobs/create/page.tsx`:
- Container for the JobForm component for creating new jobs
- Handles redirection after successful job creation

#### 4.3.4 Edit Job Page
Located in `/app/employer/jobs/[id]/edit/page.tsx`:
- Container for the JobForm component for editing existing jobs
- Fetches job data and passes it to the form
- Handles redirection after successful updates

## 5. Implementation Details

### 5.1 Job Status Management
Jobs can have one of three statuses:
- **Draft**: Jobs that are not yet published and visible only to the employer
- **Active**: Published jobs that are visible to candidates
- **Closed**: Jobs that are no longer accepting applications

### 5.2 Field Backward Compatibility
The implementation handles both `required_skills` and `skills_required` fields for backward compatibility with existing data:
- Both fields are included in the database schema
- Server actions update both fields
- UI components check both fields when displaying skills

### 5.3 Application Count
The job listings show the number of applications for each job:
- Count is retrieved through a GROUP BY query in Supabase
- Displayed in the UI for each job card

### 5.4 Error Handling
The implementation includes robust error handling:
- Input validation using Zod schemas
- Try/catch blocks in server actions
- Toast notifications for success and error states
- Loading indicators during async operations

## 6. Future Enhancements

### 6.1 Applications Management
- View and filter applications for a specific job
- Update application status (pending, reviewed, shortlisted, rejected)
- Add notes to applications

### 6.2 Analytics Dashboard
- Show application statistics
- Display candidate demographics
- Provide insights on job performance

### 6.3 Automated Matching
- Match jobs with student profiles based on skills
- Recommend qualified candidates for jobs
- Suggest skill improvements for better matches

## 7. Conclusion
The Employer Job Management feature provides a comprehensive solution for employers to post and manage job listings on the OJTech platform. It follows best practices for Next.js development and integrates seamlessly with Supabase for data storage and retrieval. The implementation is designed to be scalable and maintainable, with clear separation of concerns and well-defined component responsibilities. 