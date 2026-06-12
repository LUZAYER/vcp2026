import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon, title, description, action, className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-16 rounded-xl border border-dashed bg-card", className)}>
      <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="size-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
