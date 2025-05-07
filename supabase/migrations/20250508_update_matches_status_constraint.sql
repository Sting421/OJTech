-- Drop the existing constraint if it exists
ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add the updated constraint with more status options
ALTER TABLE matches 
ADD CONSTRAINT matches_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'applied', 'declined'));

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated matches_status_check constraint to include "applied" and "declined" statuses';
END $$; 