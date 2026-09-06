import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import { formatDate, formatDocumentType, statusMeta, DocumentStatus } from "@/lib/veriscan";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  HelpCircle,
} from "lucide-react";
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
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Top Banner */}
      <PageHeader
        categoryHindi="सत्यापन रिपोर्ट सारांश"
        categoryEnglish="VERDICT_DOSSIERS // AUDIT_SUMMARY"
        title="Forensic Verdict Ledgers"
        subtitle={
          <>
            Evidentiary breakdown of document screening outcomes for vault: <span className="text-[#FAF7F0] font-semibold">{user?.email || "LOCAL_OFFICER"}</span>
          </>
        }
        accountBadge={user?.email ? `VAULT: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button
              size="sm"
              className="h-8 gap-1.5 border border-[#8A6D1F] bg-[#8A6D1F] text-[#FAF7F0] hover:bg-[#8A6D1F]/80 font-mono text-[11px] font-bold"
            >
              <FileCheck2 className="h-3.5 w-3.5" /> [NEW_VERIFICATION]
            </Button>
          </Link>
        }
      />

      {/* 3 Verdict Metric Cards */}
      <div className="grid gap-3 md:grid-cols-3 font-mono">
        <VerdictCard
          icon={<CheckCircle2 className="h-4 w-4 text-[#22C55E]" />}
          status="verified"
          count={verified}
          label="GENUINE / VERIFIED"
          body="No material visual, typographic, or mathematical anomalies detected"
        />
        <VerdictCard
          icon={<CircleAlert className="h-4 w-4 text-amber-400" />}
          status="needs_review"
          count={review}
          label="HUMAN REVIEW REQUIRED"
          body="Inconclusive indicators or typography boundary variations"
        />
        <VerdictCard
          icon={<ShieldAlert className="h-4 w-4 text-rose-400" />}
          status="likely_forged"
          count={forged}
          label="LIKELY TAMPERED"
          body="Copy-move clone detected, OCR mismatch, or ELA recompression"
        />
      </div>

      <section className="terminal-panel font-mono text-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-[#3A3D45] p-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-[10px] text-[#A09D95] uppercase tracking-wider">
              DOSSIER_RECORDS ({documents.length})
            </span>
            <h2 className="font-serif text-base font-bold text-[#FAF7F0] mt-0.5">
              Inspect Individual Forensic Reports
            </h2>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center text-[11px] font-bold text-[#8A6D1F] hover:text-[#FAF7F0] gap-1 transition-colors"
          >
            [SEARCH_ARCHIVE] <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="dossier-table w-full text-left">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">REF_ID</th>
                  <th className="py-2.5 px-3">DOCUMENT_FILE</th>
                  <th className="py-2.5 px-3">TYPE</th>
                  <th className="py-2.5 px-3">TIMESTAMP</th>
                  <th className="py-2.5 px-3 text-right">SCORE</th>
                  <th className="py-2.5 px-3">VERDICT</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const isVerified = doc.status === "verified";
                  const isForged = doc.status === "likely_forged";

                  return (
                    <tr key={doc.id} className="hover:bg-[#1C1E22] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#8A6D1F]">{doc.reference}</td>
                      <td className="py-2.5 px-3 font-bold text-[#FAF7F0] max-w-xs truncate">{doc.filename}</td>
                      <td className="py-2.5 px-3 text-[10.5px] text-[#A09D95] uppercase">{formatDocumentType(doc.type)}</td>
                      <td className="py-2.5 px-3 text-[10.5px] text-[#A09D95]">{formatDate(doc.uploadedAt)}</td>
                      <td className="py-2.5 px-3 text-right font-serif text-sm font-bold">
                        <span className={isVerified ? "text-[#22C55E]" : isForged ? "text-rose-400" : "text-amber-400"}>
                          {doc.score}
                        </span>
                        <span className="font-sans text-[10px] text-[#A09D95]"> / 100</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`command-badge text-[10px] font-bold ${
                            isVerified
                              ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30"
                              : isForged
                              ? "bg-rose-950/60 text-rose-400 border-rose-800"
                              : "bg-amber-950/60 text-amber-400 border-amber-800"
                          }`}
                        >
                          [{statusMeta[doc.status as DocumentStatus]?.label?.toUpperCase() || "UNKNOWN"}]
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/report/${doc.id}`}
                          className="inline-flex items-center gap-1 border border-[#3A3D45] bg-[#1C1E22] px-2 py-1 text-[10.5px] text-[#FAF7F0] hover:border-[#8A6D1F] hover:bg-[#26282D] transition-colors"
                        >
                          [VIEW_DOSSIER] <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 p-4">
            <EmptyState
              icon={<Sparkles className="h-6 w-6 text-[#8A6D1F]" />}
              title="NO_REPORTS_GENERATED"
              description="Screen your first document to populate this integrity ledger."
              actionLabel="[SCREEN_DOCUMENT]"
              actionHref="/verify"
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 border border-[#3A3D45] bg-[#1C1E22] p-3 font-mono text-[10.5px] text-[#A09D95]">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[#8A6D1F]" />
        <span>All forensic dossiers are compiled via cryptographic preflight, computer vision (OpenCV/ELA), and localized neural inference under strict session isolation.</span>
      </div>
    </div>
  );
}

function VerdictCard({
  icon,
  status,
  count,
  label,
  body,
}: {
  icon: React.ReactNode;
  status: "verified" | "needs_review" | "likely_forged";
  count: number;
  label: string;
  body: string;
}) {
  const borderTone =
    status === "verified"
      ? "border-[#22C55E]/40 bg-[#1C1E22]"
      : status === "needs_review"
      ? "border-amber-500/40 bg-[#1C1E22]"
      : "border-rose-500/40 bg-[#1C1E22]";

  return (
    <div className={`terminal-panel p-4 border ${borderTone}`}>
      <div className="flex items-center justify-between border-b border-[#3A3D45] pb-2">
        <span className="flex h-7 w-7 items-center justify-center border border-[#3A3D45] bg-[#26282D]">
          {icon}
        </span>
        <span className="font-serif text-2xl font-bold text-[#FAF7F0]">{String(count).padStart(2, "0")}</span>
      </div>
      <p className="mt-3 font-mono text-xs font-bold text-[#FAF7F0]">{label}</p>
      <p className="mt-1 text-[11px] text-[#A09D95] leading-relaxed">{body}</p>
    </div>
  );
}
