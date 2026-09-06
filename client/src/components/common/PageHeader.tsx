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
    <div className="terminal-panel p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="command-badge bg-[#8A6D1F]/15 text-[#D1CEC7] border-[#8A6D1F]/40 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8A6D1F]" />
              {categoryHindi ? `${categoryHindi} · ` : ""}
              {categoryEnglish}
            </span>
            {accountBadge && (
              <span className="command-badge bg-[#1C1E22] text-[#A09D95] border-[#3A3D45]">
                {accountBadge}
              </span>
            )}
          </div>

          <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-[#FAF7F0] sm:text-3xl">
            {title}
          </h1>

          {subtitle && (
            <div className="mt-1 font-mono text-xs leading-relaxed text-[#A09D95]">
              {subtitle}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center font-mono text-xs">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
