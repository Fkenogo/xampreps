-- Create a function to set up admin user after they sign up
-- This will be triggered when fredkenogo@gmail.com signs up

-- First, create a trigger function that will assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is the super admin email
  IF NEW.email = 'fredkenogo@gmail.com' THEN
    -- Insert admin role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table to assign admin role after profile creation
DROP TRIGGER IF EXISTS assign_admin_role_trigger ON public.profiles;
CREATE TRIGGER assign_admin_role_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_on_signup();

-- Also check if the admin email already exists and assign role
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find if fredkenogo@gmail.com already has a profile
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE email = 'fredkenogo@gmail.com';
  
  -- If found, ensure they have admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;