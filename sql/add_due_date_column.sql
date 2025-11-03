-- Ensure due_date column exists as alias/sync column for compatibility
-- Run this in your Supabase SQL Editor

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Create or replace trigger to sync due_at and due_date
CREATE OR REPLACE FUNCTION sync_due_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync due_at to due_date
  IF NEW.due_at IS NOT NULL THEN
    NEW.due_date := NEW.due_at;
  END IF;
  
  -- Sync due_date to due_at (if due_at is null)
  IF NEW.due_date IS NOT NULL AND NEW.due_at IS NULL THEN
    NEW.due_at := NEW.due_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_due_dates_trigger ON public.tasks;
CREATE TRIGGER sync_due_dates_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_due_dates();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

