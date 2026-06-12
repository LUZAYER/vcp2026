import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RiskSchema = z.object({
  approval_probability: z.number().min(0).max(100),
  denial_probability: z.number().min(0).max(100),
  documentation_risk: z.number().min(0).max(100),
  coding_risk: z.number().min(0).max(100),
  payer_complexity: z.number().min(0).max(100),
  overall_risk_score: z.number().min(0).max(100),
  rationale: z.string(),
  risk_factors: z.array(z.object({
    label: z.string(),
    severity: z.enum(["low", "med", "high"]),
    detail: z.string(),
  })),
  recommended_actions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const AI_MODEL = "google/gemini-3-flash-preview";

export const scoreAuthorizationRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ authorization_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const { data: auth, error } = await supabase
      .from("authorizations")
      .select("*, patient:patients(*)")
      .eq("id", data.authorization_id).single();
    if (error || !auth) throw new Error("Authorization not found");

    const { data: docs } = await supabase
      .from("documents").select("category,file_name").eq("patient_id", auth.patient_id);

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `You are a healthcare prior-authorization specialist analyzing an authorization request for denial risk.

PATIENT
- Name: ${auth.patient.first_name} ${auth.patient.last_name}
- DOB: ${auth.patient.dob ?? "n/a"}
- Insurance payer: ${auth.patient.insurance_payer ?? auth.payer ?? "Unknown"}
- Plan type: ${auth.patient.plan_type ?? "n/a"}

AUTHORIZATION
- Diagnosis: ${auth.diagnosis ?? "n/a"} (ICD-10: ${auth.diagnosis_code ?? "n/a"})
- Procedure: ${auth.procedure_requested ?? "n/a"} (CPT: ${auth.procedure_code ?? "n/a"})
- Urgency: ${auth.urgency}
- Referring physician: ${auth.referring_physician ?? "n/a"}
- Clinical notes: ${auth.clinical_notes ?? "(none)"}
- Documents on file (${(docs ?? []).length}): ${(docs ?? []).map((d) => `${d.category}: ${d.file_name}`).join("; ") || "none"}

Score this authorization on a 0–100 scale for each metric. Higher denial_probability + risk numbers = worse. Be realistic — typical payer approval rates are 65–85% with strong documentation.

Identify 3–6 concrete risk factors (missing labs, vague indication, insufficient conservative-care documentation, coding mismatch, payer's known restrictions, etc.) and 3–5 concrete recommended actions a clinician could take to improve the chance of approval. Keep each label short (<60 chars).`;

    let parsed;
    try {
      const { experimental_output } = await generateText({
        model: gateway(AI_MODEL),
        experimental_output: Output.object({ schema: RiskSchema }),
        prompt,
      });
      parsed = experimental_output;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("AI gateway rate limit hit. Please retry shortly.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI risk scoring failed: ${msg}`);
    }

    const { error: uErr } = await supabase.from("authorizations").update({
      approval_probability: parsed.approval_probability,
      denial_probability: parsed.denial_probability,
      documentation_risk: parsed.documentation_risk,
      coding_risk: parsed.coding_risk,
      payer_complexity: parsed.payer_complexity,
      risk_score: parsed.overall_risk_score,
      risk_rationale: parsed.rationale,
      risk_factors: parsed.risk_factors,
      recommended_actions: parsed.recommended_actions,
      ai_confidence: parsed.confidence,
      ai_model: AI_MODEL,
      risk_generated_at: new Date().toISOString(),
    }).eq("id", data.authorization_id);
    if (uErr) throw new Error(uErr.message);

    await supabase.from("activity_log").insert({
      patient_id: auth.patient_id, authorization_id: data.authorization_id,
      actor_id: userId, action: "risk_scored",
      detail: { denial_probability: parsed.denial_probability, model: AI_MODEL },
    });

    return parsed;
  });

const AppealDraftSchema = z.object({
  appeal_letter: z.string(),
  clinical_justification: z.string(),
  supporting_evidence: z.string(),
  payer_response_draft: z.string(),
  confidence: z.number().min(0).max(1),
});

export const draftAppealPacket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ authorization_id: z.string(), instructions: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const { data: auth, error } = await supabase
      .from("authorizations").select("*, patient:patients(*)").eq("id", data.authorization_id).single();
    if (error || !auth) throw new Error("Authorization not found");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Draft a complete payer appeal packet for a denied prior authorization. Write in a professional, evidence-based clinical voice — no boilerplate filler.

PATIENT: ${auth.patient.first_name} ${auth.patient.last_name}, DOB ${auth.patient.dob ?? "n/a"}, Member ID ${auth.patient.insurance_member_id ?? "n/a"}
PAYER: ${auth.payer ?? auth.patient.insurance_payer ?? "Unknown"} (${auth.patient.plan_type ?? "plan type unknown"})
DIAGNOSIS: ${auth.diagnosis ?? "n/a"} (ICD-10 ${auth.diagnosis_code ?? "n/a"})
PROCEDURE: ${auth.procedure_requested ?? "n/a"} (CPT ${auth.procedure_code ?? "n/a"})
CLINICAL NOTES: ${auth.clinical_notes ?? "(none)"}
PRIOR RISK FACTORS: ${JSON.stringify(auth.risk_factors ?? [])}
${data.instructions ? `\nADDITIONAL INSTRUCTIONS:\n${data.instructions}` : ""}

Return four sections:
1. appeal_letter — a formal letter to the payer's medical director (300–500 words, salutation through sign-off).
2. clinical_justification — a 200–300-word narrative tying the diagnosis, evidence-based guidelines, and patient-specific findings to the requested procedure.
3. supporting_evidence — a bullet-style summary (Markdown bullets) of the documentation that should accompany the appeal.
4. payer_response_draft — a concise 100–150-word reply specifically tailored to common ${auth.payer ?? "commercial payer"} denial language.`;

    let parsed;
    try {
      const { experimental_output } = await generateText({
        model: gateway(AI_MODEL),
        experimental_output: Output.object({ schema: AppealDraftSchema }),
        prompt,
      });
      parsed = experimental_output;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("AI gateway rate limit hit. Please retry shortly.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI appeal drafting failed: ${msg}`);
    }

    // demote any previous current appeal for this auth
    await supabase.from("appeals").update({ current: false }).eq("authorization_id", data.authorization_id).eq("current", true);
    const { data: existing } = await supabase.from("appeals").select("version").eq("authorization_id", data.authorization_id).order("version", { ascending: false }).limit(1);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    const { data: appeal, error: insErr } = await supabase.from("appeals").insert({
      authorization_id: data.authorization_id,
      status: "drafted",
      version: nextVersion,
      current: true,
      appeal_letter: parsed.appeal_letter,
      clinical_justification: parsed.clinical_justification,
      supporting_evidence: parsed.supporting_evidence,
      payer_response_draft: parsed.payer_response_draft,
      ai_model: AI_MODEL,
      ai_confidence: parsed.confidence,
      created_by: userId,
    }).select().single();
    if (insErr) throw new Error(insErr.message);

    await supabase.from("appeal_events").insert({
      appeal_id: appeal.id, event_type: "drafted", actor_id: userId,
      detail: { version: nextVersion, model: AI_MODEL },
    });
    await supabase.from("authorizations").update({ status: "appealed" }).eq("id", data.authorization_id);
    await supabase.from("activity_log").insert({
      patient_id: auth.patient_id, authorization_id: data.authorization_id,
      actor_id: userId, action: "appeal_drafted", detail: { version: nextVersion },
    });

    return appeal;
  });

