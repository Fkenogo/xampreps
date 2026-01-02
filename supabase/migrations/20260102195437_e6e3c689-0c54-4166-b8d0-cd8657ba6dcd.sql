-- Helper function to check if user has Standard subscription (using text comparison to avoid enum issue)
CREATE OR REPLACE FUNCTION public.has_standard(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id 
    AND plan::text = 'Standard'
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;