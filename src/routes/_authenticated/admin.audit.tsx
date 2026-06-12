import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — PriorFlow AI" }] }),
  component: AuditPage,
});

function AuditPage() {
  const list = useServerFn(listAuditLogs);
  const { data, isLoading, error } = useQuery({ queryKey: ["audit-logs"], queryFn: () => list({ data: undefined as never }) });

  if (error) return <EmptyState icon={ClipboardList} title="Admin access required" description="Only admins can view audit logs." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Privileged actions taken across the workspace.</p>
      </div>
      <Card className="p-4">
        {isLoading ? <Skeleton className="h-64 w-full" /> : (data ?? []).length === 0 ? (
          <EmptyState icon={ClipboardList} title="No audit events yet" description="Role changes, settings updates, and other privileged actions will appear here." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(l.created_at)}</TableCell>
                  <TableCell className="text-sm">{l.actor?.full_name ?? l.actor?.email ?? "system"}</TableCell>
                  <TableCell className="text-sm font-medium">{l.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entity_type ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-xs">{l.after ? JSON.stringify(l.after) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
