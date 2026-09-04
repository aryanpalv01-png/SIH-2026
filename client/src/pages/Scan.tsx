import { VeriScanMark } from "@/components/VeriScanLogo";
import { MicroservicesTelemetry } from "@/components/MicroservicesTelemetry";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocument } from "@/lib/scanStore";
import { scanStages, serverDocumentToVerification, VerificationDocument } from "@/lib/veriscan";
import { ArrowLeft, Check, Circle, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

export default function Scan() {
  const [, params] = useRoute("/scan/:id");
  const [, setLocation] = useLocation();
  const numericId = Number(params?.id);
  const serverQuery = trpc.scans.get.useQuery({ id: numericId }, { enabled: Number.isInteger(numericId) && numericId > 0, retry: false });
  const document = useMemo<VerificationDocument>(() => serverQuery.data ? serverDocumentToVerification(serverQuery.data.document, serverQuery.data.checks) : getPreviewDocument(params?.id) ?? getPreviewDocument("doc-verified-001")!, [serverQuery.data, params?.id]);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStage((current) => Math.min(current + 1, scanStages.length)), 760);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeStage < scanStages.length) return;
    const redirectTimer = window.setTimeout(() => setLocation(`/report/${document.id}`), 850);
    return () => window.clearTimeout(redirectTimer);
  }, [activeStage, document.id, setLocation]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1020px] flex-col justify-center py-6">
      <Link href="/dashboard" className="mb-6 inline-flex items-center self-start text-sm font-semibold text-muted-ink hover:text-bronze-dark">
        <ArrowLeft className="mr-2 h-4 w-4" /> Exit scan
      </Link>
      
      <div className="grid overflow-hidden rounded-[26px] border border-border bg-paper shadow-[0_24px_70px_rgba(66,58,44,0.09)] lg:grid-cols-[0.72fr_1.28fr]">
        <div className="hero-wash flex flex-col justify-between p-7 text-paper sm:p-10">
          <div>
            <VeriScanMark size="lg" />
            <p className="eyebrow mt-10 text-bronze-light">Screening in progress</p>
            <h1 className="mt-4 font-serif text-3xl font-bold tracking-[-0.035em]">Reading the file, layer by layer.</h1>
            <p className="mt-4 text-sm leading-6 text-paper/60">This screening usually takes less than a minute. You can leave this page open while each observation is recorded.</p>
          </div>
          <div className="mt-10 rounded-2xl border border-paper/10 bg-paper/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper/10 text-bronze-light">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-paper">{document.filename}</p>
                <p className="mt-1 text-xs text-paper/45">{document.reference} · secure file reference</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-10">
          <div className="flex items-start justify-between gap-5 border-b border-border pb-6">
            <div>
              <p className="eyebrow text-bronze-dark">Live analysis</p>
              <h2 className="mt-3 font-serif text-2xl font-bold">Building your report</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10 text-bronze-dark">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
            </div>
          </div>

          <div className="mt-8 space-y-1">
            {scanStages.map((stage, index) => {
              const isDone = index < activeStage;
              const isActive = index === activeStage && activeStage < scanStages.length;
              return (
                <div key={stage} className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors ${isActive ? "bg-paper-deep" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isDone ? "border-bronze bg-bronze text-ink" : isActive ? "scan-pulse border-bronze text-bronze-dark" : "border-border text-muted-ink"}`}>
                    {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : isActive ? <Circle className="h-3 w-3 fill-bronze text-bronze" /> : <span className="text-xs">{String(index + 1).padStart(2, "0")}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? "text-ink" : isDone ? "text-ink" : "text-muted-ink"}`}>{stage}</p>
                    <p className="mt-0.5 text-xs text-muted-ink">{isDone ? "Complete" : isActive ? "Examining this layer" : "Queued"}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-ink">
              <span>{activeStage >= scanStages.length ? "Report ready" : "Analysis progress"}</span>
              <span>{Math.min(activeStage, scanStages.length)} / {scanStages.length}</span>
            </div>
            <div className="status-bar">
              <span style={{ width: `${(Math.min(activeStage, scanStages.length) / scanStages.length) * 100}%` }} />
            </div>
            {activeStage >= scanStages.length && <p className="mt-4 text-sm font-semibold text-bronze-dark">Your report is ready. Opening it now.</p>}
          </div>

          <Button variant="ghost" className="mt-5 px-0 text-muted-ink hover:bg-transparent hover:text-ink" onClick={() => setLocation("/dashboard")}>
            Keep this window open while we finish
          </Button>
        </div>
      </div>

      {/* Live Microservices Architecture Telemetry During Scan */}
      <div className="mt-8">
        <MicroservicesTelemetry currentStageIndex={activeStage} />
      </div>
    </div>
  );
}

