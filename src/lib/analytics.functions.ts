import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type AuthRow = {
  status: string | null;
  payer: string | null;
  denial_probability: number | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  created_by: string | null;
  risk_factors: unknown;
};

function rangeToDays(range: string) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  if (range === "ytd") return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
  return 30;
}

export const getAnalyticsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ range: z.enum(["7d","30d","90d","ytd"]).default("30d") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = rangeToDays(data.range);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const prevSince = new Date(Date.now() - 2 * days * 86400000).toISOString();

    const [allAuth, prevAuth, appealsRes, patientsCount] = await Promise.all([
      supabase.from("authorizations").select("status,payer,denial_probability,submitted_at,decided_at,created_at,created_by,risk_factors").gte("created_at", since),
      supabase.from("authorizations").select("status,decided_at").gte("created_at", prevSince).lt("created_at", since),
      supabase.from("appeals").select("status,outcome,decided_at,created_at").gte("created_at", since),
      supabase.from("patients").select("id", { count: "exact", head: true }),
    ]);

    const rows: AuthRow[] = (allAuth.data ?? []) as AuthRow[];
    const prev = prevAuth.data ?? [];
    const appeals = appealsRes.data ?? [];

    const total = rows.length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const denied = rows.filter((r) => r.status === "denied").length;
    const decided = approved + denied;
    const approvalRate = decided ? (approved / decided) * 100 : 0;
    const denialRate = decided ? (denied / decided) * 100 : 0;

    const prevApproved = prev.filter((r) => r.status === "approved").length;
    const prevDecided = prev.filter((r) => r.status === "approved" || r.status === "denied").length;
    const prevApprovalRate = prevDecided ? (prevApproved / prevDecided) * 100 : 0;

    const appealWon = appeals.filter((a) => a.outcome === "approved").length;
    const appealDecided = appeals.filter((a) => a.outcome === "approved" || a.outcome === "denied").length;
    const appealWinRate = appealDecided ? (appealWon / appealDecided) * 100 : 0;

    const avgApprovalDays =
      rows.filter((r) => r.decided_at && r.submitted_at).reduce((acc, r) => {
        return acc + (new Date(r.decided_at!).getTime() - new Date(r.submitted_at!).getTime()) / 86400000;
      }, 0) / Math.max(1, rows.filter((r) => r.decided_at && r.submitted_at).length);

    const highRisk = rows.filter((r) => (r.denial_probability ?? 0) >= 70).length;
    const uniqueStaff = new Set(rows.map((r) => r.created_by).filter(Boolean)).size || 1;
    const staffProductivity = total / (uniqueStaff * Math.max(1, days));

    // monthly trends (weekly buckets)
    const buckets: Record<string, { week: string; submitted: number; approved: number; denied: number; appealed: number }> = {};
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const w = `${d.getMonth() + 1}/${Math.floor(d.getDate() / 7) * 7 + 1}`;
      if (!buckets[w]) buckets[w] = { week: w, submitted: 0, approved: 0, denied: 0, appealed: 0 };
      buckets[w].submitted += 1;
      if (r.status === "approved") buckets[w].approved += 1;
      if (r.status === "denied") buckets[w].denied += 1;
      if (r.status === "appealed") buckets[w].appealed += 1;
    });
    const trends = Object.values(buckets);

    // denial reasons aggregation
    const reasons: Record<string, number> = {};
    rows.filter((r) => r.status === "denied").forEach((r) => {
      const factors = Array.isArray(r.risk_factors) ? r.risk_factors : [];
      factors.forEach((f: unknown) => {
        if (f && typeof f === "object" && "label" in f && typeof (f as { label: unknown }).label === "string") {
          const label = (f as { label: string }).label;
          reasons[label] = (reasons[label] ?? 0) + 1;
        }
      });
    });
    const denialReasons = Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    // payer performance
    const payers: Record<string, { payer: string; volume: number; approved: number; denied: number }> = {};
    rows.forEach((r) => {
      const p = r.payer ?? "Unknown";
      if (!payers[p]) payers[p] = { payer: p, volume: 0, approved: 0, denied: 0 };
      payers[p].volume += 1;
      if (r.status === "approved") payers[p].approved += 1;
      if (r.status === "denied") payers[p].denied += 1;
    });
    const payerPerformance = Object.values(payers).map((p) => ({
      ...p,
      approval_rate: p.approved + p.denied ? (p.approved / (p.approved + p.denied)) * 100 : 0,
    })).sort((a, b) => b.volume - a.volume);

    // status volume
    const volume = ["draft", "pending", "submitted", "under_review", "approved", "denied", "appealed"].map((s) => ({
      status: s,
      count: rows.filter((r) => r.status === s).length,
    }));

    // risk distribution
    const riskBuckets = [
      { name: "Low", min: 0, max: 30 },
      { name: "Medium", min: 30, max: 60 },
      { name: "High", min: 60, max: 80 },
      { name: "Critical", min: 80, max: 101 },
    ].map((b) => ({
      bucket: b.name,
      count: rows.filter((r) => {
        const dp = r.denial_probability ?? 0;
        return dp >= b.min && dp < b.max;
      }).length,
    }));

    return {
      kpis: {
        totalAuthorizations: total,
        approvalRate: Math.round(approvalRate * 10) / 10,
        denialRate: Math.round(denialRate * 10) / 10,
        appealWinRate: Math.round(appealWinRate * 10) / 10,
        avgApprovalDays: Math.round(avgApprovalDays * 10) / 10,
        highRiskCases: highRisk,
        staffProductivity: Math.round(staffProductivity * 100) / 100,
        deltaApprovalRate: Math.round((approvalRate - prevApprovalRate) * 10) / 10,
        patientsCount: patientsCount.count ?? 0,
      },
      trends,
      denialReasons,
      payerPerformance,
      volume,
      riskBuckets,
    };
  });

export const getAiInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase.from("app_settings").select("ai_insights,ai_insights_generated_at").eq("id", 1).single();
    return data ?? { ai_insights: null, ai_insights_generated_at: null };
  });
