# Active Context: OJTech

## Current Focus

The project is currently focused on completing the student profile management functionality and preparing for the implementation of job listings and the matching algorithm. The primary areas of active development are:

1. **Student Profile Enhancement**
   - CV uploading and processing
   - Skills extraction from CVs
   - Profile completion indicators
   - Profile optimization suggestions

2. **Job Listings Foundation**
   - Database schema design for job postings
   - UI components for job listings
   - Search and filter functionality
   - Job details view

3. **Authentication Refinement**
   - Improved email verification flow
   - Password reset functionality
   - Social authentication options
   - Role-based access control implementation

## Current Work Focus

We are transitioning the application to use a new database schema with the following tables:

1. **profiles** - Core user profiles table with role distinction
   - Contains basic user information and role (student, employer, admin)
   - Replaces the previous student_profiles table
   - Includes avatar_url for profile photos
   - Tracks onboarding completion with has_completed_onboarding flag
   - Tracks CV upload status with has_uploaded_cv flag

2. **cvs** - Storage for user curriculum vitae
   - Links to user profiles
   - Stores CV file URL (Cloudinary)
   - Contains extracted skills as structured JSON

3. **jobs** - Job listings posted by employers
   - Contains job details and required skills
   - Links to employer profiles

4. **matches** - AI-generated matches between CVs and jobs
   - Contains match score indicating relevance
   - Links CVs and jobs for job recommendations

The migration files have been created with proper dependencies and Row Level Security (RLS) policies to ensure data protection. 

Server actions have also been implemented for:
- Profile management
- CV uploads and management
- Job listings
- CV-Job matching

Upcoming work will focus on UI components to interact with this new schema:
- Profile editing page (enhanced)
- CV upload and management interface
- Job posting interface for employers
- Match visualization for both students and employers

## Recent Changes

### Implemented Features
1. **Authentication System**
   - Email/password authentication with Supabase
   - Email verification flow
   - Protected routes via middleware
   - Login and registration pages

2. **Student Profile Management**
   - Basic profile creation and editing
   - Avatar upload and management with Cloudinary
   - Form validation with React Hook Form and Zod
   - Profile data persistence in Supabase

3. **UI Foundation**
   - Responsive layout with Tailwind CSS
   - Dark/light mode support
   - Navigation structure
   - Toast notification system
   - shadcn/ui component integration

### Technical Changes
1. Configured Supabase client for server-side and client-side usage
2. Set up Cloudinary integration for image and file uploads
3. Established server action pattern for data operations
4. Created standardized response handling for API operations
5. Implemented form validation patterns with Zod schemas

### Authentication Provider Implementation
We've added a centralized authentication provider to improve user state management across the application:

1. **AuthProvider Component**
   - Created a React context provider to manage authentication state
   - Handles user authentication status and profile data
   - Provides signOut and refreshUser functionality
   - Automatically fetches and updates profile information
   - Uses a single Supabase client instance to prevent warnings

2. **Auth Integration**
   - Updated the Navbar to use the AuthProvider
   - Enhanced Profile page to leverage auth context data
   - Improved avatar display in navigation
   - Added proper loading states for auth-dependent components

3. **refreshUser Function**
   - Core mechanism for updating the user's authentication state
   - Fetches the latest user data from Supabase Auth
   - Ensures a user profile exists through the ensureProfile function
   - Used throughout the app to refresh user state after critical operations
   - Particularly important during onboarding to reflect completion status

4. **Profile Creation Safeguards**
   - Multiple points of profile creation to ensure data consistency:
     - During registration with createUserProfile
     - In auth callback route for email verification
     - In AuthProvider via ensureProfile when user data is loaded
   - Checks for existing profiles before creating new ones
   - Ensures consistent user experience across different auth flows

This implementation brings several benefits:
- Reduces duplicate Supabase authentication code across components
- Ensures consistent user state throughout the application
- Provides easy access to both auth user and profile data
- Improves performance by centralizing auth state changes

### Onboarding Process and Status Tracking

The onboarding process has been implemented with a multi-step flow and careful tracking of completion status:

1. **Onboarding Flag in Database**
   - Added has_completed_onboarding boolean column to profiles table (default: FALSE)
   - Added has_uploaded_cv boolean column to profiles table (default: FALSE)
   - These flags determine whether a user has completed the required onboarding steps
   - Added database trigger to ensure flag consistency (has_uploaded_cv = TRUE → has_completed_onboarding = TRUE)

2. **Profile-Student Profile Synchronization**
   - Two tables track user information: profiles and student_profiles
   - The updateStudentProfile function syncs data between tables and always sets has_completed_onboarding to true
   - The updateProfile function handles updates to the profiles table and includes sync logic for student_profiles
   - This ensures data consistency regardless of which update function is called

3. **Critical Onboarding Steps**
   - During CV upload in onboarding, explicit updates to has_uploaded_cv and has_completed_onboarding
   - Multiple retry attempts (up to 3) with error handling for this critical update
   - During GitHub profile save, update to has_completed_onboarding flag
   - Even when skipping GitHub step, the has_completed_onboarding flag is still set to true

