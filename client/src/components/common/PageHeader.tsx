import { ReactNode } from "react";

interface PageHeaderProps {
  categoryHindi?: string;
  categoryEnglish: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  accountBadge?: string;
}

export function PageHeader({
  categoryHindi,
  categoryEnglish,
  title,
  subtitle,
  actions,
  accountBadge,
}: PageHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <div className="tiranga-stripe" />
      <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="gov-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron animate-pulse" />
              {categoryHindi ? `${categoryHindi} · ` : ""}
              {categoryEnglish}
            </span>
            {accountBadge && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                {accountBadge}
              </span>
            )}
          </div>

          <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
            {title}
          </h1>

          {subtitle && (
            <div className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {subtitle}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
