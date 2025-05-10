-- Add PostgreSQL functions for safely updating CV status without violating constraints
-- This is needed to fix issues with status constraint violations during CV processing

-- Function to update CV skills and status safely
CREATE OR REPLACE FUNCTION update_cv_skills(
  cv_id UUID,
  skills_json JSONB,
  extracted_skills_json JSONB,
  new_status TEXT
) RETURNS SETOF cvs AS $$
BEGIN
  -- Check if the CV exists and get current status
  PERFORM id FROM cvs WHERE id = cv_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CV with ID % not found', cv_id;
  END IF;
  
  -- Update the CV with the extracted skills
  RETURN QUERY
  UPDATE cvs
  SET 
    skills = skills_json,
    extracted_skills = extracted_skills_json,
    -- Only update status if it's in a valid state for transition
    status = CASE 
      WHEN status IN ('uploaded', 'processing') THEN new_status
      ELSE status -- Keep existing status if it's already in a later stage
    END
  WHERE id = cv_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function to update CV status safely based on allowed transitions
CREATE OR REPLACE FUNCTION update_cv_status_safely(
  cv_id UUID,
  new_status TEXT,
  allowed_current_statuses TEXT[] DEFAULT NULL,
  error_message TEXT DEFAULT NULL
) RETURNS SETOF cvs AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- Get current status of the CV
  SELECT status INTO current_status FROM cvs WHERE id = cv_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CV with ID % not found', cv_id;
  END IF;
  
  -- If no allowed statuses are specified, allow all transitions
  -- Otherwise, only allow specified transitions
  IF allowed_current_statuses IS NULL OR current_status = ANY(allowed_current_statuses) THEN
    RETURN QUERY
    UPDATE cvs
    SET 
      status = new_status,
      error_message = CASE WHEN new_status = 'error' THEN error_message ELSE NULL END
    WHERE id = cv_id
    RETURNING *;
  ELSE
    -- Return the CV without updating if status transition is not allowed
    RETURN QUERY SELECT * FROM cvs WHERE id = cv_id;
  END IF;
END;
$$ LANGUAGE plpgsql; 