# CV Data Flow Documentation

This document provides a comprehensive overview of how CV (resume) data is handled within the OJTech platform, from initial upload through processing, storage, and retrieval.

## Upload Process

There are two main entry points for CV uploads in the application:

1. **Profile Management** (`app/profile/page.tsx`)
   - Users can upload/update their CV from their profile page
   - The `handleFileUpload` function validates file type (PDF only) and size
   - Converts the file to Base64 for transmission
   - Calls the `uploadAndParseCV` function

2. **Onboarding Flow** (`app/onboarding/page.tsx`)
   - New users can upload their CV during the onboarding process
   - The `handleCvUpload` function performs similar validation
   - Also converts to Base64 and calls `uploadAndParseCV`

## Processing Pipeline

The CV processing pipeline consists of several steps:

1. **Initial Upload** (`lib/actions/resume-parser.ts`)
   - The `uploadAndParseCV` function serves as the main entry point
   - It handles the file upload to Cloudinary via `uploadAndCreateCv`
   - Extracts GitHub profile information if available
   - Creates a CV record in the database
   - Updates the user's profile with CV URL and GitHub info

2. **File Storage** (`lib/actions/cv.ts`)
   - The `uploadAndCreateCv` function uploads the file to Cloudinary
   - Generates a unique identifier for the file
   - Returns the URL for the uploaded file

3. **Skills Extraction** (Asynchronous)
   - After upload, the system asynchronously processes the CV for skills extraction
   - This appears to use AI-powered analysis (specific implementation details need further investigation)
   - Extracted skills are stored in the CV record

4. **Resume Analysis** (`lib/actions/resume-analyzer.ts`)
   - After upload and skills extraction, the resume can be analyzed for quality
   - The `analyzeResume` function uses Google's Gemini AI to evaluate the CV
   - Analysis generates suggestions, strengths, and weaknesses
   - Results are stored in the `analysis_results` field of the CV record

## Data Structure

The CV data is stored with the following structure (`lib/types/database.ts`):

```typescript
interface CV {
  id: string;
  user_id: string;
  file_url: string;
  skills: Record<string, any> | null;
  upload_date: string;
  created_at: string;
  version?: number;
  is_active?: boolean;
  analysis_results?: Record<string, any> | null;
  last_analyzed_at?: string;
  updated_at?: string;
}
```

Key fields:
- `id`: Unique identifier for the CV record
- `user_id`: References the user who owns the CV
- `file_url`: Cloudinary URL where the actual PDF is stored
- `skills`: JSON object containing extracted skills (populated asynchronously)
- `upload_date`: When the CV was uploaded
- `created_at`: Database record creation timestamp
- `version`: Version number of the CV, increments with each new upload for the same user
- `is_active`: Whether this CV version is the currently active one
- `analysis_results`: AI-generated analysis results including suggestions, strengths, and weaknesses
- `last_analyzed_at`: Timestamp of when the resume was last analyzed
- `updated_at`: Timestamp of the last update

### Database Schema

The CV data is stored in a dedicated `cvs` table in Supabase with the following schema (from migration files):

