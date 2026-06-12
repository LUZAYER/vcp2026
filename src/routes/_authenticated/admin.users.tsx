import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { listUsers, setUserRole, setUserStatus } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { fmtRelative } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — PriorFlow AI" }] }),
  component: UsersPage,
});

function UsersPage() {
  const list = useServerFn(listUsers);
  const setRole = useServerFn(setUserRole);
  const setStatus = useServerFn(setUserStatus);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => list({ data: undefined as never }) });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: AppRole }) => setRole({ data: v }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const statusMut = useMutation({
    mutationFn: (v: { user_id: string; status: "active" | "suspended" | "invited" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  if (error) return <EmptyState icon={Users} title="Admin access required" description="Only admins can manage users." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Roles and access for your team.</p>
      </div>
      <Card className="p-4">
        {isLoading ? <Skeleton className="h-64 w-full" /> : (data ?? []).length === 0 ? (
          <EmptyState icon={Users} title="No users yet" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    {u.title && <div className="text-xs text-muted-foreground">{u.title}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.roles[0] ?? "clinical_staff"} onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as AppRole })}>
                      <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={u.status ?? "active"} onValueChange={(v) => statusMut.mutate({ user_id: u.id, status: v as never })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{["active","invited","suspended"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(u.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
