-- Drop requirements and responsibilities columns from the jobs table-- Drop old columns and constraints
ALTER TABLE jobs DROP COLUMN IF EXISTS is_active;

-- Add new status column with check constraint
ALTER TABLE jobs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'open'
  CHECK (status IN ('open', 'closed', 'draft'));

ALTER TABLE jobs
DROP COLUMN requirements,
DROP COLUMN responsibilities;
