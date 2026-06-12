import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, AlertTriangle, Clock, ShieldCheck, TrendingUp, Brain, Loader2, Sparkles, Users, FileX } from "lucide-react";
import { getAnalyticsSnapshot, getAiInsights } from "@/lib/analytics.functions";
import { generateAiInsights } from "@/lib/ai.functions";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { fmtPct, fmtRelative } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — PriorFlow AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const snapshot = useServerFn(getAnalyticsSnapshot);
  const getInsights = useServerFn(getAiInsights);
  const genInsights = useServerFn(generateAiInsights);
  const qc = useQueryClient();

  const [range, setRange] = useState<"7d" | "30d" | "90d" | "ytd">("30d");
  const { data: snap, isLoading } = useQuery({ queryKey: ["analytics-snapshot", range], queryFn: () => snapshot({ data: { range } }) });
  const { data: insights } = useQuery({ queryKey: ["ai-insights"], queryFn: () => getInsights({ data: undefined as never }) });

  const refreshInsights = useMutation({
    mutationFn: () => genInsights({ data: undefined as never }),
    onSuccess: () => { toast.success("AI insights refreshed"); qc.invalidateQueries({ queryKey: ["ai-insights"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const ai = insights?.ai_insights as null | {
    denial_patterns: { pattern: string; frequency: number; payers: string[]; recommended_action: string }[];
    bottlenecks: { stage: string; avg_days: number; severity: string; detail: string }[];
    documentation_gaps: { doc_type: string; missing_in_pct: number; impact: string }[];
    approval_optimizations: { suggestion: string; expected_lift_pct: number; confidence: number }[];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Analytics</h1>
          <p className="text-sm text-muted-foreground">Operational performance across your prior authorization workflow.</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{[{v:"7d",l:"Last 7d"},{v:"30d",l:"Last 30d"},{v:"90d",l:"Last 90d"},{v:"ytd",l:"YTD"}].map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {isLoading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : snap && (
          <>
            <StatCard label="Total auths" value={snap.kpis.totalAuthorizations} icon={ShieldCheck} />
            <StatCard label="Approval" value={fmtPct(snap.kpis.approvalRate)} delta={snap.kpis.deltaApprovalRate} accent="success" icon={TrendingUp} />
            <StatCard label="Denial" value={fmtPct(snap.kpis.denialRate)} accent="destructive" icon={AlertTriangle} />
            <StatCard label="Appeal win" value={fmtPct(snap.kpis.appealWinRate)} accent="info" />
            <StatCard label="Avg days" value={`${snap.kpis.avgApprovalDays}d`} icon={Clock} />
            <StatCard label="High risk" value={snap.kpis.highRiskCases} accent="warning" icon={AlertTriangle} />
            <StatCard label="Productivity" value={snap.kpis.staffProductivity.toFixed(2)} hint="auths / user / day" icon={Users} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Monthly trends</CardTitle></CardHeader>
          <CardContent className="h-72">
            {snap && snap.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snap.trends}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="submitted" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="approved" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  <Line dataKey="denied" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton className="size-full" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            {snap && snap.riskBuckets.some((b) => b.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={snap.riskBuckets} dataKey="count" nameKey="bucket" outerRadius={90} innerRadius={50}>
                    {snap.riskBuckets.map((_, i) => <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Skeleton className="size-full" />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Authorization volume by status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {snap ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.volume}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="size-full" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top denial reasons</CardTitle></CardHeader>
          <CardContent>
            {snap && snap.denialReasons.length > 0 ? (
              <ul className="space-y-2">
                {snap.denialReasons.map((d) => (
                  <li key={d.reason} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 truncate">{d.reason}</div>
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: `${Math.min(100, d.count * 25)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground py-6 text-center">No denial reasons in this window.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payer performance</CardTitle></CardHeader>
          <CardContent>
            {snap && snap.payerPerformance.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {snap.payerPerformance.slice(0, 8).map((p) => (
                  <li key={p.payer} className="flex items-center gap-3">
                    <div className="flex-1 truncate font-medium">{p.payer}</div>
                    <span className="text-xs text-muted-foreground">{p.volume} reqs</span>
                    <Badge variant="outline" className="text-success bg-success/10 border-transparent">{Math.round(p.approval_rate)}%</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground py-6 text-center">No payer data.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> AI Insights</CardTitle>
            {insights?.ai_insights_generated_at && <p className="text-xs text-muted-foreground mt-1">Last refreshed {fmtRelative(insights.ai_insights_generated_at)}</p>}
          </div>
          <Button onClick={() => refreshInsights.mutate()} disabled={refreshInsights.isPending} variant="outline" size="sm">
            {refreshInsights.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Brain className="size-4" /> {ai ? "Refresh" : "Generate"}</>}
          </Button>
        </CardHeader>
        <CardContent>
          {!ai ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Click "Generate" to surface denial patterns, bottlenecks, documentation gaps, and approval optimizations from your workflow data.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <InsightCard title="Denial patterns" icon={AlertTriangle} items={ai.denial_patterns.map((p) => ({ title: p.pattern, subtitle: `${p.frequency} cases · ${p.payers.join(", ")}`, body: p.recommended_action }))} />
              <InsightCard title="Bottlenecks" icon={Clock} items={ai.bottlenecks.map((b) => ({ title: b.stage, subtitle: `${b.avg_days.toFixed(1)} avg days · ${b.severity}`, body: b.detail }))} />
              <InsightCard title="Documentation gaps" icon={FileX} items={ai.documentation_gaps.map((g) => ({ title: g.doc_type, subtitle: `Missing in ${Math.round(g.missing_in_pct)}% of denials`, body: g.impact }))} />
              <InsightCard title="Approval optimizations" icon={TrendingUp} items={ai.approval_optimizations.map((o) => ({ title: o.suggestion, subtitle: `Expected lift +${Math.round(o.expected_lift_pct)}%`, body: `Confidence ${(o.confidence * 100).toFixed(0)}%` }))} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({ title, icon: Icon, items }: { title: string; icon: React.ComponentType<{ className?: string }>; items: { title: string; subtitle: string; body: string }[] }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-4" /></div>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="text-sm border-l-2 border-primary/30 pl-3">
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>
            <div className="text-xs mt-1">{it.body}</div>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">Nothing surfaced.</li>}
      </ul>
    </div>
  );
}
