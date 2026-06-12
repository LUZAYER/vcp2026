import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtBytes, fmtRelative } from "@/lib/format";
import { getDocumentSignedUrl, deleteDocument } from "@/lib/documents.functions";
import { toast } from "sonner";
import { DOCUMENT_CATEGORIES } from "./document-uploader";

type Doc = {
  id: string; file_name: string; file_size: number | null; category: string;
  uploaded_at: string; mime_type: string | null;
};

const labelFor = (c: string) => DOCUMENT_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function DocumentList({ documents }: { documents: Doc[] }) {
  const signed = useServerFn(getDocumentSignedUrl);
  const del = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const open = useMutation({
    mutationFn: (id: string) => signed({ data: { document_id: id } }),
    onSuccess: ({ url }) => { window.open(url, "_blank"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { document_id: id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No documents yet.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {documents.map((d) => (
        <li key={d.id} className="p-3 flex items-center gap-3">
          <FileText className="size-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{d.file_name}</div>
            <div className="text-xs text-muted-foreground">{fmtBytes(d.file_size)} · {fmtRelative(d.uploaded_at)}</div>
          </div>
          <Badge variant="secondary">{labelFor(d.category)}</Badge>
          <Button size="icon" variant="ghost" onClick={() => open.mutate(d.id)} title="Preview"><Eye className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => open.mutate(d.id)} title="Download"><Download className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this document?")) remove.mutate(d.id); }} title="Delete"><Trash2 className="size-4 text-destructive" /></Button>
        </li>
      ))}
    </ul>
  );
}
