-- Create table for tracking Salebot API usage per day
CREATE TABLE public.salebot_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  api_requests_count INTEGER DEFAULT 0,
  max_daily_limit INTEGER DEFAULT 6000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.salebot_api_usage ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (admin feature)
CREATE POLICY "Allow all access to salebot_api_usage"
ON public.salebot_api_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to get or create today's usage record
CREATE OR REPLACE FUNCTION public.get_or_create_salebot_usage()
RETURNS salebot_api_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  usage_record salebot_api_usage;
BEGIN
  -- Try to get existing record
  SELECT * INTO usage_record FROM salebot_api_usage WHERE date = today_date;
  
  -- If not found, create new
  IF usage_record IS NULL THEN
    INSERT INTO salebot_api_usage (date, api_requests_count, max_daily_limit)
    VALUES (today_date, 0, 6000)
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$;

-- Create function to increment API usage counter
CREATE OR REPLACE FUNCTION public.increment_salebot_api_usage(increment_by INTEGER DEFAULT 1)
RETURNS salebot_api_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  usage_record salebot_api_usage;
BEGIN
  -- Get or create today's record
  SELECT * INTO usage_record FROM public.get_or_create_salebot_usage();
  
  -- Increment counter
  UPDATE salebot_api_usage 
  SET api_requests_count = api_requests_count + increment_by,
      updated_at = NOW()
  WHERE date = today_date
  RETURNING * INTO usage_record;
  
  RETURN usage_record;
END;
$$;

-- Create function to check if API limit reached
CREATE OR REPLACE FUNCTION public.check_salebot_api_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_record salebot_api_usage;
BEGIN
  SELECT * INTO usage_record FROM public.get_or_create_salebot_usage();
  RETURN usage_record.api_requests_count < usage_record.max_daily_limit;
END;
$$;