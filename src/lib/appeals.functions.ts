import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAppeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("appeals")
      .select("*, authorization:authorizations(id,procedure_requested,payer,diagnosis,patient:patients(id,first_name,last_name,mrn))")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as never);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAppeal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [a, notes, events, versions] = await Promise.all([
      supabase.from("appeals").select("*, authorization:authorizations(*, patient:patients(*))").eq("id", data.id).single(),
      supabase.from("appeal_notes").select("*").eq("appeal_id", data.id).order("created_at", { ascending: false }),
      supabase.from("appeal_events").select("*").eq("appeal_id", data.id).order("created_at", { ascending: false }),
      supabase.from("appeals").select("id,version,status,created_at,current").order("version", { ascending: false }),
    ]);
    if (a.error) throw new Error(a.error.message);
    const versionList = (versions.data ?? []).filter((v) => v.id !== data.id);
    return { appeal: a.data, notes: notes.data ?? [], events: events.data ?? [], versions: versionList };
  });

export const updateAppealSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string(),
      patch: z.object({
        appeal_letter: z.string().optional(),
        clinical_justification: z.string().optional(),
        supporting_evidence: z.string().optional(),
        payer_response_draft: z.string().optional(),
        assigned_to: z.string().nullable().optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase.from("appeals").update(data.patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("appeal_events").insert({
      appeal_id: data.id, event_type: "edited", actor_id: userId,
      detail: { fields: Object.keys(data.patch) },
    });
    return updated;
  });

export const transitionAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string(),
      status: z.enum(["drafted", "submitted", "under_review", "approved", "denied"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { status: typeof data.status; submitted_at?: string; decided_at?: string; outcome?: string } = { status: data.status };
    if (data.status === "submitted") patch.submitted_at = new Date().toISOString();
    if (data.status === "approved" || data.status === "denied") {
      patch.decided_at = new Date().toISOString();
      patch.outcome = data.status;
    }
    const { data: updated, error } = await supabase.from("appeals").update(patch).eq("id", data.id).select("*, authorization_id").single();
    if (error) throw new Error(error.message);

    await supabase.from("appeal_events").insert({
      appeal_id: data.id, event_type: "status_change", actor_id: userId,
      detail: { status: data.status },
    });

    if (data.status === "approved") {
      await supabase.from("authorizations").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", updated.authorization_id);
    } else if (data.status === "denied") {
      await supabase.from("authorizations").update({ status: "denied", decided_at: new Date().toISOString() }).eq("id", updated.authorization_id);
    }
    return updated;
  });

export const addAppealNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ appeal_id: z.string(), body: z.string().min(1), internal: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note, error } = await supabase.from("appeal_notes").insert({
      appeal_id: data.appeal_id, author_id: userId, body: data.body, internal: data.internal ?? false,
    }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("appeal_events").insert({
      appeal_id: data.appeal_id, event_type: "note_added", actor_id: userId,
      detail: { internal: data.internal ?? false },
    });
    return note;
  });
