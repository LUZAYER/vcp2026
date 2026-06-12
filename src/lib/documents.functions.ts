import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CATEGORIES = ["clinical_note","physician_order","mri_report","ct_report","xray_report","lab_result","referral","other"] as const;

const UploadInput = z.object({
  patient_id: z.string().uuid(),
  authorization_id: z.string().uuid().nullable().optional(),
  category: z.enum(CATEGORIES),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  base64: z.string(), // base64-encoded contents
});

export const uploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const path = `patients/${data.patient_id}/${Date.now()}-${data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await supabase.storage.from("patient-documents").upload(path, bytes, {
      contentType: data.mime_type,
      upsert: false,
    });
    if (upErr) throw new Error(upErr.message);

    const { data: doc, error } = await supabase.from("documents").insert({
      patient_id: data.patient_id,
      authorization_id: data.authorization_id ?? null,
      category: data.category,
      file_path: path,
      file_name: data.file_name,
      file_size: data.file_size,
      mime_type: data.mime_type,
      uploaded_by: userId,
    }).select().single();
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      patient_id: data.patient_id,
      authorization_id: data.authorization_id ?? null,
      actor_id: userId,
      action: "document_uploaded",
      detail: { file_name: data.file_name, category: data.category },
    });
    return doc;
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().optional(),
      category: z.enum(CATEGORIES).optional(),
      patient_id: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("documents").select("*, patient:patients(id,first_name,last_name,mrn)").order("uploaded_at", { ascending: false }).limit(500);
    if (data.q) q = q.ilike("file_name", `%${data.q}%`);
    if (data.category) q = q.eq("category", data.category);
    if (data.patient_id) q = q.eq("patient_id", data.patient_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error } = await supabase.from("documents").select("file_path,file_name,mime_type").eq("id", data.document_id).single();
    if (error || !doc) throw new Error("Document not found");
    const { data: signed, error: sErr } = await supabase.storage.from("patient-documents").createSignedUrl(doc.file_path, 600);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, name: doc.file_name, mime_type: doc.mime_type };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error: gErr } = await supabase.from("documents").select("*").eq("id", data.document_id).single();
    if (gErr || !doc) throw new Error("Document not found");
    await supabase.storage.from("patient-documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", data.document_id);
    if (error) throw new Error(error.message);
    await supabase.from("activity_log").insert({
      patient_id: doc.patient_id, actor_id: userId,
      action: "document_deleted", detail: { file_name: doc.file_name },
    });
    return { ok: true };
  });
