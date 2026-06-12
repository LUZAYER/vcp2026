import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createPatientWithAuth } from "@/lib/patients.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients/new")({
  head: () => ({ meta: [{ title: "New patient — PriorFlow AI" }] }),
  component: NewPatient,
});

const PAYERS = ["UnitedHealthcare","Aetna","Blue Cross Blue Shield","Cigna","Humana","Medicare","Medicaid","Kaiser Permanente","Anthem","Other"];
const PLANS = ["PPO","HMO","EPO","POS","Medicare","Medicaid","Other"];

type Form = {
  // step 1
  mrn?: string; first_name: string; last_name: string; dob?: string; gender?: string;
  phone?: string; email?: string; address_street?: string; address_city?: string; address_state?: string; address_zip?: string;
  // step 2
  insurance_payer?: string; insurance_member_id?: string; insurance_group?: string;
  plan_type?: string; subscriber_relationship?: string; effective_date?: string;
  // step 3
  referring_physician?: string; diagnosis?: string; diagnosis_code?: string;
  procedure_requested?: string; procedure_code?: string; clinical_notes?: string; urgency?: string;
};

const STEPS = ["Patient Information", "Insurance Information", "Clinical Information", "Review & Submit"];

function NewPatient() {
  const navigate = useNavigate();
  const create = useServerFn(createPatientWithAuth);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ first_name: "", last_name: "", urgency: "routine", subscriber_relationship: "self" });

  const mut = useMutation({
    mutationFn: () => create({
      data: {
        patient: {
          mrn: form.mrn, first_name: form.first_name, last_name: form.last_name,
          dob: form.dob || undefined, gender: form.gender, phone: form.phone, email: form.email,
          address_street: form.address_street, address_city: form.address_city, address_state: form.address_state, address_zip: form.address_zip,
          insurance_payer: form.insurance_payer, insurance_member_id: form.insurance_member_id,
          insurance_group: form.insurance_group, plan_type: form.plan_type,
          subscriber_relationship: form.subscriber_relationship, effective_date: form.effective_date || undefined,
        },
        authorization: {
          diagnosis: form.diagnosis, diagnosis_code: form.diagnosis_code,
          procedure_requested: form.procedure_requested, procedure_code: form.procedure_code,
          payer: form.insurance_payer, urgency: form.urgency,
          clinical_notes: form.clinical_notes, referring_physician: form.referring_physician,
        },
      },
    }),
    onSuccess: (r) => { toast.success("Patient created"); navigate({ to: "/patients/$id", params: { id: r.patient.id } }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
  const canNext = () => {
    if (step === 0) return form.first_name.trim() && form.last_name.trim();
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New patient intake</h1>
        <p className="text-sm text-muted-foreground mt-1">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        <div className="mt-3 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>MRN (optional)</Label><Input value={form.mrn ?? ""} onChange={(e) => set("mrn", e.target.value)} placeholder="Auto-generated if blank" /></div>
              <div /> 
              <div className="space-y-2"><Label>First name *</Label><Input required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
              <div className="space-y-2"><Label>Last name *</Label><Input required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
              <div className="space-y-2"><Label>Date of birth</Label><Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{["Female","Male","Non-binary","Other","Prefer not to say"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Street address</Label><Input value={form.address_street ?? ""} onChange={(e) => set("address_street", e.target.value)} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.address_city ?? ""} onChange={(e) => set("address_city", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>State</Label><Input value={form.address_state ?? ""} onChange={(e) => set("address_state", e.target.value)} /></div>
                <div className="space-y-2"><Label>ZIP</Label><Input value={form.address_zip ?? ""} onChange={(e) => set("address_zip", e.target.value)} /></div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Primary payer</Label>
                <Select value={form.insurance_payer ?? ""} onValueChange={(v) => set("insurance_payer", v)}>
                  <SelectTrigger><SelectValue placeholder="Select payer…" /></SelectTrigger>
                  <SelectContent>{PAYERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Plan type</Label>
                <Select value={form.plan_type ?? ""} onValueChange={(v) => set("plan_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Plan…" /></SelectTrigger>
                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Member ID</Label><Input value={form.insurance_member_id ?? ""} onChange={(e) => set("insurance_member_id", e.target.value)} /></div>
              <div className="space-y-2"><Label>Group #</Label><Input value={form.insurance_group ?? ""} onChange={(e) => set("insurance_group", e.target.value)} /></div>
              <div className="space-y-2"><Label>Subscriber relationship</Label>
                <Select value={form.subscriber_relationship ?? "self"} onValueChange={(v) => set("subscriber_relationship", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["self","spouse","child","other"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Effective date</Label><Input type="date" value={form.effective_date ?? ""} onChange={(e) => set("effective_date", e.target.value)} /></div>
            </div>
          )}
          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Referring physician</Label><Input value={form.referring_physician ?? ""} onChange={(e) => set("referring_physician", e.target.value)} placeholder="Dr. Jane Smith" /></div>
              <div className="space-y-2"><Label>Primary diagnosis</Label><Input value={form.diagnosis ?? ""} onChange={(e) => set("diagnosis", e.target.value)} placeholder="e.g. Lumbar disc herniation" /></div>
              <div className="space-y-2"><Label>ICD-10 code</Label><Input value={form.diagnosis_code ?? ""} onChange={(e) => set("diagnosis_code", e.target.value)} placeholder="M51.26" /></div>
              <div className="space-y-2"><Label>Procedure requested</Label><Input value={form.procedure_requested ?? ""} onChange={(e) => set("procedure_requested", e.target.value)} placeholder="MRI lumbar spine" /></div>
              <div className="space-y-2"><Label>CPT code</Label><Input value={form.procedure_code ?? ""} onChange={(e) => set("procedure_code", e.target.value)} placeholder="72148" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Urgency</Label>
                <Select value={form.urgency ?? "routine"} onValueChange={(v) => set("urgency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["routine","urgent","stat"].map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2"><Label>Clinical notes</Label><Textarea rows={6} value={form.clinical_notes ?? ""} onChange={(e) => set("clinical_notes", e.target.value)} placeholder="Symptoms, prior treatments, examination findings, imaging summary…" /></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <Section title="Patient" data={{ Name: `${form.first_name} ${form.last_name}`, MRN: form.mrn ?? "Auto", DOB: form.dob, Gender: form.gender, Phone: form.phone, Email: form.email, Address: [form.address_street, form.address_city, form.address_state, form.address_zip].filter(Boolean).join(", ") }} />
              <Section title="Insurance" data={{ Payer: form.insurance_payer, "Plan type": form.plan_type, "Member ID": form.insurance_member_id, "Group #": form.insurance_group, Relationship: form.subscriber_relationship, "Effective": form.effective_date }} />
              <Section title="Clinical" data={{ "Referring physician": form.referring_physician, Diagnosis: `${form.diagnosis ?? ""} ${form.diagnosis_code ? `(${form.diagnosis_code})` : ""}`, Procedure: `${form.procedure_requested ?? ""} ${form.procedure_code ? `(${form.procedure_code})` : ""}`, Urgency: form.urgency, Notes: form.clinical_notes }} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ArrowLeft className="size-4" /> Back</Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="size-4" /></Button>
        ) : (
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Create patient</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({ title, data }: { title: string; data: Record<string, string | null | undefined> }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">{title}</div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-muted-foreground min-w-32">{k}</span>
            <span className="text-foreground truncate">{v || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