const InsightsSchema = z.object({
  denial_patterns: z.array(z.object({
    pattern: z.string(),
    frequency: z.number(),
    payers: z.array(z.string()),
    recommended_action: z.string(),
  })),
  bottlenecks: z.array(z.object({
    stage: z.string(),
    avg_days: z.number(),
    severity: z.enum(["low", "med", "high"]),
    detail: z.string(),
  })),
  documentation_gaps: z.array(z.object({
    doc_type: z.string(),
    missing_in_pct: z.number(),
    impact: z.string(),
  })),
  approval_optimizations: z.array(z.object({
    suggestion: z.string(),
    expected_lift_pct: z.number(),
    confidence: z.number(),
  })),
});

export const generateAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const { data: auths } = await supabase.from("authorizations").select("status,payer,diagnosis,procedure_requested,risk_factors,denial_probability,decided_at,submitted_at").limit(300);
    const sample = (auths ?? []).slice(0, 150);

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `You are a healthcare operations analyst. Analyze this sample of prior authorizations and surface operational insights. Be specific and concrete — every output item must be actionable.

DATA (${sample.length} authorizations):
${JSON.stringify(sample).slice(0, 12000)}

Return:
- denial_patterns: top 4–6 recurring reasons authorizations get denied, with which payers they hit hardest and a concrete action to take. "frequency" is approximate count from the sample.
- bottlenecks: 3–4 workflow stages with the highest average days, severity, and what's slowing them down.
- documentation_gaps: top 4–5 missing document types, percentage of denied authorizations they're missing from, and clinical impact.
- approval_optimizations: 3–5 specific suggestions with an estimated lift in approval rate (%) and your confidence (0–1).`;

    let parsed;
    try {
      const { experimental_output } = await generateText({
        model: gateway(AI_MODEL),
        experimental_output: Output.object({ schema: InsightsSchema }),
        prompt,
      });
      parsed = experimental_output;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("AI gateway rate limit hit. Please retry shortly.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI insights failed: ${msg}`);
    }

    await supabase.from("app_settings").update({
      ai_insights: parsed,
      ai_insights_generated_at: new Date().toISOString(),
    }).eq("id", 1);

    return parsed;
  });
