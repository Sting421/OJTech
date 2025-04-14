# Technical Context: OJTech

## Technology Stack

### Frontend
- **Framework**: Next.js 13.5 with App Router
- **Language**: TypeScript
- **UI Library**: React 18.2
- **State Management**: React Hooks and Context API
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (based on Radix UI primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Toasts/Notifications**: Sonner

### Backend and Infrastructure
- **Backend as a Service**: Supabase
  - **Authentication**: Supabase Auth with email, social providers
  - **Database**: PostgreSQL (via Supabase)
  - **Storage**: Supabase Storage for secure file handling
- **Storage**: Cloudinary for optimized image and document delivery
- **AI Services**: Planned integration with OpenAI API or Google Gemini API

### Development Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Linting**: ESLint with Next.js configuration
- **Build System**: Next.js build system
- **Deployment**: Planned for Vercel

## Architecture Overview

The application follows a modern web architecture:

1. **Client-Side Rendering with Server Components**: Utilizing Next.js 13's hybrid rendering capabilities
2. **API Layer**: Server actions for backend operations
3. **Data Layer**: Supabase database with PostgreSQL
4. **Authentication Layer**: Supabase Auth with middleware protection for routes
5. **Storage Layer**: Combination of Supabase Storage and Cloudinary

## Key Technical Components

### Authentication Flow
- Email/password authentication with email verification
- Protected routes via Next.js middleware
- Session management with Supabase Auth
- Role-based access control (Student, Employer, Admin)

### Database Schema
- Users (managed by Supabase Auth)
- Student Profiles
- Employer Profiles
- Job Postings
- Applications
- Skills Taxonomy
- Feedback

### File Storage
- Student CVs stored in Cloudinary with secure access
- Profile photos and company logos stored in Cloudinary
- Temporary file handling via Supabase Storage

### AI Integration
- Resume parsing and skill extraction
- Job-candidate matching algorithms
- Recommendation engine
- Resume enhancement suggestions

## Development Environment Setup
1. Node.js (v18+)
2. npm
3. Supabase CLI
4. Environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - (Future) OPENAI_API_KEY or GEMINI_API_KEY

## Deployment Strategy
- **Development**: Local development with Supabase local instance
- **Staging**: Vercel Preview Deployments with Supabase staging project
- **Production**: Vercel Production with Supabase production project

## Performance Considerations
- Image optimization via Cloudinary
- Dynamic imports for code splitting
- Server-side rendering for SEO-critical pages
- Client-side rendering for interactive features
- Database indexing for frequent queries
- Rate limiting for API calls to external services

## Security Measures
- Row-level security in Supabase
- Authentication-based access control
- HTTPS-only communication
- Secure handling of resume data
- Input validation with Zod
- Protection against common web vulnerabilities (XSS, CSRF) 