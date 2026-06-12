import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Download, Loader2, MessageSquare, Send, History } from "lucide-react";
import { getAppeal, updateAppealSection, transitionAppeal, addAppealNote } from "@/lib/appeals.functions";
import { exportAppealPacket } from "@/lib/appeal-export.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/status-badges";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/appeals/$id")({
  head: () => ({ meta: [{ title: "Appeal — PriorFlow AI" }] }),
  component: AppealDetail,
});

const FLOW = ["drafted", "submitted", "under_review", "approved"] as const;

function AppealDetail() {
  const { id } = useParams({ from: "/_authenticated/appeals/$id" });
  const get = useServerFn(getAppeal);
  const update = useServerFn(updateAppealSection);
  const transition = useServerFn(transitionAppeal);
  const addNote = useServerFn(addAppealNote);
  const exportPdf = useServerFn(exportAppealPacket);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["appeal", id], queryFn: () => get({ data: { id } }) });

  const [sections, setSections] = useState({ appeal_letter: "", clinical_justification: "", supporting_evidence: "", payer_response_draft: "" });
  const [noteBody, setNoteBody] = useState("");
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    if (data?.appeal) {
      setSections({
        appeal_letter: data.appeal.appeal_letter ?? "",
        clinical_justification: data.appeal.clinical_justification ?? "",
        supporting_evidence: data.appeal.supporting_evidence ?? "",
        payer_response_draft: data.appeal.payer_response_draft ?? "",
      });
    }
  }, [data?.appeal?.id]);

  const save = useMutation({
    mutationFn: (patch: Partial<typeof sections>) => update({ data: { id, patch } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["appeal", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const move = useMutation({
    mutationFn: (status: string) => transition({ data: { id, status: status as never } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["appeal", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const note = useMutation({
    mutationFn: () => addNote({ data: { appeal_id: id, body: noteBody, internal } }),
    onSuccess: () => { setNoteBody(""); toast.success("Note added"); qc.invalidateQueries({ queryKey: ["appeal", id] }); },
  });

  const downloadPdf = useMutation({
    mutationFn: () => exportPdf({ data: { appeal_id: id } }),
    onSuccess: ({ base64, filename }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState icon={MessageSquare} title="Appeal not found" />;
  const ap = data.appeal;
  const auth = ap.authorization;
  const currentIdx = Math.max(0, FLOW.indexOf(ap.status as typeof FLOW[number]));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/appeals"><ArrowLeft className="size-4" /> Appeals</Link></Button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appeal — {auth.procedure_requested ?? "Untitled"}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            <Link to="/patients/$id" params={{ id: auth.patient.id }} className="hover:underline">{auth.patient.first_name} {auth.patient.last_name}</Link>
            {" · "}{auth.payer ?? "Payer"} · v{ap.version} {ap.current && <Badge className="ml-2">Current</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild><Button variant="outline"><History className="size-4" /> Versions</Button></PopoverTrigger>
            <PopoverContent align="end">
              <div className="text-sm font-medium mb-2">Versions ({(data.versions ?? []).length})</div>
              <ul className="space-y-1 text-sm">
                {(data.versions ?? []).map((v) => (
                  <li key={v.id}><Link to="/appeals/$id" params={{ id: v.id }} className="hover:underline">v{v.version} · {v.status} · {fmtRelative(v.created_at)}</Link></li>
                ))}
                {(data.versions ?? []).length === 0 && <p className="text-muted-foreground">No prior versions.</p>}
              </ul>
            </PopoverContent>
          </Popover>
          <Button onClick={() => downloadPdf.mutate()} disabled={downloadPdf.isPending}>
            {downloadPdf.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Download className="size-4" /> Export PDF</>}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="letter">
            <TabsList>
              <TabsTrigger value="letter">Letter</TabsTrigger>
              <TabsTrigger value="justification">Clinical Justification</TabsTrigger>
              <TabsTrigger value="evidence">Supporting Evidence</TabsTrigger>
              <TabsTrigger value="payer">Payer Response</TabsTrigger>
            </TabsList>
            {(["appeal_letter","clinical_justification","supporting_evidence","payer_response_draft"] as const).map((field, i) => (
              <TabsContent key={field} value={(["letter","justification","evidence","payer"] as const)[i]} className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Textarea rows={18} value={sections[field]} onChange={(e) => setSections((p) => ({ ...p, [field]: e.target.value }))} className="font-mono text-sm" />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => save.mutate({ [field]: sections[field] })} disabled={save.isPending}>
                        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Workflow</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {FLOW.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <div className={`size-6 rounded-full grid place-items-center text-xs font-medium ${i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                    <span className={`text-sm flex-1 ${i === currentIdx ? "font-medium" : "text-muted-foreground"}`}>{s.replace("_", " ")}</span>
                    {i === currentIdx + 1 && (
                      <Button size="sm" variant="outline" onClick={() => move.mutate(s)} disabled={move.isPending}>Advance</Button>
                    )}
                  </li>
                ))}
                <li className="flex items-center gap-3">
                  <div className="size-6 rounded-full grid place-items-center text-xs bg-destructive/20 text-destructive">×</div>
                  <span className="text-sm flex-1 text-muted-foreground">Denied</span>
                  <Button size="sm" variant="outline" onClick={() => move.mutate("denied")} disabled={move.isPending}>Mark</Button>
                </li>
              </ol>
              <div className="mt-4"><StatusBadge status={ap.status} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.events.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : data.events.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{e.event_type.replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Collaboration notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Textarea rows={3} placeholder="Leave a note for your team…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
                    <Label htmlFor="internal" className="text-xs">Internal only</Label>
                  </div>
                  <Button size="sm" onClick={() => note.mutate()} disabled={!noteBody.trim() || note.isPending}>
                    <Send className="size-3.5" /> Post
                  </Button>
                </div>
              </div>
              <ul className="space-y-3">
                {data.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border p-3 text-sm">
                    {n.internal && <Badge variant="secondary" className="mb-1 text-[10px]">Internal</Badge>}
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <div className="text-xs text-muted-foreground mt-1">{fmtRelative(n.created_at)}</div>
                  </li>
                ))}
                {data.notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
