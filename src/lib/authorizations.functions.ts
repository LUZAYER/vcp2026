import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAuthorizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.string().optional(), payer: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("authorizations").select("*, patient:patients(id,first_name,last_name,mrn,insurance_payer)").order("created_at", { ascending: false }).limit(500);
    if (data.status) q = q.eq("status", data.status as never);
    if (data.payer) q = q.eq("payer", data.payer);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAuthorization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [a, appeals, docs] = await Promise.all([
      supabase.from("authorizations").select("*, patient:patients(*)").eq("id", data.id).single(),
      supabase.from("appeals").select("*").eq("authorization_id", data.id).order("version", { ascending: false }),
      supabase.from("documents").select("*").eq("authorization_id", data.id).order("uploaded_at", { ascending: false }),
    ]);
    if (a.error) throw new Error(a.error.message);
    return { authorization: a.data, appeals: appeals.data ?? [], documents: docs.data ?? [] };
  });

export const updateAuthorizationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string(),
      status: z.enum(["draft","pending","submitted","under_review","approved","denied","appealed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: {
      status: typeof data.status;
      submitted_at?: string;
      decided_at?: string;
    } = { status: data.status };
    if (data.status === "submitted") patch.submitted_at = new Date().toISOString();
    if (data.status === "approved" || data.status === "denied") patch.decided_at = new Date().toISOString();

    const { data: a, error } = await supabase.from("authorizations").update(patch).eq("id", data.id).select("*, patient_id").single();
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      patient_id: a.patient_id, authorization_id: data.id,
      actor_id: userId, action: "status_changed",
      detail: { status: data.status },
    });
    return a;
  });
