import { supabase } from "@/integrations/supabase/client";

/**
 * Insert an audit log row. Best-effort — never throws.
 * RLS allows authenticated users to insert their own audit rows.
 */
export async function audit(
  action: string,
  entity: string | null = null,
  entityId: string | null = null,
  details: Record<string, unknown> | null = null,
) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      actor_id: u.user?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      details: details as never,
    });
  } catch (e) {
    // Audit failure must never break the user flow.
    console.warn("audit log failed:", e);
  }
}
