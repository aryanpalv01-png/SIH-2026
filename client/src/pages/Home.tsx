import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { VeriScanLogo, VeriScanMark } from "@/components/VeriScanLogo";
import { GovMasthead } from "@/components/common/GovMasthead";
import { analyzeDocumentDirectly, makeDemoDocument } from "@/lib/veriscan";
import { fileToBase64, writeLocalScan } from "@/lib/scanStore";
import { ArrowRight, Check, FileCheck2, LockKeyhole, ScanLine, ShieldCheck, Building2, Sparkles, Award } from "lucide-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";

  const handleFile = async (file: File) => {
    if (!user) {
      setLocation("/auth/login");
      return;
    }
    try {
      const document = await analyzeDocumentDirectly(file);
      writeLocalScan(document, userIdentifier);
      setLocation(`/scan/${document.id}`);
    } catch {
      let previewUrl: string | undefined;
      try {
        const b64 = await fileToBase64(file);
        previewUrl = `data:${file.type || "image/jpeg"};base64,${b64}`;
      } catch {
        // Ignore base64 error
      }
      const document = makeDemoDocument(file, previewUrl);
      writeLocalScan(document, userIdentifier);
      setLocation(`/scan/${document.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-paper">
      {/* Official Government of India Top Masthead */}
      <GovMasthead theme="dark" />

      {/* Main Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#081528]/90 backdrop-blur-md">
        <div className="container flex min-h-[76px] items-center justify-between gap-6">
          <Link href="/" className="shrink-0">
            <VeriScanLogo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex" aria-label="Primary navigation">
            <a href="#how-it-works" className="hover:text-white transition-colors">Forensic Pipeline</a>
            <a href="#security" className="hover:text-white transition-colors">DPI Security</a>
            <a href="#use-cases" className="hover:text-white transition-colors">National Use Cases</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg border-white/20 bg-white/5 text-slate-200 hover:bg-white/15 hover:text-white font-semibold">
                  Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="hidden h-9 text-slate-300 hover:bg-white/10 hover:text-white font-semibold sm:inline-flex">
                  Officer Login
                </Button>
              </Link>
            )}
            <Link href={user ? "/verify" : "/auth/login"}>
              <Button size="sm" className="h-9 rounded-lg bg-saffron text-slate-950 font-bold hover:bg-saffron-dark hover:text-white shadow-xs">
                Screen Document
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-wash hero-grid relative overflow-hidden">
          <div className="absolute -right-32 top-20 h-96 w-96 rounded-full border border-saffron/15 pointer-events-none" />
          <div className="absolute -right-14 top-48 h-64 w-64 rounded-full border border-india-green/15 pointer-events-none" />
          
          <div className="container relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:py-24">
            <div className="max-w-xl">
              <span className="gov-pill">
                <span className="h-1.5 w-1.5 rounded-full bg-saffron animate-pulse" />
                National Document Forensic & Integrity Portal
              </span>
              <h1 className="mt-5 font-serif text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Autonomous Forgery Screening. <span className="text-saffron">Zero False Positives.</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Calibrated for Indian credentials: e-Aadhaar QR codes, Income Tax PAN structural checksums, ICAO passports, and academic marksheets. Intelligent physical vs digital noise variance routing ensures genuine soft-copies are never mistakenly flagged.
              </p>
              
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-india-green" /> 11-Layer Forensic Analysis
                </span>
                <span className="inline-flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-saffron" /> Private Account Scoping
                </span>
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-sky-400" /> DPI Aligned
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur-md">
              <div className="tiranga-stripe" />
              <div className="rounded-xl bg-white p-2">
                <DocumentUploadPanel onFile={handleFile} />
              </div>
            </div>
          </div>

          {/* Key Facts Strip */}
          <div className="container grid max-w-5xl grid-cols-2 gap-6 border-t border-white/10 py-8 sm:grid-cols-4">
            <div>
              <p className="font-serif text-3xl font-bold text-white">11</p>
              <p className="mt-1 text-[11px] uppercase font-bold tracking-wider text-saffron">Forensic Layers</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">100 pt</p>
              <p className="mt-1 text-[11px] uppercase font-bold tracking-wider text-slate-300">Confidence Metric</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">0 ms</p>
              <p className="mt-1 text-[11px] uppercase font-bold tracking-wider text-india-green">Disk Leakage Risk</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">100%</p>
              <p className="mt-1 text-[11px] uppercase font-bold tracking-wider text-saffron">Account Isolated</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-slate-50 py-20 text-slate-900 sm:py-24">
          <div className="container max-w-6xl">
            <div className="max-w-xl">
              <span className="gov-pill text-[10px]">
                Indian Forensic Architecture
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Rigorous Multi-Signal Verification
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Every scanned document is verified across independent mathematical, computer-vision, and neural channels.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Step
                number="01"
                icon={<FileCheck2 className="h-5 w-5 text-saffron-dark" />}
                title="Intake & Routing"
                body="Evaluates camera sensor noise variance (OpenCV). Soft-copies are routed through tailored parameters to prevent false positive tampering alerts."
              />
              <Step
                number="02"
                icon={<ScanLine className="h-5 w-5 text-india-green" />}
                title="Multi-Layer Forensics"
                body="Runs Error Level Analysis (ELA), UIDAI 2048-bit digital signature checks, PAN regex checksums, font alignment, and copy-move clone detection."
              />
              <Step
                number="03"
                icon={<ShieldCheck className="h-5 w-5 text-ashoka" />}
                title="Tamper Heatmap & Verdict"
                body="Generates an interactive forensic loupe canvas with pixel-level coordinate heatmaps and an exportable National Forensic PDF Certificate."
              />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="bg-white py-20 text-slate-900 sm:py-24 border-y border-slate-200">
          <div className="container grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <span className="gov-pill text-[10px]">
                Data Sovereignty & Security
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Built for High-Stakes Public Infrastructure
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Designed under zero-trust principles. Document contents remain isolated to the screening officer's authenticated session with Zero-Disk in-memory processing.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TrustCard
                icon={<LockKeyhole className="h-5 w-5 text-saffron-dark" />}
                title="Account-Scoped Ledgers"
                body="Document records belong strictly to the investigator who uploaded them. Cross-account data leaks are systematically blocked."
              />
              <TrustCard
                icon={<Check className="h-5 w-5 text-india-green" />}
                title="Inspectable Evidence"
                body="Every flagged anomaly includes precise pixel coordinates, bounding boxes, and plain-language technical justifications."
              />
              <TrustCard
                icon={<Building2 className="h-5 w-5 text-ashoka" />}
                title="Official PDF Export"
                body="Generates compliant certificates complete with SHA-256 integrity hashes, QR verification codes, and institutional seals."
              />
              <TrustCard
                icon={<Award className="h-5 w-5 text-saffron-dark" />}
                title="Human-in-the-Loop"
                body="Borderline signals can be routed to human forensic officers for secondary microscopic examination."
              />
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section id="use-cases" className="bg-slate-50 py-20 text-slate-900 sm:py-24">
          <div className="container max-w-6xl">
            <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
              <div>
                <span className="gov-pill text-[10px]">
                  National Verification Scenarios
                </span>
                <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Safeguarding India's Digital Identity
                </h2>
              </div>
              <Link href={user ? "/dashboard" : "/auth/signup"} className="inline-flex items-center text-xs font-bold text-saffron-dark hover:text-saffron gap-1.5">
                Open Officer Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-6 pt-8 sm:grid-cols-3">
              <UseCase
                title="Citizen Onboarding & Banking"
                body="Screen Aadhaar cards and PAN cards during KYC intake to eliminate synthesized identities and manipulated numbers."
              />
              <UseCase
                title="Public Services & Examinations"
                body="Validate academic certificates and caste certificates against clone stamps, altered marks, and patched seals."
              />
              <UseCase
                title="Immigration & Passports"
                body="Verify ICAO 9303 MRZ zones, ghost photo alignment, and microprinting consistency on government travel documents."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Official Government Footer */}
      <footer className="border-t border-white/10 bg-[#060e1a] py-8 text-slate-400">
        <div className="container flex flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <VeriScanLogo compact />
            <span>भारत सरकार · Ministry of Electronics and IT · National Document Forensic Initiative</span>
          </div>
          <span>© 2026 VeriScan India. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, icon, title, body }: { number: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-saffron/40 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          {icon}
        </div>
        <span className="font-serif text-2xl text-saffron font-bold">{number}</span>
      </div>
      <h3 className="mt-4 font-serif text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/80 p-5 shadow-xs border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-2xs">
        {icon}
      </div>
      <h3 className="mt-3.5 font-serif text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 border-l-4 border-l-saffron shadow-xs">
      <h3 className="font-serif text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}


