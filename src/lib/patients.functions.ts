import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PatientInput = z.object({
  mrn: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  insurance_payer: z.string().optional(),
  insurance_member_id: z.string().optional(),
  insurance_group: z.string().optional(),
  plan_type: z.string().optional(),
  subscriber_relationship: z.string().optional(),
  effective_date: z.string().optional(),
});

const AuthInput = z.object({
  diagnosis: z.string().optional(),
  diagnosis_code: z.string().optional(),
  procedure_requested: z.string().optional(),
  procedure_code: z.string().optional(),
  payer: z.string().optional(),
  urgency: z.string().optional(),
  clinical_notes: z.string().optional(),
  referring_physician: z.string().optional(),
});

const CreateInput = z.object({ patient: PatientInput, authorization: AuthInput });

function genMrn() {
  return "MRN" + Math.floor(Math.random() * 9_000_000 + 1_000_000).toString();
}

export const createPatientWithAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const mrn = data.patient.mrn?.trim() || genMrn();
    const { data: patient, error: pErr } = await supabase.from("patients").insert({
      ...data.patient,
      mrn,
      created_by: userId,
    }).select().single();
    if (pErr) throw new Error(pErr.message);

    const { data: auth, error: aErr } = await supabase.from("authorizations").insert({
      patient_id: patient.id,
      ...data.authorization,
      status: "draft",
      created_by: userId,
    }).select().single();
    if (aErr) throw new Error(aErr.message);

    await supabase.from("activity_log").insert({
      patient_id: patient.id,
      authorization_id: auth.id,
      actor_id: userId,
      action: "patient_created",
      detail: { name: `${patient.first_name} ${patient.last_name}` },
    });
    await supabase.from("activity_log").insert({
      patient_id: patient.id,
      authorization_id: auth.id,
      actor_id: userId,
      action: "authorization_created",
      detail: { procedure: data.authorization.procedure_requested },
    });

    return { patient, authorization: auth };
  });

export const listPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().optional(), payer: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.q) q = q.or(`first_name.ilike.%${data.q}%,last_name.ilike.%${data.q}%,mrn.ilike.%${data.q}%`);
    if (data.payer) q = q.eq("insurance_payer", data.payer);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPatient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [p, a, d2, act] = await Promise.all([
      supabase.from("patients").select("*").eq("id", data.id).single(),
      supabase.from("authorizations").select("*").eq("patient_id", data.id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("patient_id", data.id).order("uploaded_at", { ascending: false }),
      supabase.from("activity_log").select("*").eq("patient_id", data.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (p.error) throw new Error(p.error.message);
    return {
      patient: p.data,
      authorizations: a.data ?? [],
      documents: d2.data ?? [],
      activity: act.data ?? [],
    };
  });

export const updatePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), patch: PatientInput.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase.from("patients").update(data.patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("activity_log").insert({
      patient_id: data.id, actor_id: userId, action: "patient_updated",
      detail: { fields: Object.keys(data.patch) },
    });
    return updated;
  });
