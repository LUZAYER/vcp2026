import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, Loader2, Sparkles, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { getAuthorization, updateAuthorizationStatus } from "@/lib/authorizations.functions";
import { scoreAuthorizationRisk, draftAppealPacket } from "@/lib/ai.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRelative } from "@/lib/format";
import { toast } from "sonner";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/authorizations/$id")({
  head: () => ({ meta: [{ title: "Authorization — PriorFlow AI" }] }),
  component: AuthDetail,
});

type RiskFactor = { label: string; severity: "low" | "med" | "high"; detail: string };

function AuthDetail() {
  const { id } = useParams({ from: "/_authenticated/authorizations/$id" });
  const navigate = useNavigate();
  const get = useServerFn(getAuthorization);
  const score = useServerFn(scoreAuthorizationRisk);
  const draft = useServerFn(draftAppealPacket);
  const setStatus = useServerFn(updateAuthorizationStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["authorization", id],
    queryFn: () => get({ data: { id } }),
  });

  const runScore = useMutation({
    mutationFn: () => score({ data: { authorization_id: id } }),
    onSuccess: () => { toast.success("Risk analysis complete"); qc.invalidateQueries({ queryKey: ["authorization", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const draftAppeal = useMutation({
    mutationFn: () => draft({ data: { authorization_id: id } }),
    onSuccess: (a) => { toast.success("Appeal drafted"); navigate({ to: "/appeals/$id", params: { id: a.id } }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateStatus = useMutation({
    mutationFn: (s: string) => setStatus({ data: { id, status: s as never } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["authorization", id] }); },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState icon={AlertTriangle} title="Authorization not found" />;
  const a = data.authorization;
  const factors = (Array.isArray(a.risk_factors) ? a.risk_factors : []) as RiskFactor[];
  const actions = (Array.isArray(a.recommended_actions) ? a.recommended_actions : []) as string[];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/authorizations"><ArrowLeft className="size-4" /> Authorizations</Link></Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{a.diagnosis_code} · {a.procedure_code}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.procedure_requested ?? "Authorization"}</h1>
          <Link to="/patients/$id" params={{ id: a.patient.id }} className="text-sm text-muted-foreground hover:underline">
            {a.patient.first_name} {a.patient.last_name} · {a.patient.mrn} · {a.payer ?? a.patient.insurance_payer}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={a.status ?? "draft"} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{["draft","pending","submitted","under_review","approved","denied","appealed"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
          {a.status === "denied" && (
            <Button onClick={() => draftAppeal.mutate()} disabled={draftAppeal.isPending}>
              {draftAppeal.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Sparkles className="size-4" /> Draft appeal</>}
            </Button>
          )}
          <Button variant="outline" onClick={() => runScore.mutate()} disabled={runScore.isPending}>
            {runScore.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Brain className="size-4" /> Run AI risk analysis</>}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="risk">
        <TabsList>
          <TabsTrigger value="risk">AI Risk Analysis</TabsTrigger>
          <TabsTrigger value="details">Clinical Details</TabsTrigger>
          <TabsTrigger value="docs">Documents ({data.documents.length})</TabsTrigger>
          <TabsTrigger value="appeals">Appeals ({data.appeals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="mt-4 space-y-4">
          {a.risk_generated_at ? (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last analyzed {fmtRelative(a.risk_generated_at)} · {a.ai_model}</span>
                <span>Confidence: {Math.round((a.ai_confidence ?? 0) * 100)}%</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <RiskMetric label="Approval" value={a.approval_probability} good />
                <RiskMetric label="Denial" value={a.denial_probability} />
                <RiskMetric label="Documentation" value={a.documentation_risk} />
                <RiskMetric label="Coding" value={a.coding_risk} />
                <RiskMetric label="Payer complexity" value={a.payer_complexity} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Risk factors</CardTitle></CardHeader>
                  <CardContent>
                    {factors.length === 0 ? <p className="text-sm text-muted-foreground">None identified.</p> : (
                      <ul className="space-y-3">
                        {factors.map((f, i) => (
                          <li key={i} className="flex gap-3">
                            <span className={`size-2 rounded-full mt-1.5 shrink-0 ${f.severity === "high" ? "bg-destructive" : f.severity === "med" ? "bg-warning" : "bg-success"}`} />
                            <div>
                              <div className="text-sm font-medium">{f.label}</div>
                              <div className="text-xs text-muted-foreground">{f.detail}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Recommended actions</CardTitle></CardHeader>
                  <CardContent>
                    {actions.length === 0 ? <p className="text-sm text-muted-foreground">No actions.</p> : (
                      <ul className="space-y-2">
                        {actions.map((a, i) => <li key={i} className="text-sm flex gap-2"><span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />{a}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {a.risk_rationale && (
                <Card><CardHeader><CardTitle className="text-base">Rationale</CardTitle></CardHeader>
                  <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{a.risk_rationale}</p></CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState icon={Brain} title="No AI analysis yet" description="Run risk scoring to see approval probability, documentation gaps, coding risk, and recommended actions." action={<Button onClick={() => runScore.mutate()} disabled={runScore.isPending}>{runScore.isPending ? <Loader2 className="size-4 animate-spin" /> : "Run analysis"}</Button>} />
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm p-6">
              <KV label="Diagnosis" v={`${a.diagnosis ?? "—"} ${a.diagnosis_code ? `(${a.diagnosis_code})` : ""}`} />
              <KV label="Procedure" v={`${a.procedure_requested ?? "—"} ${a.procedure_code ? `(${a.procedure_code})` : ""}`} />
              <KV label="Payer" v={a.payer ?? "—"} />
              <KV label="Urgency" v={a.urgency ?? "—"} />
              <KV label="Referring physician" v={a.referring_physician ?? "—"} />
              <KV label="Status" v={<StatusBadge status={a.status} />} />
              <div className="sm:col-span-2"><div className="text-muted-foreground mb-1">Clinical notes</div><div className="whitespace-pre-wrap">{a.clinical_notes ?? "—"}</div></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-4 space-y-4">
          <DocumentUploader patientId={a.patient.id} authorizationId={a.id} />
          <DocumentList documents={data.documents} />
        </TabsContent>

        <TabsContent value="appeals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {data.appeals.length === 0 ? (
                <EmptyState icon={FileText} title="No appeals yet" description="If this authorization gets denied, you can draft an AI-powered appeal packet." />
              ) : (
                <ul className="divide-y">
                  {data.appeals.map((ap) => (
                    <li key={ap.id} className="p-4 flex items-center gap-3">
                      <div className="flex-1">
                        <Link to="/appeals/$id" params={{ id: ap.id }} className="font-medium hover:underline">Appeal v{ap.version}</Link>
                        <div className="text-xs text-muted-foreground">{fmtRelative(ap.created_at)}</div>
                      </div>
                      {ap.current && <Badge variant="secondary">Current</Badge>}
                      <StatusBadge status={ap.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiskMetric({ label, value, good = false }: { label: string; value: number | null; good?: boolean }) {
  const v = value ?? 0;
  // For "good" metrics (approval), color flips: high is good
  const tone = good
    ? v >= 70 ? "text-success" : v >= 40 ? "text-warning" : "text-destructive"
    : v >= 70 ? "text-destructive" : v >= 40 ? "text-warning" : "text-success";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone}`}>{value === null || value === undefined ? "—" : `${Math.round(v)}%`}</div>
      <Progress value={v} className="mt-2 h-1.5" />
    </Card>
  );
}

function KV({ label, v }: { label: string; v: React.ReactNode }) {
  return <div><div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div><div className="mt-0.5">{v}</div></div>;
}
