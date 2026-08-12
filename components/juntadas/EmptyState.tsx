import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-6 py-8 text-center",
        className
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground-2" strokeWidth={1.5} />
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
