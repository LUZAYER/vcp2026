import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "@/lib/documents.functions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { fmtBytes } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "clinical_note", label: "Clinical Note" },
  { value: "physician_order", label: "Physician Order" },
  { value: "mri_report", label: "MRI Report" },
  { value: "ct_report", label: "CT Report" },
  { value: "xray_report", label: "X-Ray Report" },
  { value: "lab_result", label: "Lab Result" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
] as const;

type Cat = (typeof CATEGORIES)[number]["value"];

type Item = { file: File; category: Cat; progress: number; done: boolean; error?: string };

export function DocumentUploader({ patientId, authorizationId, onUploaded }: { patientId: string; authorizationId?: string | null; onUploaded?: () => void }) {
  const upload = useServerFn(uploadDocument);
  const qc = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setItems((prev) => [...prev, ...accepted.map((f) => ({
      file: f, category: inferCategory(f.name), progress: 0, done: false,
    }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 20 * 1024 * 1024,
    accept: { "application/pdf": [".pdf"], "image/jpeg": [".jpg",".jpeg"], "image/png": [".png"], "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
  });

  const setCategory = (i: number, cat: Cat) => setItems((p) => p.map((it, idx) => idx === i ? { ...it, category: cat } : it));
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const uploadAll = async () => {
    if (items.length === 0) return;
    setBusy(true);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.done) continue;
      try {
        const base64 = await fileToBase64(it.file);
        setItems((p) => p.map((x, idx) => idx === i ? { ...x, progress: 60 } : x));
        await upload({ data: {
          patient_id: patientId,
          authorization_id: authorizationId ?? null,
          category: it.category,
          file_name: it.file.name,
          mime_type: it.file.type || "application/octet-stream",
          file_size: it.file.size,
          base64,
        } });
        setItems((p) => p.map((x, idx) => idx === i ? { ...x, progress: 100, done: true } : x));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setItems((p) => p.map((x, idx) => idx === i ? { ...x, error: msg, progress: 0 } : x));
        toast.error(msg);
      }
    }
    setBusy(false);
    toast.success("Documents uploaded");
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["patient"] });
    setTimeout(() => setItems((p) => p.filter((x) => !x.done)), 600);
    onUploaded?.();
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="size-8 mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">{isDragActive ? "Drop files here" : "Drag & drop or click to upload"}</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, DOCX · up to 20 MB</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <FileText className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.file.name}</div>
                <div className="text-xs text-muted-foreground">{fmtBytes(it.file.size)}</div>
                {it.progress > 0 && <Progress value={it.progress} className="h-1 mt-1" />}
                {it.error && <div className="text-xs text-destructive mt-1">{it.error}</div>}
              </div>
              <Select value={it.category} onValueChange={(v) => setCategory(i, v as Cat)} disabled={busy}>
                <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => remove(i)} disabled={busy}><X className="size-4" /></Button>
            </div>
          ))}
          <Button onClick={uploadAll} disabled={busy || items.every((x) => x.done)} className="w-full">
            {busy ? <><Loader2 className="size-4 animate-spin" /> Uploading…</> : `Upload ${items.filter((x) => !x.done).length} file${items.filter((x) => !x.done).length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function inferCategory(name: string): Cat {
  const n = name.toLowerCase();
  if (n.includes("mri")) return "mri_report";
  if (n.includes("ct")) return "ct_report";
  if (n.includes("xray") || n.includes("x-ray")) return "xray_report";
  if (n.includes("lab")) return "lab_result";
  if (n.includes("order")) return "physician_order";
  if (n.includes("referral")) return "referral";
  if (n.includes("note")) return "clinical_note";
  return "other";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      res(result.split(",")[1]);
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export const DOCUMENT_CATEGORIES = CATEGORIES;
