import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Organization — PriorFlow AI" }] }),
  component: OrgSettings,
});

function OrgSettings() {
  const { isAdmin, loading } = useAuth();
  const get = useServerFn(getSettings);
  const update = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["app-settings"], queryFn: () => get({ data: undefined as never }), enabled: !loading });
  const [name, setName] = useState("");
  const [payer, setPayer] = useState("");

  useEffect(() => { if (data) { setName(data.organization_name ?? ""); setPayer(data.default_payer ?? ""); } }, [data?.id]);

  const save = useMutation({
    mutationFn: () => update({ data: { organization_name: name, default_payer: payer } }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["app-settings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (loading) return <Skeleton className="h-64" />;
  if (!isAdmin) return <EmptyState icon={ShieldAlert} title="Admin access required" description="Only admins can manage organization settings." />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">Workspace-wide preferences.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Organization name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Default payer</Label><Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="e.g. UnitedHealthcare" /></div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>· Row-level security is enabled on every clinical table.</p>
          <p>· The first signup automatically becomes admin; subsequent signups default to Clinical Staff.</p>
          <p>· All AI analysis runs server-side via the Lovable AI Gateway — no patient data ever reaches the browser unencrypted.</p>
        </CardContent>
      </Card>
    </div>
  );
}
