import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, FileText } from "lucide-react";
import { listDocuments } from "@/lib/documents.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DocumentList } from "@/components/document-list";
import { DOCUMENT_CATEGORIES } from "@/components/document-uploader";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — PriorFlow AI" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const list = useServerFn(listDocuments);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["documents", q, cat],
    queryFn: () => list({ data: { q: q || undefined, category: cat === "all" ? undefined : cat as never } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">All clinical documents across patients.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search file name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <Skeleton className="h-64 w-full" /> :
          (data ?? []).length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Upload documents from a patient profile." />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {(data ?? []).map((d) => (
                <li key={d.id} className="p-3 flex items-center gap-3">
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to="/patients/$id" params={{ id: d.patient_id }} className="font-medium text-sm hover:underline">{d.file_name}</Link>
                    {d.patient && <div className="text-xs text-muted-foreground">{d.patient.first_name} {d.patient.last_name} · {d.patient.mrn}</div>}
                  </div>
                  <span className="text-xs text-muted-foreground">{(DOCUMENT_CATEGORIES.find((c) => c.value === d.category)?.label) ?? d.category}</span>
                </li>
              ))}
            </ul>
          )
        }
      </Card>
    </div>
  );
}
