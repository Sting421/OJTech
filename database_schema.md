
erDiagram
    profiles {
        uuid id PK
        timestamp_with_time_zone updated_at
        text email UK
        user_role role
        text full_name
        text avatar_url
        text github_profile
        boolean has_completed_onboarding
        boolean has_uploaded_cv
        jsonb cv_data
    }

    student_profiles {
        uuid id PK
        uuid profile_id FK
        varchar university
        varchar course
        integer year_level
        text bio
        text github_profile
        varchar school_email UK
        varchar personal_email UK
        varchar phone_number
        varchar country
        varchar region_province
        varchar city
        varchar postal_code
        text street_address
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
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
        boolean verified
        timestamp_with_time_zone verification_date
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
        jsonb onboarding_progress
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
        varchar status
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
        boolean is_active
        varchar company_name
    }

    cvs {
        uuid id PK
        uuid user_id FK
        text file_url
        jsonb extracted_skills
        jsonb skills
        jsonb analysis_results
        timestamp_with_time_zone last_analyzed_at
        integer version
        boolean is_active
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
    }

    matches {
        uuid id PK
        uuid student_id FK
        uuid job_id FK
        numeric match_score
        varchar status
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
    }

    skill_assessments {
        uuid id PK
        uuid user_id FK
        varchar skill_name
        integer proficiency_level
        text notes
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
    }

    job_applications {
        uuid id PK
        uuid job_id FK
        uuid student_id FK
        uuid cv_id FK
        text cover_letter
        text status
        text employer_notes
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
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
