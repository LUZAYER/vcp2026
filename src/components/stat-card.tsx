import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, icon: Icon, hint, accent = "primary",
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[accent];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          {delta !== null && delta !== undefined && (
            <div className={cn("mt-2 text-xs font-medium", delta >= 0 ? "text-success" : "text-destructive")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs prev
            </div>
          )}
        </div>
        {Icon && <div className={cn("size-10 rounded-lg grid place-items-center shrink-0", accentClass)}><Icon className="size-5" /></div>}
      </div>
    </Card>
  );
}
