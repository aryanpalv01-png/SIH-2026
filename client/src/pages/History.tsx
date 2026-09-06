import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import {
  DocumentStatus,
  DocumentKind,
  formatDate,
  formatDocumentType,
  statusMeta,
} from "@/lib/veriscan";
import {
  ArrowRight,
  CalendarDays,
  FileSearch,
  Filter,
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function History() {
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DocumentStatus>("all");
  const [type, setType] = useState<"all" | DocumentKind>("all");
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

  const filtered = useMemo(() => {
    return documents.filter((document) => {
      const matchesQuery = `${document.filename} ${document.reference} ${formatDocumentType(
        document.type
      )}`.toLowerCase().includes(query.toLowerCase());
      return (
        matchesQuery &&
        (status === "all" || document.status === status) &&
        (type === "all" || document.type === type)
      );
    });
  }, [documents, query, status, type]);

  const hasFilters = Boolean(query || status !== "all" || type !== "all");

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Top Banner */}
      <PageHeader
        categoryHindi="राष्ट्रीय अभिलेख"
        categoryEnglish="AUDIT_LEDGER // HISTORICAL_RECORDS"
        title="Forensic Audit Ledger"
        subtitle={
          <>
            Immutable screening records recorded under vault (<span className="text-[#FAF7F0] font-semibold">{user?.email || "LOCAL_OFFICER"}</span>).
          </>
        }
        accountBadge={user?.email ? `LEDGER: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button
              size="sm"
              className="h-8 gap-1.5 border border-[#8A6D1F] bg-[#8A6D1F] text-[#FAF7F0] hover:bg-[#8A6D1F]/80 font-mono text-[11px] font-bold"
            >
              <FileSearch className="h-3.5 w-3.5" /> [SCREEN_NEW_DOCUMENT]
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="terminal-panel p-4 font-mono text-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search scan history</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A09D95]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by filename, SHA-256 hash, or document type..."
              className="h-8 w-full border border-[#3A3D45] bg-[#1C1E22] pl-8 pr-3 text-xs text-[#FAF7F0] placeholder:text-[#A09D95]/60 focus:border-[#8A6D1F] focus:outline-none transition-colors"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-1.5 border border-[#3A3D45] bg-[#1C1E22] px-2">
              <Filter className="h-3.5 w-3.5 text-[#8A6D1F]" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "all" | DocumentStatus)}
                className="h-8 bg-transparent text-xs text-[#FAF7F0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#26282D]">STATUS: ALL</option>
                <option value="verified" className="bg-[#26282D]">STATUS: VERIFIED</option>
                <option value="needs_review" className="bg-[#26282D]">STATUS: NEEDS_REVIEW</option>
                <option value="likely_forged" className="bg-[#26282D]">STATUS: LIKELY_FORGED</option>
              </select>
            </label>
            <label className="border border-[#3A3D45] bg-[#1C1E22] px-2">
              <select
                value={type}
                onChange={(event) => setType(event.target.value as "all" | DocumentKind)}
                className="h-8 w-full bg-transparent text-xs text-[#FAF7F0] focus:outline-none sm:w-auto font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#26282D]">TYPE: ALL_CREDENTIALS</option>
                <option value="aadhaar" className="bg-[#26282D]">TYPE: AADHAAR_UIDAI</option>
                <option value="pan" className="bg-[#26282D]">TYPE: PAN_INCOME_TAX</option>
                <option value="passport" className="bg-[#26282D]">TYPE: PASSPORT_ICAO</option>
                <option value="marksheet" className="bg-[#26282D]">TYPE: CERTIFICATE</option>
                <option value="bank_statement" className="bg-[#26282D]">TYPE: STATEMENT</option>
                <option value="other" className="bg-[#26282D]">TYPE: OTHER</option>
              </select>
            </label>
          </div>
        </div>
        {hasFilters && (
          <button
            className="mt-2.5 inline-flex items-center text-[10.5px] text-[#8A6D1F] hover:text-[#FAF7F0] gap-1 transition-colors"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
            }}
          >
            <X className="h-3 w-3" /> [RESET_FILTERS]
          </button>
        )}
      </div>

      {/* Table or Empty State */}
      <div className="terminal-panel overflow-x-auto font-mono">
        {filtered.length > 0 ? (
          <table className="dossier-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-2.5 px-3">REF_ID</th>
                <th className="py-2.5 px-3">DOCUMENT_NAME</th>
                <th className="py-2.5 px-3">CREDENTIAL_TYPE</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3 text-right">SCORE</th>
                <th className="py-2.5 px-3">VERDICT</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
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
                        [OPEN_DOSSIER] <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<Search className="h-6 w-6 text-[#8A6D1F]" />}
              title={documents.length === 0 ? "LEDGER_EMPTY" : "NO_MATCHING_RECORDS"}
              description={
                documents.length === 0
                  ? "Screen documents to generate cryptographic audit trails."
                  : "No screening records matched your current query."
              }
              actionLabel={documents.length === 0 ? "[SCREEN_DOCUMENT]" : undefined}
              actionHref={documents.length === 0 ? "/verify" : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
