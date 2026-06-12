import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, ShieldCheck, AlertTriangle, TrendingUp, Plus, Activity } from "lucide-react";
import { getAnalyticsSnapshot } from "@/lib/analytics.functions";
import { listAuthorizations } from "@/lib/authorizations.functions";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fmtPct, fmtRelative } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PriorFlow AI" }] }),
  component: Dashboard,
});

const STATUS_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function Dashboard() {
  const snapshot = useServerFn(getAnalyticsSnapshot);
  const listAuth = useServerFn(listAuthorizations);

  const { data: snap, isLoading } = useQuery({
    queryKey: ["analytics-snapshot", "30d"],
    queryFn: () => snapshot({ data: { range: "30d" } }),
  });
  const { data: recent } = useQuery({
    queryKey: ["recent-auths"],
    queryFn: () => listAuth({ data: {} }),
  });

  const top5 = (recent ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational overview across the last 30 days.</p>
        </div>
        <Button asChild><Link to="/patients/new"><Plus className="size-4" /> New patient</Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Patients" value={snap?.kpis.patientsCount ?? 0} icon={Users} accent="info" />
            <StatCard label="Authorizations" value={snap?.kpis.totalAuthorizations ?? 0} icon={ShieldCheck} accent="primary" />
            <StatCard label="Approval rate" value={fmtPct(snap?.kpis.approvalRate)} delta={snap?.kpis.deltaApprovalRate} icon={TrendingUp} accent="success" />
            <StatCard label="High-risk cases" value={snap?.kpis.highRiskCases ?? 0} icon={AlertTriangle} accent="destructive" hint="Denial probability ≥ 70" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent authorizations</CardTitle></CardHeader>
          <CardContent>
            {top5.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No authorizations yet" description="Create a patient to get started." action={<Button asChild><Link to="/patients/new">New patient</Link></Button>} />
            ) : (
              <ul className="divide-y">
                {top5.map((a) => (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to="/authorizations/$id" params={{ id: a.id }} className="font-medium text-sm hover:underline truncate block">
                        {a.procedure_requested ?? "Untitled procedure"}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.patient?.first_name} {a.patient?.last_name} · {a.payer ?? a.patient?.insurance_payer ?? "Payer unknown"}
                      </div>
                    </div>
                    <RiskBadge score={a.denial_probability} />
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            {snap && snap.volume.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={snap.volume.filter((v) => v.count > 0)} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {snap.volume.map((_, i) => <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Skeleton className="size-full" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
