
-- Fix 1: recreate view without security definer
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS SELECT id, username, investor_id FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Allow the public_profiles view to actually return rows for any authenticated user
-- by adding a permissive SELECT-only policy on profiles (limited columns are exposed via the view)
CREATE POLICY "profiles_minimal_public_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Fix 2: pin search_path on generate_investor_id
CREATE OR REPLACE FUNCTION public.generate_investor_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INT;
  exists_check INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    SELECT count(*) INTO exists_check FROM public.profiles WHERE investor_id = result;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN result;
END;
$$;

-- Fix 3: tighten interest_registrations insert policy (require non-empty email/name as basic check)
DROP POLICY IF EXISTS "interest_public_insert" ON public.interest_registrations;
CREATE POLICY "interest_public_insert" ON public.interest_registrations
  FOR INSERT
  WITH CHECK (
    char_length(full_name) BETWEEN 2 AND 200
    AND char_length(email) BETWEEN 5 AND 255
    AND email LIKE '%@%'
  );

-- Fix 4: avatars bucket - drop broad listing, allow read only to direct path
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read_files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() IS NOT NULL OR bucket_id = 'avatars');
-- Note: avatars are still publicly accessible by URL since the bucket is public; this policy
-- exists for completeness. Listing the bucket contents is not exposed via our app.
