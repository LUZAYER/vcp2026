import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyProfile, updateProfile } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/permissions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PriorFlow AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { roles } = useAuth();
  const getProf = useServerFn(getMyProfile);
  const upProf = useServerFn(updateProfile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProf({ data: undefined as never }) });
  const [full_name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDept] = useState("");
  const [npi, setNpi] = useState("");

  const save = useMutation({
    mutationFn: () => upProf({ data: { full_name, title, department, npi } }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;
  const p = data.profile;
  if (full_name === "" && p?.full_name) setName(p.full_name);
  if (title === "" && p?.title) setTitle(p.title);
  if (department === "" && p?.department) setDept(p.department);
  if (npi === "" && p?.npi) setNpi(p.npi);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Personal settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, preferences and notifications.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full name</Label><Input value={full_name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={p?.email ?? ""} disabled /></div>
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Authorization Specialist" /></div>
            <div className="space-y-2"><Label>Department</Label><Input value={department} onChange={(e) => setDept(e.target.value)} placeholder="e.g. Orthopedics" /></div>
            <div className="space-y-2"><Label>NPI</Label><Input value={npi} onChange={(e) => setNpi(e.target.value)} placeholder="National Provider Identifier" /></div>
            <div className="space-y-2"><Label>Roles</Label><div className="flex gap-1 flex-wrap pt-2">{roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r]}</Badge>)}</div></div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs"><Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["light","dark","system"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { k: "auth_status_change", l: "Authorization status changes" },
            { k: "appeal_update", l: "Appeal updates" },
            { k: "high_risk", l: "High-risk alerts" },
            { k: "mention", l: "@mentions in collaboration notes" },
          ].map((n) => (
            <div key={n.k} className="flex items-center justify-between">
              <Label className="text-sm">{n.l}</Label>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
