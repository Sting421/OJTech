# Database Constraints Documentation

This document keeps track of important database constraints in the OJTech system.

## Table Constraints

### matches

- **matches_status_check**: Status must be one of: 'pending', 'accepted', 'rejected', 'applied', 'declined'
  - Added 'applied' and 'declined' in migration `20250508_update_matches_status_constraint.sql`

### jobs

- **jobs_status_check**: Status must be one of: 'open', 'closed', 'draft'
  - Added in migration `20250506_drop_requirements_responsibilities.sql`

### job_applications

- **job_applications_status_check**: Status must be one of: 'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'
  - Added in migration `add_constraint_to_job_applications.sql`

## Status Flow

### Match Status Flow
- pending → applied (student swipes right)
- pending → declined (student swipes left)
- applied → accepted (future: employer accepts application)
- applied → rejected (future: employer rejects application)

### Job Application Status Flow
- pending → reviewed (employer reviews application)
- reviewed → shortlisted (employer shortlists application)
- reviewed → rejected (employer rejects application)
- shortlisted → hired (employer hires student)
- shortlisted → rejected (employer rejects student after shortlisting) 