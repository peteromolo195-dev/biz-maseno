-- Allow authenticated users to insert audit rows where they are the actor.
-- Only admins can read (existing policy audit_admin_read remains in place).
CREATE POLICY "audit_self_insert"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());