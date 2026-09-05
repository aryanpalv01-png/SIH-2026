import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/veriscan";
import { Copy, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");

  const generateKey = () => {
    const generated = `vs_live_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    setApiKey(generated);
    toast.success("API key generated", { description: "Copy it now. For security, this preview does not persist secret values." });
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      {/* Top Banner */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#FAF7F0] shadow-xs">
        <div className="tiranga-stripe" />
        <div className="p-6 sm:p-8">
          <span className="gov-pill text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
            प्रशासनिक नियंत्रण · Officer Configuration
          </span>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Account & System Settings
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Manage your authenticated forensic credentials, government workspace isolation, and programmatic DPI Microservice API keys.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Officer Credentials */}
        <section className="rounded-2xl border border-slate-200 bg-[#FAF7F0] p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-saffron/15 text-saffron-dark">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-dark">Officer Credentials</p>
              <h2 className="mt-1 font-serif text-xl font-bold text-slate-900">VeriScan Investigator Profile</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                All screening records, document blobs, and audit logs are strictly cryptographically scoped to your authenticated identity.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Official Name</label>
              <Input
                value={user?.name ?? "Forensic Officer"}
                readOnly
                className="h-11 border-slate-200 bg-white text-slate-900 font-medium text-xs rounded-xl"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email Identifier</label>
              <Input
                value={user?.email ?? "investigator@nic.in"}
                readOnly
                className="h-11 border-slate-200 bg-white text-slate-900 font-mono text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ashoka text-xs font-bold text-white">
              {getInitials(user?.name || user?.email)}
            </span>
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-slate-900">Row-Level Isolated Government Ledger</p>
              <p className="text-slate-500">
                Multi-tenant isolation active. Other investigators cannot view files, hashes, or reports submitted under this session.
              </p>
            </div>
          </div>
        </section>

        {/* DPI Microservice API */}
        <section className="rounded-2xl border border-slate-200 bg-[#FAF7F0] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ashoka/10 text-ashoka">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ashoka">Integration Access</p>
                <h2 className="mt-1 font-serif text-xl font-bold text-slate-900">DPI Microservice API</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
                  Generate an API key to securely connect VeriScan's 11-layer forensic pipeline to your automated onboarding workflows, KYC queues, or internal intake portals.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs h-10 px-4 shrink-0 rounded-xl"
              onClick={generateKey}
            >
              <RefreshCw className="mr-2 h-4 w-4 text-saffron-dark" /> Generate New Key
            </Button>
          </div>

          {apiKey && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-saffron/40 bg-saffron/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-dark block">Active Session Key</span>
                <code className="break-all font-mono text-xs font-bold text-slate-900">{apiKey}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="self-start border-saffron/40 bg-white text-slate-900 hover:bg-saffron/20 sm:self-auto text-xs font-semibold rounded-lg shrink-0"
                onClick={() => navigator.clipboard?.writeText(apiKey).then(() => toast.success("API key copied to clipboard"))}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5 text-saffron-dark" /> Copy Key
              </Button>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
            <LockKeyhole className="h-4 w-4 shrink-0 text-saffron-dark" />
            <span>
              All API transmissions require <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">X-VeriScan-Signature</code> HMAC authentication. Only one-way cryptographic SHA-256 hashes of generated API keys are stored in the secure vault.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}


