# Employer Portal Development Plan

## Overview

This document outlines the development plan for the Employer Portal in OJTech, focusing on admin-based employer creation and comprehensive employer onboarding. The employer portal will enable companies to post jobs, view matched candidates, and manage applications.

## Core Features

1. Admin-Based Employer Creation
2. Employer Onboarding
3. Job Posting Management
4. Candidate Discovery & Management
5. Application Tracking

## Database Schema

### Tables

```sql
-- Employers table
CREATE TABLE employers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id),  -- Link to auth profile
    company_name TEXT NOT NULL,
    company_size TEXT NOT NULL,               -- e.g., '1-10', '11-50', '51-200', etc.
    industry TEXT NOT NULL,
    company_website TEXT,
    company_description TEXT,
    company_logo_url TEXT,
    company_address TEXT NOT NULL,
    contact_person TEXT NOT NULL,             -- Name of primary contact
    position TEXT NOT NULL,                   -- Position of contact person
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    verified BOOLEAN DEFAULT false,           -- Set to true by admin
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID REFERENCES employers(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB NOT NULL,          -- Array of required skills
    preferred_skills JSONB,                  -- Array of preferred skills
    job_type TEXT NOT NULL,                  -- 'Full-time', 'Part-time', 'Internship'
    location TEXT NOT NULL,
    salary_range JSONB,                      -- { "min": number, "max": number }
    status TEXT DEFAULT 'draft',             -- 'draft', 'active', 'closed', 'filled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications table
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id),
    student_profile_id UUID REFERENCES student_profiles(id),
    cv_id UUID REFERENCES cvs(id),
    cover_letter TEXT,
    status TEXT DEFAULT 'pending',           -- 'pending', 'reviewed', 'shortlisted', 'rejected'
    employer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development Phases

### Phase 1: Admin Employer Creation & Onboarding

#### Step 1.1: Database Setup
- Create SQL migrations for the above tables
- Implement RLS policies for employer access
- Create server actions for employer management

#### Step 1.2: Admin Employer Creation Interface
- Create admin form for adding new employers
- Implement email invitation system
- Create employer verification workflow

```typescript
// /lib/actions/admin/employer.ts
export async function createEmployer({
  email,
  companyName,
  ...employerData
}: CreateEmployerInput): Promise<ApiResponse<Employer>> {
  try {
    // 1. Create Supabase auth user with employer role
    // 2. Create employer profile
    // 3. Send invitation email
    // 4. Return success response
  } catch (error) {
    return { success: false, error: 'Failed to create employer' };
  }
}
```

#### Step 1.3: Employer Onboarding Flow
- Create multi-step onboarding form:
  1. Company Information
  2. Contact Details
  3. Industry & Company Size
  4. Logo Upload
  5. Company Description
  6. Review & Submit

```typescript
// /app/onboarding/employer/page.tsx
// Multi-step form using react-hook-form and zod for validation

const steps = [
  {
    id: 'company',
    fields: ['companyName', 'industry', 'companySize', 'companyWebsite']
  },
  {
    id: 'contact',
    fields: ['contactPerson', 'position', 'contactEmail', 'contactPhone']
  },
  // ... other steps
];
```

### Phase 2: Job Posting Management

#### Step 2.1: Job Creation
- Create job posting form with:
  - Basic details (title, description)
  - Skills selection (required/preferred)
  - Job type and location
  - Salary range
  - Preview and publish options

#### Step 2.2: Job Management
- Job listing dashboard
- Edit/Update functionality
- Status management (draft/active/closed)
- Duplicate job posting feature

### Phase 3: Candidate Discovery

#### Step 3.1: AI-Powered Matching
- Implement skill-based matching algorithm
- Create candidate discovery interface
- Add filtering and sorting options

#### Step 3.2: Candidate Management
- View matched candidates
- Access student profiles and CVs
- Save candidates to shortlist
- Export candidate lists

### Phase 4: Application Management

#### Step 4.1: Application Tracking
- Create application dashboard
- Implement status management
- Add notes and feedback system

#### Step 4.2: Communication
- Email notifications for status changes
- Basic messaging system for clarifications
- Bulk actions for applications

## UI Components Structure

```
components/
  employer/
    onboarding/
      CompanyInfoForm.tsx
      ContactDetailsForm.tsx
      IndustryForm.tsx
      LogoUpload.tsx
      ReviewForm.tsx
    jobs/
      JobForm.tsx
      JobList.tsx
      JobCard.tsx
    candidates/
      CandidateList.tsx
      CandidateCard.tsx
      MatchScore.tsx
    applications/
      ApplicationList.tsx
      ApplicationStatus.tsx
      ApplicationNotes.tsx
```

## Routes Structure

```
app/
  employer/
    onboarding/
      page.tsx
      layout.tsx
    dashboard/
      page.tsx
    jobs/
      page.tsx
      create/
        page.tsx
      [jobId]/
        edit/
          page.tsx
        candidates/
          page.tsx
        applications/
          page.tsx
    candidates/
      page.tsx
      [candidateId]/
        page.tsx
    applications/
      page.tsx
```

## Security Considerations

1. RLS Policies
```sql
-- Employers can only view their own data
CREATE POLICY "Employers can view own data"
ON public.employers
FOR SELECT
USING (auth.uid() = profile_id);

-- Employers can only create/edit their own jobs
CREATE POLICY "Employers can manage own jobs"
ON public.jobs
USING (employer_id IN (
  SELECT id FROM employers 
  WHERE profile_id = auth.uid()
));
```

2. Access Control
- Verify employer status before allowing access to features
- Implement role-based middleware
- Validate all data modifications server-side

## Next Steps

1. Begin with database migrations
2. Implement admin employer creation
3. Build onboarding flow
4. Add job posting functionality
5. Develop candidate matching
6. Create application management

## Success Metrics

- Employer onboarding completion rate
- Job posting activity
- Candidate match quality
- Application response time
- Employer satisfaction rating

## Documentation Updates

After implementation, update:
- `systemPatterns.md` with employer-specific patterns
- `activeContext.md` with current employer portal status
- `progress.md` with completed features
- Create new `employer-features.md` for detailed documentation 