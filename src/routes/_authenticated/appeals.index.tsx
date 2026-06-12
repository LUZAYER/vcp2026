import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { listAppeals } from "@/lib/appeals.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { fmtRelative } from "@/lib/format";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/_authenticated/appeals/")({
  head: () => ({ meta: [{ title: "Appeals — PriorFlow AI" }] }),
  component: AppealsCenter,
});

function AppealsCenter() {
  const list = useServerFn(listAppeals);
  const { data, isLoading } = useQuery({ queryKey: ["appeals"], queryFn: () => list({ data: {} }) });

  const counts = (status: string) => (data ?? []).filter((a) => a.status === status).length;
  const wins = (data ?? []).filter((a) => a.outcome === "approved").length;
  const decided = (data ?? []).filter((a) => a.outcome === "approved" || a.outcome === "denied").length;
  const winRate = decided ? Math.round((wins / decided) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appeals Center</h1>
        <p className="text-sm text-muted-foreground">Track and manage payer appeals.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Drafted" value={counts("drafted")} accent="primary" />
        <StatCard label="Submitted" value={counts("submitted")} accent="info" />
        <StatCard label="Won" value={counts("approved")} accent="success" />
        <StatCard label="Win rate" value={`${winRate}%`} accent="success" hint={`${wins} of ${decided} decided`} />
      </div>

      <Card className="p-4">
        {isLoading ? <Skeleton className="h-64 w-full" /> :
          (data ?? []).length === 0 ? <EmptyState icon={Scale} title="No appeals yet" description="When an authorization is denied, draft an AI-powered appeal from that authorization page." /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((a) => {
                const auth = a.authorization;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to="/appeals/$id" params={{ id: a.id }} className="font-medium hover:underline">{auth?.patient?.first_name} {auth?.patient?.last_name}</Link>
                      <div className="text-xs text-muted-foreground font-mono">{auth?.patient?.mrn}</div>
                    </TableCell>
                    <TableCell><div className="text-sm">{auth?.procedure_requested ?? "—"}</div><div className="text-xs text-muted-foreground">{auth?.diagnosis ?? ""}</div></TableCell>
                    <TableCell className="text-sm">{auth?.payer ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">v{a.version}</Badge> {a.current && <Badge className="ml-1">Current</Badge>}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtRelative(a.updated_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
