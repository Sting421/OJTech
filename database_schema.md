erDiagram
    profiles {
        uuid id PK
        timestamp_with_time_zone updated_at
        text email UK "~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z]{2,}$'"
        user_role role "student|employer|admin"
        text full_name
        text avatar_url
        text github_profile "length <= 500"
        boolean has_completed_onboarding "default: false"
        boolean has_uploaded_cv "default: false"
    }

    student_profiles {
        uuid id PK
        uuid profile_id FK
        varchar university
        varchar course
        integer year_level "1-6"
        text bio
        text github_profile "length <= 500"
        varchar school_email UK
        varchar personal_email UK
        varchar phone_number
        varchar country "default: Philippines"
        varchar region_province
        varchar city
        varchar postal_code
        text street_address
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
    }

    employers {
        uuid id PK
        uuid profile_id FK
        text company_name
        text company_size
        text industry
        text company_website
        text company_description
        text company_logo_url
        text company_address
        text contact_person
        text position
        text contact_email
        text contact_phone
        boolean verified "default: false"
        timestamp_with_time_zone verification_date
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
        jsonb onboarding_progress "default: {company_info: false, company_logo: false, contact_details: false}"
    }

    jobs {
        uuid id PK
        uuid employer_id FK
        varchar title
        text description
        varchar location
        varchar job_type
        varchar salary_range
        jsonb required_skills
        jsonb preferred_skills
        timestamp_with_time_zone application_deadline
        varchar status "open|closed|draft"
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
        varchar company_name
    }

    cvs {
        uuid id PK
        uuid user_id FK
        text file_url
        jsonb extracted_skills
        jsonb skills
        jsonb analysis_results "AI-generated analysis results"
        timestamp_with_time_zone last_analyzed_at
        integer version "default: 1"
        boolean is_active "default: true"
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
    }

    matches {
        uuid id PK
        uuid student_id FK
        uuid job_id FK
        numeric match_score "0-100"
        varchar status "pending|accepted|rejected|applied|declined"
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
    }

    skill_assessments {
        uuid id PK
        uuid user_id FK
        varchar skill_name
        integer proficiency_level "1-5"
        text notes
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
    }

    job_applications {
        uuid id PK
        uuid job_id FK
        uuid student_id FK
        uuid cv_id FK
        text cover_letter
        text status "pending|reviewed|shortlisted|rejected|hired"
        text employer_notes
        timestamp_with_time_zone created_at "default: CURRENT_TIMESTAMP"
        timestamp_with_time_zone updated_at "default: CURRENT_TIMESTAMP"
    }

    profiles ||--o{ student_profiles : "has"
    profiles ||--o{ employers : "has"
    profiles ||--o{ jobs : "posts"
    profiles ||--o{ cvs : "has"
    profiles ||--o{ skill_assessments : "has"
    profiles ||--o{ job_applications : "submits"
    jobs ||--o{ matches : "has"
    student_profiles ||--o{ matches : "has"
    jobs ||--o{ job_applications : "has"
    cvs ||--o{ job_applications : "uses"
