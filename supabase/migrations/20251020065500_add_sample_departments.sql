-- Location: supabase/migrations/20251020065500_add_sample_departments.sql
-- Schema Analysis: Existing departments table with id, name, created_at columns
-- Integration Type: Adding sample data to existing departments table
-- Dependencies: public.departments table

-- Add more sample departments for better dropdown functionality
DO $$
BEGIN
    -- Check if departments already exist, if not add them
    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Residence Life') THEN
        INSERT INTO public.departments (name) VALUES
            ('Residence Life'),
            ('Student Activities'),
            ('Academic Support'),
            ('Career Services'),
            ('Counseling Services'),
            ('Campus Safety'),
            ('Student Government'),
            ('Athletics'),
            ('Dining Services'),
            ('IT Support'),
            ('Marketing'),
            ('Student Engagement');
    END IF;
    
    -- Log success message
    RAISE NOTICE 'Sample departments added successfully';
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Some departments already exist, skipping duplicates';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding departments: %', SQLERRM;
END $$;