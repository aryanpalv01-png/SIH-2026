import { DocumentPreview } from "@/components/DocumentPreview";
import { ForensicLoupeCanvas } from "@/components/ForensicLoupeCanvas";
import { ForensicPdfExport } from "@/components/ForensicPdfExport";
import { MicroservicesTelemetry } from "@/components/MicroservicesTelemetry";
import { CheckSeal, StatusSeal } from "@/components/StatusSeal";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocument } from "@/lib/scanStore";
import { formatDateTime, formatDocumentType, getResultLabel, serverDocumentToVerification, statusMeta, VerificationDocument, VerificationCheck } from "@/lib/veriscan";
import { ArrowLeft, ArrowRight, Download, FileText, Flag, HelpCircle, LockKeyhole, MessageSquareText, RotateCcw, ShieldCheck, Activity, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

export default function Report() {
  const [, params] = useRoute("/report/:id");
  const numericId = Number(params?.id);
  const canLoadServer = Number.isInteger(numericId) && numericId > 0;
  const serverQuery = trpc.scans.get.useQuery({ id: numericId }, { enabled: canLoadServer, retry: false });
  const utils = trpc.useUtils();
  const reviewMutation = trpc.scans.requestReview.useMutation({
    onSuccess: async () => {
      await utils.scans.get.invalidate({ id: numericId });
      toast.success("Human review request queued");
    },
    onError: (error) => toast.info("Review request is ready for the production queue", { description: error.message }),
  });
  const document = useMemo<VerificationDocument>(() => {
    if (serverQuery.data) return serverDocumentToVerification(serverQuery.data.document, serverQuery.data.checks);
    return getPreviewDocument(params?.id) ?? getPreviewDocument("doc-verified-001")!;
  }, [serverQuery.data, params?.id]);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [viewMode, setViewMode] = useState<"canvas" | "card">("canvas");
  const [selectedCheck, setSelectedCheck] = useState<VerificationCheck | null>(null);

  const meta = statusMeta[document.status];
  const flagged = document.checks.filter((check) => check.result === "flag");
  const passed = document.checks.filter((check) => check.result === "pass");
  const persistedReview = serverQuery.data?.review?.status === "pending" || serverQuery.data?.review?.status === "in_progress";
  const hasReview = reviewRequested || persistedReview;

  const handleReview = () => {
    setReviewRequested(true);
    if (canLoadServer) reviewMutation.mutate({ id: numericId });
    else toast.success("Human review request noted", { description: "Connect this preview record to a server-backed workspace to persist the review row." });
  };

  return (
    <div className="mx-auto max-w-[1380px]">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/history" className="inline-flex items-center text-sm font-semibold text-muted-ink hover:text-bronze-dark">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to history
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="border-border bg-paper text-ink hover:bg-paper-deep text-xs font-semibold"
            onClick={() => setShowTelemetry(!showTelemetry)}
          >
            <Activity className="mr-2 h-4 w-4 text-bronze-dark" />
            {showTelemetry ? "Hide Architecture Flow" : "View Microservices Flow"}
          </Button>

          <Button
            variant="outline"
            className="border-border bg-paper text-ink hover:bg-paper-deep text-xs font-semibold"
            onClick={() => setShowPdfModal(true)}
          >
            <Download className="mr-2 h-4 w-4 text-bronze-dark" />
            Official PDF Certificate
          </Button>

          <Link href="/verify">
            <Button className="bg-bronze text-ink hover:bg-bronze-light text-xs font-semibold">
              <RotateCcw className="mr-2 h-4 w-4" /> New verification
            </Button>
          </Link>
        </div>
      </div>

      {/* Architecture Flow Telemetry Drawer */}
      {showTelemetry && (
        <div className="mt-7">
          <MicroservicesTelemetry
            currentStageIndex={6}
            documentScore={document.score}
          />
        </div>
      )}

      {/* Verdict & Score Banner */}
      <div className={`mt-7 rounded-[24px] border p-5 sm:p-7 ${meta.tone === "verified" ? "border-bronze/25 bg-bronze/8" : meta.tone === "review" ? "border-review/25 bg-review/8" : "border-forged/25 bg-forged/6"}`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <StatusSeal status={document.status} size="lg" />
            <div>
              <p className="eyebrow text-muted-ink">Screening verdict</p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{meta.label}</h1>
              <p className="mt-2 text-sm text-muted-ink">{meta.description}. Use this report with your standard review process.</p>
            </div>
          </div>
          <div className="min-w-[160px] sm:text-right">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-ink">Confidence score</p>
            <p className="mt-1 font-serif text-5xl font-bold tracking-[-0.05em] text-ink">
              {document.score}
              <span className="font-sans text-lg font-normal text-muted-ink"> / 100</span>
            </p>
          </div>
        </div>
        <div className="mt-7">
          <div className="status-bar h-2.5 bg-black/10">
            <span className={meta.tone === "forged" ? "!bg-forged" : meta.tone === "review" ? "!bg-review" : "!bg-bronze"} style={{ width: `${document.score}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted-ink">
            <span>Higher concern</span>
            <span>Higher confidence</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Visualizer + Findings + Records */}
      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <div>
          {/* Visualizer Mode Tabs */}
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow text-bronze-dark">Document Examination Workbench</span>
            <div className="flex rounded-lg border border-border bg-paper p-0.5 text-xs">
              <button
                onClick={() => setViewMode("canvas")}
                className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition-all ${
                  viewMode === "canvas"
                    ? "bg-charcoal text-paper font-semibold shadow-sm"
                    : "text-muted-ink hover:text-ink"
                }`}
              >
                <Layers className="h-3 w-3" />
                Forensic Canvas & Loupe
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition-all ${
                  viewMode === "card"
                    ? "bg-charcoal text-paper font-semibold shadow-sm"
                    : "text-muted-ink hover:text-ink"
                }`}
              >
                <FileText className="h-3 w-3" />
                Standard Preview
              </button>
            </div>
          </div>

          {viewMode === "canvas" ? (
            <ForensicLoupeCanvas
              document={document}
              onSelectCheck={(check) => setSelectedCheck(check)}
            />
          ) : (
            <DocumentPreview document={document} />
          )}

          {/* Findings at a glance */}
          <div className="mt-7 rounded-[20px] border border-border bg-paper p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-bronze-dark">Findings at a glance</p>
                <h2 className="mt-2 font-serif text-2xl font-bold">What deserves attention</h2>
              </div>
              <Flag className="h-5 w-5 text-review" strokeWidth={1.6} />
            </div>

            {flagged.length ? (
              <div className="mt-6 space-y-3">
                {flagged.map((check) => (
                  <div
                    key={check.id}
                    onClick={() => setSelectedCheck(check)}
                    className="rounded-xl border border-review/20 bg-review/6 p-4 cursor-pointer hover:border-review/40 transition-colors"
                  >
                    <div className="flex gap-3">
                      <CheckSeal result="flag" />
                      <div>
                        <p className="text-sm font-semibold">{check.shortName}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-ink">{check.explanation}</p>
                        {check.flaggedRegion && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-review">
                            Coordinates: ({check.flaggedRegion.x}%, {check.flaggedRegion.y}%) · Click to highlight
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-bronze/20 bg-bronze/6 p-4">
                <div className="flex gap-3">
                  <CheckSeal result="pass" />
                  <div>
                    <p className="text-sm font-semibold">No flagged findings</p>
                    <p className="mt-1 text-sm leading-6 text-muted-ink">
                      All configured screening layers passed without a material visual or structural exception.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-7">
          <section className="rounded-[20px] border border-border bg-paper p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-bronze-dark">Document record</p><h2 className="mt-2 font-serif text-2xl font-bold">Reference details</h2></div><FileText className="h-5 w-5 text-bronze-dark" strokeWidth={1.6} /></div>
            <div className="mt-6 divide-y divide-border"><Detail label="Original filename" value={document.filename} /><Detail label="Document type" value={formatDocumentType(document.type)} /><Detail label="Screened on" value={formatDateTime(document.uploadedAt)} /><Detail label="Secure reference" value={document.reference} /><Detail label="Stored as" value={`${document.fileSize} · ${document.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}`} /></div>
          </section>

          <section className="rounded-[20px] border border-border bg-paper p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-bronze-dark">Analysis details</p><h2 className="mt-2 font-serif text-2xl font-bold">Individual checks</h2></div><ShieldCheck className="h-5 w-5 text-bronze-dark" strokeWidth={1.6} /></div>
            {document.providerHealth && <div className="mt-5 flex flex-wrap gap-2 border-y border-border py-4">{Object.entries(document.providerHealth).map(([provider, state]) => <span key={provider} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${state === "healthy" ? "border-bronze/25 bg-bronze/8 text-bronze-dark" : state === "not_configured" ? "border-border bg-paper-deep text-muted-ink" : "border-review/20 bg-review/6 text-review"}`}><span className={`h-1.5 w-1.5 rounded-full ${state === "healthy" ? "bg-bronze" : state === "not_configured" ? "bg-muted-ink/40" : "bg-review"}`} />{providerLabel(provider)} · {providerStateLabel(state)}</span>)}</div>}
            <div className="mt-5 space-y-2">{document.checks.map((check, index) => <details key={check.id} open={index === 0 || check.result === "flag"} className="group rounded-xl border border-border bg-paper-deep"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze"><div className="flex min-w-0 items-center gap-3"><CheckSeal result={check.result} /><span className="truncate text-sm font-semibold">{check.name}</span></div><div className="flex shrink-0 items-center gap-3"><span className={`hidden text-xs font-semibold sm:inline ${check.result === "flag" ? "text-forged" : check.result === "pass" ? "text-bronze-dark" : "text-muted-ink"}`}>{getResultLabel(check.result)}</span><ArrowRight className="h-4 w-4 rotate-90 text-muted-ink transition-transform group-open:-rotate-90" /></div></summary><div className="border-t border-border px-4 pb-4 pt-3 pl-[3.25rem]"><p className="text-sm leading-6 text-muted-ink">{check.explanation}</p>{check.result !== "not_applicable" && <p className="mt-2 text-xs text-muted-ink">Observation confidence: <span className="font-semibold text-ink">{check.confidence}/100</span></p>}</div></details>)}</div>
            <div className="mt-5 flex gap-4 border-t border-border pt-5 text-xs text-muted-ink"><span><strong className="text-ink">{passed.length}</strong> passed</span><span><strong className="text-ink">{flagged.length}</strong> flagged</span><span><strong className="text-ink">{document.checks.length - passed.length - flagged.length}</strong> not applicable</span></div>
          </section>

          <section className="rounded-[20px] border border-border bg-charcoal p-5 text-paper sm:p-6">
            <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze text-ink"><MessageSquareText className="h-5 w-5" /></span><div><p className="eyebrow text-bronze-light">Recommended next step</p><h2 className="mt-2 font-serif text-2xl font-bold">{flagged.length ? "Request a human review" : "Keep the report with your record"}</h2><p className="mt-2 text-sm leading-6 text-paper/60">{flagged.length ? "Mixed or concerning signals should be reviewed by a person familiar with the issuing template or source process." : "The current screening is internally consistent. Keep the report with your case file and follow your normal acceptance process."}</p>{flagged.length ? <Button onClick={handleReview} disabled={hasReview || reviewMutation.isPending} className="mt-5 bg-bronze text-ink hover:bg-bronze-light">{hasReview ? "Review requested" : reviewMutation.isPending ? "Queueing review…" : "Request human review"} <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button variant="outline" className="mt-5 border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper" onClick={() => toast.info("Report reference copied", { description: document.reference })}><LockKeyhole className="mr-2 h-4 w-4" /> Keep secure reference</Button>}</div></div>
          </section>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-paper-deep px-4 py-3 text-xs leading-5 text-muted-ink"><HelpCircle className="h-4 w-4 shrink-0 text-bronze-dark" /> VeriScan results are file-level screening observations. They do not confirm an issuing authority’s records or replace a required human or legal review.</div>

      {/* Forensic Certificate Modal (Print-ready PDF) */}
      <ForensicPdfExport
        document={document}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />
    </div>
  );
}

function providerLabel(provider: string) { return ({ local: "Local preflight", huggingface: "Hugging Face", trufor: "TruFor", catnet: "CAT-Net", ocr: "OCR worker", pixel: "Pixel worker" } as Record<string, string>)[provider] ?? provider; }
function providerStateLabel(state: string) { return state === "healthy" ? "active" : state === "not_configured" ? "optional" : state.replaceAll("_", " "); }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><span className="text-xs uppercase tracking-[0.1em] text-muted-ink">{label}</span><span className="break-all text-right text-sm font-semibold text-ink">{value}</span></div>; }
