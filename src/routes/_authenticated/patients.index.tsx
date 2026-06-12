import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { listPatients } from "@/lib/patients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({ meta: [{ title: "Patients — PriorFlow AI" }] }),
  component: PatientsList,
});

function PatientsList() {
  const list = useServerFn(listPatients);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: () => list({ data: { q: q || undefined } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} total</p>
        </div>
        <Button asChild><Link to="/patients/new"><Plus className="size-4" /> New patient</Link></Button>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4">
          {isLoading ? <Skeleton className="h-64 w-full" /> : data?.length === 0 ? (
            <EmptyState icon={Users} title="No patients found" description={q ? "Try a different search." : "Add your first patient to get started."} action={!q && <Button asChild><Link to="/patients/new">New patient</Link></Button>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell>
                      <Link to="/patients/$id" params={{ id: p.id }} className="font-medium hover:underline">{p.first_name} {p.last_name}</Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                    <TableCell>{fmtDate(p.dob)}</TableCell>
                    <TableCell>{p.insurance_payer ?? "—"}</TableCell>
                    <TableCell>{p.plan_type ? <Badge variant="secondary">{p.plan_type}</Badge> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
