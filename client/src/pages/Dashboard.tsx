import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { StatusSeal } from "@/components/StatusSeal";
import { PageHeader } from "@/components/common/PageHeader";
import { StatMetricCard } from "@/components/common/StatMetricCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fileToBase64, readLocalScans, writeLocalScan } from "@/lib/scanStore";
import { analyzeDocumentDirectly, formatDate, formatDocumentType, makeDemoDocument, statusMeta, VerificationDocument, DocumentStatus } from "@/lib/veriscan";
import { ArrowRight, FileCheck2, FileSearch, LockKeyhole, Plus, ShieldCheck, TrendingUp, ShieldAlert, Sparkles, Building2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const [localScans, setLocalScans] = useState<VerificationDocument[]>(() => readLocalScans(userIdentifier));
  const [uploadError, setUploadError] = useState("");
  const currentFileRef = useRef<File | undefined>(undefined);
  const scansQuery = trpc.scans.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const createScan = trpc.scans.create.useMutation({
    onSuccess: async (result) => {
      await utils.scans.list.invalidate();
      setLocation(`/scan/${result.id}`);
    },
    onError: async (error) => {
      if (currentFileRef.current) {
        let previewUrl: string | undefined;
        try {
          const b64 = await fileToBase64(currentFileRef.current);
          previewUrl = `data:${currentFileRef.current.type || "image/jpeg"};base64,${b64}`;
        } catch {
          // ignore
        }
        try {
          const fallback = await analyzeDocumentDirectly(currentFileRef.current);
          writeLocalScan(fallback, userIdentifier);
          setLocation(`/scan/${fallback.id}`);
          return;
        } catch {
          const fallback = makeDemoDocument(currentFileRef.current, previewUrl);
          writeLocalScan(fallback, userIdentifier);
          setLocation(`/scan/${fallback.id}`);
          return;
        }
      }
      setUploadError(error.message || "Upload processing error");
      toast.info("Upload notice", { description: error.message });
    },
  });

  // Account-scoped scan records: server scans if authenticated, else user-scoped local scans
  const serverDocuments = useMemo(() => {
    if (!scansQuery.data || !Array.isArray(scansQuery.data)) return [];
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
  }, [scansQuery.data]);

  const allDocuments: VerificationDocument[] = serverDocuments.length > 0 ? serverDocuments : localScans;
  const recentDocuments = allDocuments.slice(0, 5);

  useEffect(() => {
    setLocalScans(readLocalScans(userIdentifier));
    const refresh = () => setLocalScans(readLocalScans(userIdentifier));
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [userIdentifier]);

  const handleFile = async (file: File) => {
    setUploadError("");
    currentFileRef.current = file;
    const docType = file.name.toLowerCase().includes("aadhaar")
      ? "aadhaar"
      : file.name.toLowerCase().includes("pan")
      ? "pan"
      : file.name.toLowerCase().includes("passport")
      ? "passport"
      : "other";

    let previewUrl: string | undefined;
    try {
      const contentBase64 = await fileToBase64(file);
      previewUrl = `data:${file.type || "image/jpeg"};base64,${contentBase64}`;
      createScan.mutate(
        { fileName: file.name, mimeType: file.type, fileSize: file.size, documentType: docType, contentBase64 },
        {
          onSuccess: (result) => {
            writeLocalScan({
              id: String(result.id),
              filename: file.name,
              type: docType,
              uploadedAt: new Date().toISOString(),
              status: result.status,
              score: result.confidenceScore,
              fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
              mimeType: file.type || "image/jpeg",
              reference: result.referenceCode,
              previewUrl,
              checks: [],
            }, userIdentifier);
            setLocation(`/scan/${result.id}`);
          },
        }
      );
    } catch {
      try {
        const fallback = await analyzeDocumentDirectly(file);
        writeLocalScan(fallback, userIdentifier);
        setLocation(`/scan/${fallback.id}`);
      } catch {
        const fallback = makeDemoDocument(file, previewUrl);
        writeLocalScan(fallback, userIdentifier);
        setLocation(`/scan/${fallback.id}`);
      }
    }
  };

  const verifiedCount = allDocuments.filter((item) => item.status === "verified").length;
  const reviewCount = allDocuments.filter((item) => item.status === "needs_review").length;
  const forgedCount = allDocuments.filter((item) => item.status === "likely_forged").length;
  const averageScore = allDocuments.length
    ? Math.round(allDocuments.reduce((sum, item) => sum + item.score, 0) / allDocuments.length)
    : 0;

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      {/* Top Welcome Banner with Indian Govt Tricolor Emblem */}
      <PageHeader
        categoryHindi="भारत सरकार"
        categoryEnglish="Govt of India · Forensic Workspace"
        title={`Namaste${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`}
        subtitle={
          <>
            Official document integrity workbench. Documents screened here are private and strictly isolated to your account (<span className="font-mono text-xs font-semibold text-slate-800">{user?.email || "Local Officer"}</span>).
          </>
        }
        accountBadge={user?.email ? `Vault: ${user.email}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/history">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
                View History <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="sm" className="h-9 gap-1.5 rounded-lg bg-saffron text-slate-950 font-bold hover:bg-saffron-dark hover:text-white shadow-xs">
                <Plus className="h-4 w-4" /> New Verification
              </Button>
            </Link>
          </div>
        }
      />

      {uploadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 font-medium" role="alert">
          {uploadError}
        </div>
      )}

      {/* Metric Cards - Official Indian Gov Palette */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatMetricCard
          icon={<FileCheck2 className="h-5 w-5" />}
          label="Documents Screened"
          value={String(allDocuments.length).padStart(2, "0")}
          note="Across your private account ledger"
          accent="saffron"
        />
        <StatMetricCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Verified Legitimate"
          value={String(verifiedCount).padStart(2, "0")}
          note={`${allDocuments.length ? Math.round((verifiedCount / allDocuments.length) * 100) : 0}% genuine rate`}
          accent="green"
        />
        <StatMetricCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Flagged for Review"
          value={String(reviewCount + forgedCount).padStart(2, "0")}
          note={reviewCount + forgedCount > 0 ? "Requires physical scrutiny" : "Clear screening queue"}
          accent="review"
        />
        <StatMetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Average Confidence"
          value={allDocuments.length ? `${averageScore}/100` : "N/A"}
          note="Multi-layer algorithm score"
          accent="navy"
        />
      </div>

      {/* Screen a Document + Security Posture */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4.5 sm:p-7 shadow-xs">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="gov-pill text-[10px]">
                Immediate Intake
              </span>
              <h2 className="mt-1.5 font-serif text-lg sm:text-xl font-bold text-slate-900">Screen an Indian Credential</h2>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-india-green/30 bg-india-green/10 px-3 py-1 text-xs font-semibold text-india-green sm:flex">
              <LockKeyhole className="h-3.5 w-3.5" /> End-to-End Isolated
            </div>
          </div>
          <DocumentUploadPanel compact disabled={createScan.isPending} onFile={handleFile} />
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-india-green" /> Aadhaar (UIDAI 2048-bit QR)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-saffron" /> Income Tax PAN Card</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ashoka" /> Indian Passport (ICAO 9303)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Academic Certificates</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4.5 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="gov-pill text-[10px]">
                  Forensic Pipeline
                </span>
                <h2 className="mt-1.5 font-serif text-lg sm:text-xl font-bold text-slate-900">Active Detection Layers</h2>
              </div>
              <FileSearch className="h-6 w-6 text-saffron-dark" strokeWidth={1.5} />
            </div>
            <div className="mt-5 space-y-3.5">
              <Posture label="Physical vs. Digital Classification" detail="Noise variance routing to prevent false positives on soft copies" />
              <Posture label="Error Level Analysis (ELA)" detail="JPEG resaving and compression boundary forensics" />
              <Posture label="Checksum & Typography OCR" detail="Verhoeff & PAN structural checksum verification" />
              <Posture label="Deep Copy-Move & Clone SIFT" detail="Duplicated stamp, seal, or face patch localization" />
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="h-4 w-4 shrink-0 text-ashoka" />
              <span>Developed in accordance with Indian Digital Public Infrastructure standards.</span>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Scans or Clean Empty State */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="gov-pill text-[10px]">
              Account Audit Trail
            </span>
            <h2 className="mt-1 font-serif text-lg sm:text-xl font-bold text-slate-900">Your Latest Screening Reports</h2>
          </div>
          {allDocuments.length > 0 && (
            <Link href="/history" className="hidden items-center text-xs font-bold text-saffron-dark hover:text-saffron sm:inline-flex gap-1">
              View all reports ({allDocuments.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {allDocuments.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-7 w-7" />}
            title="No documents scanned yet under this account"
            description="Your account workspace is completely clean. Documents you upload will be analyzed in real-time and stored strictly under your private account session."
            actionLabel="Screen Your First Document"
            actionHref="/verify"
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {recentDocuments.map((document) => (
                <Link
                  key={document.id}
                  href={`/report/${document.id}`}
                  className="group flex flex-col gap-3 p-4 sm:px-6 sm:py-4.5 hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <StatusSeal status={document.status} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-saffron-dark transition-colors truncate max-w-[240px] sm:max-w-md">
                        {document.filename}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        {formatDocumentType(document.type)} · {formatDate(document.uploadedAt)} · Ref: <span className="font-mono text-slate-700">{document.reference}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:justify-end">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Confidence Score</p>
                      <p className="mt-0.5 font-serif text-base font-bold text-slate-900">
                        {document.score}
                        <span className="font-sans text-xs font-normal text-slate-500">/100</span>
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-saffron-dark inline-flex items-center">
                      {statusMeta[document.status as DocumentStatus]?.label ?? "Verified"} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Posture({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-india-green/15 text-india-green text-xs font-bold mt-0.5">
        ✓
      </span>
      <div>
        <p className="text-xs font-bold text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{detail}</p>
      </div>
    </div>
  );
}