4. **Refresh Mechanism**
   - After critical onboarding steps, refreshUser() is called to update the local auth state
   - This ensures the UI reflects the latest onboarding status after each step
   - Additional refresh calls after completion to ensure consistency

5. **Flag Consistency Safeguards**
   - Database-level trigger ensures has_completed_onboarding is TRUE whenever has_uploaded_cv is TRUE
   - Auth provider checks for inconsistent flag states during profile fetch
   - Automatic flag correction in background when inconsistencies are detected
   - Onboarding page checks for either flag (has_completed_onboarding OR has_uploaded_cv)

### Database Schema Implementation
1. **profiles** - Core user profiles table with role distinction
   - Contains basic user information and role (student, employer, admin)
   - Replaces the previous student_profiles table
   - Includes avatar_url for profile photos

2. **cvs** - Storage for user curriculum vitae
   - Links to user profiles
   - Stores CV file URL (Cloudinary)
   - Contains extracted skills as structured JSON

3. **jobs** - Job listings posted by employers
   - Contains job details and required skills
   - Links to employer profiles

4. **matches** - AI-generated matches between CVs and jobs
   - Contains match score indicating relevance
   - Links CVs and jobs for job recommendations

## Next Steps

### Immediate Priorities (1-2 Weeks)
1. Complete CV upload functionality with Cloudinary integration
2. Implement AI-based skills extraction from CVs
3. Create job posting data models and server actions
4. Develop job listing and search interface
5. Enhance profile completion guidance for students

### Short-Term Goals (1-2 Months)
1. Build the AI-powered job matching algorithm
2. Develop the employer portal for posting opportunities
3. Implement application tracking system
4. Create notification system for application updates
5. Add analytics dashboard for user activity

### Long-Term Goals (3+ Months)
1. Implement administrator dashboard
2. Add reporting and analytics features
3. Develop feedback and rating system
4. Create mobile-responsive views for all features
5. Optimize performance and scalability

## Active Decisions and Considerations

### Technical Decisions Under Consideration
1. **AI Provider Selection**
   - Evaluating OpenAI vs. Google Gemini for CV analysis and job matching
   - Considering cost, accuracy, and integration complexity
   - Need to determine whether to use embeddings or completion APIs

2. **File Processing Approach**
   - Determining whether to process CVs on client or server side
   - Evaluating PDF extraction libraries for text extraction
   - Considering privacy implications of CV processing

3. **Real-time Features**
   - Assessing need for real-time notifications
   - Evaluating Supabase Realtime vs. alternative solutions
   - Considering implementation complexity vs. user benefit

### Design Considerations
1. **Job Matching UX**
   - Determining how to present match scores and recommendations
   - Designing intuitive job search and filter interfaces
   - Creating visual indicators for match quality

2. **Profile Completion Guidance**
   - Developing profile strength indicators
   - Designing actionable improvement suggestions
   - Creating intuitive CV upload and management interface

3. **Application Tracking**
   - Designing status visualization for applications
   - Creating interaction points for application updates
   - Developing notification strategy for status changes

### Open Questions
1. How to effectively extract and standardize skills from diverse CV formats?
2. What metrics should be used to determine job-candidate match quality?
3. How to handle privacy concerns with AI processing of personal data?
4. What level of customization should employers have for job postings?
5. How to implement effective verification for employer accounts?

### New User Onboarding Flow
We've implemented a guided onboarding flow for new users:

1. **Registration Process**
   - User registers with email/password or GitHub OAuth
   - Backend creates a basic profile record on sign-up
   - User is redirected to onboarding flow after email verification

2. **Onboarding Screens**
   - Welcome screen with instructions
   - CV upload step (required to proceed)
   - GitHub profile collection (auto-populated for GitHub OAuth users)
   - Completion screen directing to profile

3. **Technical Implementation**
   - Multi-step form with progress tracking
   - CV validation and Cloudinary upload
   - Automatic GitHub profile detection
   - Auth callback routing logic for redirections
   - Robust status tracking with has_completed_onboarding flag
   - Multiple refresh points to ensure state consistency
   - Smart redirection that checks onboarding completion status before redirecting

This implementation ensures all students have a CV uploaded before they can use the platform fully, improving match quality between students and opportunities.

### Authentication Flow Improvements

We've enhanced the authentication flow to provide a better user experience:

1. **Smarter Redirection Logic**
   - Auth callback now checks if onboarding is already completed before redirecting
   - Middleware prevents unnecessary onboarding redirects for users who've already completed it
   - Multiple status flags (has_completed_onboarding OR has_uploaded_cv) are checked
   - Background fixes for flag inconsistencies without disrupting user flow

2. **Login Process Optimization**
   - Users are directed to homepage after login instead of onboarding if they've already completed it
   - Middleware intelligently checks profile status before allowing access to onboarding
   - Multiple data consistency checks throughout the authentication process

3. **Flag Consistency Mechanism**
   - Database trigger ensures has_completed_onboarding is set when has_uploaded_cv is true
   - Client-side checks correct flag inconsistencies in the background
   - Flag updates synchronize between profiles and student_profiles tables

These improvements ensure that returning users have a streamlined experience without being forced through onboarding multiple times, while new users are still properly guided through the required steps. 