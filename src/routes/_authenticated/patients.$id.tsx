import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, ShieldCheck, FileText, Activity as ActivityIcon, Plus, ClipboardList } from "lucide-react";
import { getPatient } from "@/lib/patients.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fmtDate, fmtDateTime, fmtRelative, initials } from "@/lib/format";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({ meta: [{ title: "Patient — PriorFlow AI" }] }),
  component: PatientProfile,
});

function PatientProfile() {
  const { id } = useParams({ from: "/_authenticated/patients/$id" });
  const get = useServerFn(getPatient);
  const { data, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState icon={ClipboardList} title="Patient not found" />;
  const { patient, authorizations, documents, activity } = data;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild><Link to="/patients"><ArrowLeft className="size-4" /> Patients</Link></Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Avatar className="size-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials(`${patient.first_name} ${patient.last_name}`)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{patient.first_name} {patient.last_name}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
            <span className="font-mono">{patient.mrn}</span>
            {patient.dob && <span className="flex items-center gap-1"><Calendar className="size-3.5" />{fmtDate(patient.dob)}</span>}
            {patient.gender && <span>{patient.gender}</span>}
          </div>
        </div>
        <Button asChild><Link to="/patients/new"><Plus className="size-4" /> New authorization</Link></Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="auths">Authorizations ({authorizations.length})</TabsTrigger>
          <TabsTrigger value="docs">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Demographics</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <KV label="DOB" value={fmtDate(patient.dob)} />
              <KV label="Gender" value={patient.gender ?? "—"} />
              {patient.phone && <KV label="Phone" value={patient.phone} icon={Phone} />}
              {patient.email && <KV label="Email" value={patient.email} icon={Mail} />}
              <KV label="Address" value={[patient.address_street, patient.address_city, patient.address_state, patient.address_zip].filter(Boolean).join(", ") || "—"} icon={MapPin} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Insurance</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <KV label="Payer" value={patient.insurance_payer ?? "—"} />
              <KV label="Plan type" value={patient.plan_type ?? "—"} />
              <KV label="Member ID" value={patient.insurance_member_id ?? "—"} />
              <KV label="Group #" value={patient.insurance_group ?? "—"} />
              <KV label="Relationship" value={patient.subscriber_relationship ?? "—"} />
              <KV label="Effective" value={fmtDate(patient.effective_date)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auths" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {authorizations.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No authorizations" description="Start one to score risk and draft appeals." />
              ) : (
                <ul className="divide-y">
                  {authorizations.map((a) => (
                    <li key={a.id} className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <Link to="/authorizations/$id" params={{ id: a.id }} className="font-medium hover:underline">
                          {a.procedure_requested ?? "Untitled procedure"}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {a.diagnosis ?? "—"} {a.diagnosis_code ? `(${a.diagnosis_code})` : ""} · {a.payer ?? "Payer"} · {fmtRelative(a.created_at)}
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
        </TabsContent>

        <TabsContent value="docs" className="mt-4 space-y-4">
          <DocumentUploader patientId={id} />
          <DocumentList documents={documents} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {activity.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No activity yet" />
              ) : (
                <ol className="relative border-l border-border ml-4">
                  {activity.map((e) => (
                    <li key={e.id} className="ml-6 mb-6">
                      <span className="absolute -left-1.5 size-3 rounded-full bg-primary border-2 border-background" />
                      <div className="font-medium text-sm">{prettyAction(e.action)}</div>
                      <div className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</div>
                      {e.detail && Object.keys(e.detail as object).length > 0 && (
                        <div className="text-xs mt-1 text-muted-foreground">{JSON.stringify(e.detail)}</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KV({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 truncate">{Icon && <Icon className="size-3.5 text-muted-foreground" />}{value}</span>
    </div>
  );
}

function prettyAction(a: string) {
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
