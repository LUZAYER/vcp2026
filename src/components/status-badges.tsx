import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  pending: "bg-warning/15 text-warning border-transparent",
  submitted: "bg-info/15 text-info border-transparent",
  under_review: "bg-info/15 text-info border-transparent",
  approved: "bg-success/15 text-success border-transparent",
  denied: "bg-destructive/15 text-destructive border-transparent",
  appealed: "bg-primary/15 text-primary border-transparent",
  drafted: "bg-muted text-muted-foreground border-transparent",
};

const LABELS: Record<string, string> = {
  draft: "Draft", pending: "Pending", submitted: "Submitted", under_review: "Under review",
  approved: "Approved", denied: "Denied", appealed: "Appealed", drafted: "Drafted",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "draft";
  return <Badge variant="outline" className={cn("font-medium", STYLES[s] ?? STYLES.draft)}>{LABELS[s] ?? s}</Badge>;
}

export function RiskBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <Badge variant="outline" className="text-muted-foreground">No score</Badge>;
  let tone = "bg-success/15 text-success";
  let label = "Low";
  if (score >= 30) { tone = "bg-warning/15 text-warning"; label = "Medium"; }
  if (score >= 60) { tone = "bg-destructive/15 text-destructive"; label = "High"; }
  if (score >= 80) { tone = "bg-destructive/25 text-destructive"; label = "Critical"; }
  return <Badge variant="outline" className={cn("font-medium border-transparent", tone)}>{label} · {Math.round(score)}</Badge>;
}
