-- Create skill_assessments table for user's self-assessment
CREATE TABLE IF NOT EXISTS public.skill_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level INT NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add metadata for understanding proficiency levels
COMMENT ON TABLE public.skill_assessments IS 'Stores user''s self-assessment of their skills';
COMMENT ON COLUMN public.skill_assessments.proficiency_level IS 'Skill proficiency on a scale of 1-5: 1=Beginner, 2=Elementary, 3=Intermediate, 4=Advanced, 5=Expert';

-- Create a unique constraint to prevent duplicate skill entries per user
ALTER TABLE public.skill_assessments 
ADD CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_skill_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_skill_assessments_updated_at
    BEFORE UPDATE ON skill_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_assessments_updated_at();

-- Create indexes for faster searches
CREATE INDEX idx_skill_assessments_user_id ON skill_assessments(user_id);
CREATE INDEX idx_skill_assessments_skill_name ON skill_assessments(skill_name);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own skill assessments
CREATE POLICY "Users can view own skill assessments"
    ON public.skill_assessments 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own skill assessments
CREATE POLICY "Users can insert own skill assessments"
    ON public.skill_assessments 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own skill assessments
CREATE POLICY "Users can update own skill assessments"
    ON public.skill_assessments 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Policy: Users can only delete their own skill assessments
CREATE POLICY "Users can delete own skill assessments"
    ON public.skill_assessments 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Policy: Admins can view all skill assessments
CREATE POLICY "Admins can view all skill assessments"
    ON public.skill_assessments 
    FOR SELECT 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Policy: Admins can manage all skill assessments
CREATE POLICY "Admins can manage all skill assessments"
    ON public.skill_assessments 
    FOR ALL 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'); 