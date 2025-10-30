-- Fix Event Bus triggers to use correct column names

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
DROP TRIGGER IF EXISTS on_lead_status_updated ON public.leads;

-- Drop existing trigger functions
DROP FUNCTION IF EXISTS public.trigger_lead_created();
DROP FUNCTION IF EXISTS public.trigger_lead_status_updated();

-- Create corrected trigger function for lead creation
CREATE OR REPLACE FUNCTION public.trigger_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Publish lead.created event
  PERFORM public.publish_event(
    'lead.created',
    'lead',
    NEW.id::text,
    jsonb_build_object(
      'lead_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'phone', NEW.phone,
      'status_id', NEW.status_id,
      'lead_source_id', NEW.lead_source_id,
      'organization_id', NEW.organization_id
    ),
    jsonb_build_object('trigger', 'insert'),
    NEW.organization_id
  );
  
  RETURN NEW;
END;
$$;

-- Create corrected trigger function for lead status updates
CREATE OR REPLACE FUNCTION public.trigger_lead_status_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire if status actually changed
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    -- Publish lead.status_updated event
    PERFORM public.publish_event(
      'lead.status_updated',
      'lead',
      NEW.id::text,
      jsonb_build_object(
        'lead_id', NEW.id,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'old_status_id', OLD.status_id,
        'new_status_id', NEW.status_id,
        'organization_id', NEW.organization_id
      ),
      jsonb_build_object('trigger', 'update'),
      NEW.organization_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_created();

CREATE TRIGGER on_lead_status_updated
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_status_updated();

-- Add comments
COMMENT ON FUNCTION public.trigger_lead_created() IS 'Publishes lead.created event to event bus when a new lead is created';
COMMENT ON FUNCTION public.trigger_lead_status_updated() IS 'Publishes lead.status_updated event to event bus when lead status changes';