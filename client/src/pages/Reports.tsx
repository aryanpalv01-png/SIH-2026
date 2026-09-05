import { useAuth } from "@/_core/hooks/useAuth";
import { StatusSeal } from "@/components/StatusSeal";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import { formatDate, formatDocumentType, statusMeta } from "@/lib/veriscan";
import { ArrowRight, CheckCircle2, CircleAlert, FileCheck2, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

export default function Reports() {
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const scansQuery = trpc.scans.list.useQuery(undefined, { retry: false });

  const documents = useMemo(() => {
    if (scansQuery.data && Array.isArray(scansQuery.data) && scansQuery.data.length > 0) {
      return (scansQuery.data as any[]).map((doc) => ({
        id: String(doc.id),
        filename: doc.fileName || "Document",
        documentType: doc.documentType || "other",
        type: (doc.documentType as any) || "other",
        status: (doc.status as any) || "verified",
        score: doc.confidenceScore ?? 85,
        uploadedAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        reference: doc.sha256Hash ? doc.sha256Hash.slice(0, 16).toUpperCase() : `VS-IN-${doc.id}`,
        fileSize: `${Math.round((doc.fileSize ?? 102400) / 1024)} KB`,
        mimeType: doc.mimeType || "application/pdf",
        checks: [],
      }));
    }
    return getPreviewDocuments(userIdentifier);
  }, [scansQuery.data, userIdentifier]);

  const verified = documents.filter((document) => document.status === "verified").length;
  const review = documents.filter((document) => document.status === "needs_review").length;
  const forged = documents.filter((document) => document.status === "likely_forged").length;

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      {/* Top Banner */}
      <PageHeader
        categoryHindi="सत्यापन रिपोर्ट सारांश"
        categoryEnglish="Verification Report Ledger"
        title="Forensic Verdict Reports"
        subtitle={
          <>
            Structured breakdown of forensic integrity outcomes for account: <span className="font-mono text-xs font-semibold text-slate-800">{user?.email || "Local Officer"}</span>
          </>
        }
        accountBadge={user?.email ? `Vault: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button size="sm" className="h-9 gap-1.5 rounded-lg bg-saffron text-slate-950 font-bold hover:bg-saffron-dark hover:text-white shadow-xs">
              <FileCheck2 className="h-4 w-4" /> New Verification
            </Button>
          </Link>
        }
      />

      {/* 3 Verdict Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <VerdictCard
          icon={<CheckCircle2 className="h-5 w-5 text-india-green" />}
          status="verified"
          count={verified}
          label="Genuine / Verified"
          body="No material visual or structural anomalies detected"
        />
        <VerdictCard
          icon={<CircleAlert className="h-5 w-5 text-amber-600" />}
          status="needs_review"
          count={review}
          label="Human Review Required"
          body="Inconclusive indicators or typography boundary variations"
        />
        <VerdictCard
          icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
          status="likely_forged"
          count={forged}
          label="Likely Tampered"
          body="Copy-move clone detected, OCR mismatch, or ELA recompression"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <span className="gov-pill text-[10px]">Document Ledger</span>
            <h2 className="mt-1.5 font-serif text-xl font-bold text-slate-900">Inspect Individual Reports</h2>
          </div>
          <Link href="/history" className="inline-flex items-center text-xs font-bold text-saffron-dark hover:text-saffron gap-1">
            Search Archive <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <Link
                href={`/report/${document.id}`}
                key={document.id}
                className="group flex flex-col gap-4 py-4.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-3 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <StatusSeal status={document.status} size="md" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-saffron-dark transition-colors">
                      {document.filename}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDocumentType(document.type)} · {formatDate(document.uploadedAt)} · Ref: <span className="font-mono text-slate-700">{document.reference}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-8 pl-13 sm:justify-end sm:pl-0">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Confidence</p>
                    <p className="mt-0.5 font-serif text-base font-bold text-slate-900">
                      {document.score}
                      <span className="font-sans text-xs font-normal text-slate-500">/100</span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-saffron-dark inline-flex items-center">
                    View full report <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No reports generated for this account"
              description="Screen your first document to populate this integrity ledger."
              actionLabel="Screen a Document"
              actionHref="/verify"
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-600 shadow-xs">
        <ShieldAlert className="h-4 w-4 shrink-0 text-saffron-dark" />
        <span>All forensic reports are generated using algorithmic preflight, computer vision (OpenCV/ELA), and localized deep models under strict data isolation.</span>
      </div>
    </div>
  );
}

function VerdictCard({ icon, status, count, label, body }: { icon: React.ReactNode; status: "verified" | "needs_review" | "likely_forged"; count: number; label: string; body: string }) {
  const borderTone =
    status === "verified" ? "border-india-green/30 bg-india-green/5" :
    status === "needs_review" ? "border-amber-300 bg-amber-50/70" :
    "border-rose-200 bg-rose-50/70";

  return (
    <div className={`rounded-2xl border p-5 shadow-xs transition-all hover:-translate-y-0.5 ${borderTone}`}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-2xs">
          {icon}
        </span>
        <span className="font-serif text-3xl font-bold text-slate-900">{String(count).padStart(2, "0")}</span>
      </div>
      <p className="mt-4 font-serif text-lg font-bold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}