```sql
CREATE TABLE cvs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    file_url TEXT NOT NULL,
    extracted_skills JSONB,
    skills JSONB,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    analysis_results JSONB,
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

The schema includes several key features:

1. **UUID Generation**: Using `uuid_generate_v4()` for unique identifiers
2. **Foreign Key Relationships**: CV records are linked to user profiles
3. **JSONB Storage**: For flexible storage of skills and analysis data
4. **Versioning Support**: The `version` and `is_active` fields enable CV versioning
5. **Automatic Timestamps**: `created_at` and `updated_at` are automatically managed

In addition, CV data is also integrated with user profiles:

1. **Profile Integration**: The `student_profiles` table includes a `cv_url` column
2. **Structured Data**: A `cv_data` JSONB column in the `profiles` table stores structured data extracted from CVs

### Database Indexes

For performance optimization, several indexes have been created:

```sql
CREATE INDEX idx_cvs_user_id ON cvs(user_id);
CREATE INDEX idx_cvs_extracted_skills ON cvs USING GIN (extracted_skills);
CREATE INDEX idx_cvs_skills ON cvs USING GIN (skills);
CREATE INDEX idx_cvs_is_active ON cvs(user_id, is_active);
```

These indexes enable efficient queries for:
- Finding CVs by user ID
- Searching within extracted skills (using GIN index for JSONB data)
- Finding the active CV version for a particular user

### Consistency Management

Database triggers ensure data consistency:

1. **Single Active CV**: The `ensure_single_active_cv` trigger ensures only one active CV per user
2. **Updated Timestamp**: The `update_updated_at_column` trigger automatically updates the `updated_at` timestamp
3. **Version Control**: The `get_next_cv_version` function generates sequential version numbers

## Retrieval Methods

CV data can be retrieved using the following methods:

1. **By ID** (`lib/actions/cv.ts`)
   - The `getCvById` function retrieves a specific CV by its unique ID
   - Returns standardized `ApiResponse<CV>` object

2. **Indirect Retrieval**
   - CV data may also be retrieved as part of user profile information
   - This allows for display of CV data in various parts of the application

3. **Resume Analysis Retrieval** (`lib/actions/resume-analyzer.ts`)
   - `getCurrentUserResumeAnalysis`: Gets analysis for the current authenticated user
   - `getResumeAnalysis`: Gets existing analysis for a specified user
   - Both return standardized `ApiResponse` objects with analysis data

## AI-Powered Resume Analysis

The system provides AI-based resume analysis through the Google Gemini API:

1. **Analysis Process**
   - The `analyzeResume` function in `lib/actions/resume-analyzer.ts` handles analysis
   - Analysis uses the Google Gemini model (specifically "gemini-2.0-flash")
   - Input data comes from the CV's extracted skills
   - Analysis has a timeout of 30 seconds to ensure responsiveness

2. **Analysis Output**
   - The analysis produces three key sections:
     - Suggestions: 5-7 actionable improvements
     - Strengths: 3-5 key strengths of the resume
     - Weaknesses: 3-5 areas needing improvement
   - Results are stored in the `analysis_results` field of the CV record
   - A timestamp is saved in `last_analyzed_at`

3. **Analysis Management**
   - Analysis is created on demand via `getCurrentUserResumeAnalysis`
   - Automatic checks determine if a new analysis is needed:
     - If CV has never been analyzed
     - If CV has been updated since last analysis
   - Force refresh option allows explicit request for new analysis

4. **Frontend Integration**
   - The `ResumeTips` component in `components/resume/ResumeTips.tsx` displays analysis
   - Analysis is loaded when the component mounts
   - Refresh functionality allows users to request new analysis
   - Loading states and error handling provide a smooth user experience

## Error Handling

The CV processing system implements robust error handling:

1. **Standardized Response Format**
   - All functions return an `ApiResponse<T>` object with structure:
   ```typescript
   { success: boolean, data?: T, error?: string }
   ```

2. **Error Logging**
   - Errors are logged to the console with detailed information
   - This facilitates debugging and error tracking

3. **User Feedback**
   - Toast notifications inform users of success/failure
   - Specific error messages guide users on resolving issues

4. **Timeout Handling**
   - AI operations implement timeouts to prevent long-running processes
   - Appropriate error messages are returned for various failure types:
     - Service timeouts
     - API unavailability
     - Missing CV data
     - Parsing errors

## Security Considerations

Several security measures are implemented:

1. **File Validation**
   - Only PDF files are accepted
   - File size limits are enforced

2. **Access Control**
   - CV data is associated with specific user IDs
   - Only authorized users can access their own CV data

3. **Secure Storage**
   - Files are stored in Cloudinary with secure URLs
   - Metadata is stored in Supabase with proper access controls

4. **API Key Protection**
   - Gemini API keys are server-side only
   - No API credentials are exposed to clients

## Implementation Notes

1. **Server Actions Pattern**
   - CV processing uses server actions rather than API routes
   - This follows the project's established pattern for data operations

2. **Hybrid Processing**
   - Initial upload and basic processing occurs synchronously
   - More intensive processing (skills extraction) happens asynchronously
   - Analysis is performed on-demand with smart caching

3. **Error Handling Strategy**
   - Try/catch blocks consistently used in all server actions
   - Standardized response objects maintain consistent API contract

4. **File Handling**
   - Base64 encoding used for file transmission
   - Cloudinary used for secure file storage and retrieval

5. **Database Schema Evolution**
   - The schema has evolved through several migrations
   - Initial creation: Basic CV storage and skills extraction
   - Added version control: Supporting multiple versions of CVs per user
   - Added analysis results: Supporting AI-powered resume analysis
   - Profile integration: Adding CV data to user profiles for easier access

## Future Considerations

Based on the current implementation, several areas might benefit from further development:

1. **Enhanced Skills Extraction**
   - The current AI-powered skills extraction might be improved for accuracy
   - Consider additional metadata extraction (education, experience, etc.)

2. **CV Versioning**
   - Supporting multiple versions of user CVs could provide value
   - Historical tracking of skills development over time

3. **Performance Optimization**
   - Handling large CV files efficiently
   - Optimizing the asynchronous processing pipeline

4. **Integration with Job Matching**
   - Tighter integration between CV data and job matching algorithms
   - Improved relevance scoring based on extracted skills 

5. **Analysis Improvements**
   - More detailed resume analysis with specific section feedback
   - Comparative analysis against industry benchmarks
   - Optimizing AI prompts for more targeted advice 