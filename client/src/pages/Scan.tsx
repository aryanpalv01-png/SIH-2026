import { useAuth } from "@/_core/hooks/useAuth";
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
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const numericId = Number(params?.id);
  const serverQuery = trpc.scans.get.useQuery({ id: numericId }, { enabled: Number.isInteger(numericId) && numericId > 0, retry: false });
  const document = useMemo<VerificationDocument>(() => {
    if (serverQuery.data) {
      return serverDocumentToVerification(serverQuery.data.document, serverQuery.data.checks);
    }
    return getPreviewDocument(params?.id, userIdentifier) ?? getPreviewDocument("doc-verified-001")!;
  }, [serverQuery.data, params?.id, userIdentifier]);
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
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1060px] flex-col justify-center py-6 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center self-start text-sm font-semibold text-muted-ink hover:text-saffron-dark transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Exit Scan
      </Link>
      
      <div className="overflow-hidden rounded-[26px] border border-border bg-paper shadow-sm">
        <div className="tiranga-stripe" />
        <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
          <div className="hero-wash flex flex-col justify-between p-7 text-paper sm:p-10">
            <div>
              <VeriScanMark size="lg" />
              <div className="mt-8 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-saffron animate-pulse" />
                <p className="eyebrow text-saffron-light">भारत सरकार · Forensic Engine</p>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white">
                Multi-layered Forensic Inspection
              </h1>
              <p className="mt-4 text-sm leading-6 text-paper/70">
                Executing automated noise-variance preflight, JPEG compression artifact analysis, structural regex, and copy-move clone localization.
              </p>
            </div>
            <div className="mt-10 rounded-2xl border border-paper/15 bg-paper/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper/15 text-saffron">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-paper">{document.filename}</p>
                  <p className="mt-0.5 text-xs text-paper/50">Private ledger: {user?.email || "Local Account"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-10">
            <div className="flex items-start justify-between gap-5 border-b border-border pb-6">
              <div>
                <p className="eyebrow text-saffron-dark">Live Diagnostic</p>
                <h2 className="mt-1 font-serif text-2xl font-bold">Assembling Forensic Verdict</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-saffron/30 bg-saffron/10 text-saffron-dark">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
              </div>
            </div>

            <div className="mt-7 space-y-1.5">
              {scanStages.map((stage, index) => {
                const isDone = index < activeStage;
                const isActive = index === activeStage && activeStage < scanStages.length;
                return (
                  <div key={stage} className={`flex items-center gap-4 rounded-xl px-3.5 py-3 transition-colors ${isActive ? "bg-paper-deep" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isDone ? "border-india-green bg-india-green text-white" : isActive ? "scan-pulse border-saffron text-saffron-dark" : "border-border text-muted-ink"}`}>
                      {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : isActive ? <Circle className="h-3 w-3 fill-saffron text-saffron" /> : <span className="text-xs">{String(index + 1).padStart(2, "0")}</span>}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-ink" : isDone ? "text-ink" : "text-muted-ink"}`}>{stage}</p>
                      <p className="mt-0.5 text-xs text-muted-ink">{isDone ? "Complete" : isActive ? "Executing neural & algorithmic check" : "Queued"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-ink">
                <span>{activeStage >= scanStages.length ? "Report Compiled" : "Analysis Progress"}</span>
                <span className="font-mono">{Math.min(activeStage, scanStages.length)} / {scanStages.length}</span>
              </div>
              <div className="status-bar h-2 bg-black/10">
                <span style={{ width: `${(Math.min(activeStage, scanStages.length) / scanStages.length) * 100}%` }} className="!bg-saffron" />
              </div>
              {activeStage >= scanStages.length && (
                <p className="mt-4 text-sm font-semibold text-india-green">Verification complete. Redirecting to official forensic ledger...</p>
              )}
            </div>

            <Button variant="ghost" className="mt-4 px-0 text-muted-ink hover:bg-transparent hover:text-ink text-xs" onClick={() => setLocation("/dashboard")}>
              Keep this window open while processing finishes
            </Button>
          </div>
        </div>
      </div>

      {/* Live Microservices Architecture Telemetry During Scan */}
      <div>
        <MicroservicesTelemetry currentStageIndex={activeStage} />
      </div>
    </div>
  );
}


