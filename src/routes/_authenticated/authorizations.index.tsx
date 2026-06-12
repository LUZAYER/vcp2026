import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Filter } from "lucide-react";
import { listAuthorizations } from "@/lib/authorizations.functions";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/authorizations/")({
  head: () => ({ meta: [{ title: "Authorizations — PriorFlow AI" }] }),
  component: AuthList,
});

const STATUSES = ["all","draft","pending","submitted","under_review","approved","denied","appealed"];

function AuthList() {
  const list = useServerFn(listAuthorizations);
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["authorizations", status],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Authorizations</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} requests</p>
        </div>
      </div>
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> :
          (data ?? []).length === 0 ? <EmptyState icon={ShieldCheck} title="No authorizations" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link to="/authorizations/$id" params={{ id: a.id }} className="font-medium hover:underline">{a.patient?.first_name} {a.patient?.last_name}</Link>
                    <div className="text-xs text-muted-foreground font-mono">{a.patient?.mrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{a.procedure_requested ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.diagnosis ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{a.payer ?? a.patient?.insurance_payer ?? "—"}</TableCell>
                  <TableCell><RiskBadge score={a.denial_probability} /></TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(a.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
