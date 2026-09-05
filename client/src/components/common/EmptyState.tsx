import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-saffron/30 bg-saffron/10 text-saffron-dark shadow-xs">
        {icon}
      </div>

      <h3 className="mt-4 font-serif text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>

      {(actionLabel || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionHref && (
            <Button
              asChild
              className="bg-saffron text-slate-900 hover:bg-saffron/90 font-bold text-xs h-9 px-4 shadow-xs"
            >
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          )}
          {actionLabel && onAction && !actionHref && (
            <Button
              onClick={onAction}
              className="bg-saffron text-slate-900 hover:bg-saffron/90 font-bold text-xs h-9 px-4 shadow-xs"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
