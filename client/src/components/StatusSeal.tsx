import { Check, CircleAlert, CircleDashed, ShieldAlert } from "lucide-react";
import { CheckResult, DocumentStatus, getResultLabel, statusMeta } from "@/lib/veriscan";

const statusIcons = {
  verified: Check,
  review: CircleAlert,
  forged: ShieldAlert,
} as const;

export function StatusSeal({ status, size = "md" }: { status: DocumentStatus; size?: "sm" | "md" | "lg" }) {
  const meta = statusMeta[status];
  const Icon = statusIcons[meta.tone];
  const sizeClasses = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconClasses = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <span className={`seal seal-${meta.tone} ${sizeClasses}`} role="img" aria-label={meta.label}>
      <Icon className={iconClasses} strokeWidth={size === "lg" ? 1.5 : 2} />
    </span>
  );
}

export function CheckSeal({ result, size = "sm" }: { result: CheckResult; size?: "sm" | "md" }) {
  const Icon = result === "pass" ? Check : result === "flag" ? CircleAlert : CircleDashed;
  const tone = result === "pass" ? "seal-verified" : result === "flag" ? "seal-review" : "seal-neutral";
  const label = getResultLabel(result);
  return (
    <span className={`seal ${tone} ${size === "md" ? "h-8 w-8" : "h-7 w-7"}`} role="img" aria-label={label}>
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2} />
    </span>
  );
}
