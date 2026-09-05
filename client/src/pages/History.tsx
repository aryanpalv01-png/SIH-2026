import { useAuth } from "@/_core/hooks/useAuth";
import { StatusSeal } from "@/components/StatusSeal";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import { DocumentStatus, DocumentKind, formatDate, formatDocumentType, statusMeta } from "@/lib/veriscan";
import { ArrowRight, CalendarDays, FileSearch, Filter, Search, X, ShieldAlert, Sparkles, Building2 } from "lucide-react";
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

  const filtered = useMemo(() => documents.filter((document) => {
    const matchesQuery = `${document.filename} ${document.reference} ${formatDocumentType(document.type)}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || document.status === status) && (type === "all" || document.type === type);
  }), [documents, query, status, type]);

  const hasFilters = Boolean(query || status !== "all" || type !== "all");

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      {/* Top Banner */}
      <PageHeader
        categoryHindi="राष्ट्रीय अभिलेख"
        categoryEnglish="National Audit Registry"
        title="Verification Scan History"
        subtitle={
          <>
            Search and revisit forensic screening reports recorded under account: <span className="font-mono text-xs font-semibold text-slate-800">{user?.email || "Local Officer"}</span>
          </>
        }
        accountBadge={user?.email ? `Ledger: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button size="sm" className="h-9 gap-1.5 rounded-lg bg-saffron text-slate-950 font-bold hover:bg-saffron-dark hover:text-white shadow-xs">
              <FileSearch className="h-4 w-4" /> Screen a Document
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search scan history</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search filename, reference hash, or document type..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-saffron focus:bg-white focus:outline-none transition-colors"
            />
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label className="flex items-center gap-2">
              <span className="sr-only">Filter by status</span>
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "all" | DocumentStatus)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:border-saffron focus:bg-white focus:outline-none font-semibold transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified Legitimate</option>
                <option value="needs_review">Needs Human Review</option>
                <option value="likely_forged">Likely Forged</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by document type</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as "all" | DocumentKind)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:border-saffron focus:bg-white focus:outline-none sm:w-auto font-semibold transition-colors"
              >
                <option value="all">All Document Types</option>
                <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                <option value="pan">PAN Card (Income Tax)</option>
                <option value="passport">Indian Passport</option>
                <option value="marksheet">Academic Certificate</option>
                <option value="bank_statement">Bank Statement</option>
                <option value="other">Other Credential</option>
              </select>
            </label>
          </div>
        </div>
        {hasFilters && (
          <button
            className="mt-3 inline-flex items-center text-xs font-bold text-saffron-dark hover:text-saffron gap-1 transition-colors"
            onClick={() => { setQuery(""); setStatus("all"); setType("all"); }}
          >
            <X className="h-3.5 w-3.5" /> Clear active filters
          </button>
        )}
      </div>

      {/* Table or Empty State */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto] gap-5 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 lg:grid">
          <span>Document & Ref</span>
          <span>Official Category</span>
          <span>Timestamp</span>
          <span>Integrity Score</span>
          <span>Verdict</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((document) => (
              <Link
                href={`/report/${document.id}`}
                key={document.id}
                className="group grid gap-4 px-6 py-4.5 transition-colors hover:bg-slate-50/80 lg:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto] lg:items-center lg:gap-5"
              >
                <div className="flex items-center gap-3.5">
                  <StatusSeal status={document.status} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 group-hover:text-saffron-dark transition-colors">
                      {document.filename}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 font-mono">
                      Ref: {document.reference}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  <span className="mr-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 lg:hidden">Type: </span>
                  {formatDocumentType(document.type)}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="mr-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 lg:hidden">Date: </span>
                  {formatDate(document.uploadedAt)} <CalendarDays className="ml-1 inline h-3 w-3 text-slate-400" />
                </p>
                <p className="font-serif text-base font-bold text-slate-900">
                  <span className="mr-2 text-[10px] font-sans uppercase font-bold tracking-wider text-slate-400 lg:hidden">Score: </span>
                  {document.score}
                  <span className="font-sans text-xs font-normal text-slate-500">/100</span>
                </p>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-saffron-dark">
                    {statusMeta[document.status as DocumentStatus]?.label ?? "Verified"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-saffron-dark transition-colors" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8">
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title={documents.length === 0 ? "No records under this account yet" : "No matching screening records"}
                description={
                  documents.length === 0
                    ? "Screen documents to build your authenticated case history. Only files screened by your account will appear here."
                    : "Try adjusting your search query or filter tags to locate specific forensic records."
                }
                actionLabel={documents.length === 0 ? "Screen a Document Now" : undefined}
                actionHref={documents.length === 0 ? "/verify" : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


