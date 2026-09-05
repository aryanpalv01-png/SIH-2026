import { ReactNode } from "react";

interface StatMetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
  accent?: "saffron" | "green" | "review" | "navy" | "crimson";
  trend?: {
    text: string;
    positive?: boolean;
  };
}

export function StatMetricCard({
  icon,
  label,
  value,
  note,
  accent = "saffron",
  trend,
}: StatMetricCardProps) {
  const accentStyles = {
    saffron: {
      iconBg: "bg-saffron/10 border-saffron/30 text-saffron-dark",
      glow: "hover:border-saffron/50",
    },
    green: {
      iconBg: "bg-india-green/10 border-india-green/30 text-india-green",
      glow: "hover:border-india-green/50",
    },
    review: {
      iconBg: "bg-amber-500/10 border-amber-500/30 text-amber-600",
      glow: "hover:border-amber-500/50",
    },
    navy: {
      iconBg: "bg-ashoka/10 border-ashoka/30 text-ashoka",
      glow: "hover:border-ashoka/50",
    },
    crimson: {
      iconBg: "bg-red-500/10 border-red-500/30 text-red-600",
      glow: "hover:border-red-500/50",
    },
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${accentStyles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accentStyles.iconBg} transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <p className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {value}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-slate-500">{note}</p>
          {trend && (
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                trend.positive
                  ? "bg-india-green/10 text-india-green"
                  : "bg-amber-500/10 text-amber-700"
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
