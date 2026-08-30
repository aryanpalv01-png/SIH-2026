import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { VeriScanLogo } from "@/components/VeriScanLogo";
import { makeDemoDocument } from "@/lib/veriscan";
import { writeLocalScan } from "@/lib/scanStore";
import { ArrowRight, Check, FileCheck2, LockKeyhole, ScanLine, ShieldCheck } from "lucide-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleFile = (file: File) => {
    const document = makeDemoDocument(file);
    writeLocalScan(document);
    setLocation(`/scan/${document.id}`);
  };

  return (
    <div className="min-h-screen bg-charcoal text-paper">
      <header className="relative z-10 border-b border-paper/10">
        <div className="container flex min-h-[76px] items-center justify-between gap-6">
          <Link href="/" className="shrink-0"><VeriScanLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm text-paper/65 md:flex" aria-label="Primary navigation">
            <a href="#how-it-works" className="hover:text-paper">How it works</a>
            <a href="#security" className="hover:text-paper">Security</a>
            <a href="#use-cases" className="hover:text-paper">Use cases</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? <Link href="/dashboard"><Button variant="outline" className="border-paper/25 bg-transparent text-paper hover:bg-paper/10 hover:text-paper">Open workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link> : <Button variant="ghost" className="hidden text-paper/70 hover:bg-paper/10 hover:text-paper sm:inline-flex" onClick={() => startLogin()}>Sign in</Button>}
            <Link href={user ? "/verify" : "/auth/signup"}><Button className="bg-bronze text-ink hover:bg-bronze-light">Start a check</Button></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-wash hero-grid relative overflow-hidden">
          <div className="absolute -right-32 top-20 h-80 w-80 rounded-full border border-bronze/20" />
          <div className="absolute -right-14 top-48 h-52 w-52 rounded-full border border-bronze/10" />
          <div className="container relative grid gap-14 py-16 sm:py-24 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-16 lg:py-28">
            <div className="max-w-xl">
              <div className="eyebrow inline-flex items-center gap-2 text-bronze"><span className="h-1.5 w-1.5 rounded-full bg-bronze" /> Document authenticity screening</div>
              <h1 className="mt-6 max-w-2xl font-serif text-4xl font-bold leading-[1.14] tracking-[-0.04em] text-paper sm:text-5xl lg:text-[4.1rem]">Read the document. <span className="text-bronze-light">Question the edit.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-paper/65 sm:text-lg">VeriScan examines the file itself for tampering signals across compression, typography, machine-readable data, and visual consistency — without a government database.</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-paper/60"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-bronze" /> Multi-layer screening</span><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-bronze" /> Private by design</span></div>
            </div>
            <div className="rounded-[28px] border border-paper/10 bg-paper/10 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:p-3"><div className="rounded-[22px] bg-paper p-1"><DocumentUploadPanel onFile={handleFile} /></div></div>
          </div>
          <div className="container grid max-w-5xl grid-cols-2 gap-x-8 gap-y-5 border-t border-paper/10 py-7 text-paper/55 sm:grid-cols-4"><div><p className="font-serif text-2xl text-paper">6</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">analysis layers</p></div><div><p className="font-serif text-2xl text-paper">100</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">point confidence scale</p></div><div><p className="font-serif text-2xl text-paper">0</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">database lookups</p></div><div><p className="font-serif text-2xl text-paper">24h</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">retention target</p></div></div>
        </section>

        <section id="how-it-works" className="bg-paper py-20 text-ink sm:py-28">
          <div className="container max-w-6xl">
            <div className="max-w-xl"><p className="eyebrow text-bronze-dark">A considered workflow</p><h2 className="mt-4 font-serif text-3xl font-bold tracking-[-0.035em] sm:text-4xl">The answer is in the details.</h2><p className="mt-4 text-base leading-7 text-muted-ink">Every result is assembled from clear, inspectable observations so your next step is easier to decide.</p></div>
            <div className="mt-12 grid gap-6 md:grid-cols-3"><Step number="01" icon={<FileCheck2 />} title="Upload" body="Add a clear PDF or image. File type and size checks happen before the scan begins." /><Step number="02" icon={<ScanLine />} title="Screen" body="VeriScan reviews compression, text rendering, codes, noise, and copied regions in sequence." /><Step number="03" icon={<ShieldCheck />} title="Review" body="Receive a confidence score, flagged findings, and plain-language guidance for what to do next." /></div>
          </div>
        </section>

        <section id="security" className="bg-paper-deep py-20 text-ink sm:py-24">
          <div className="container grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><p className="eyebrow text-bronze-dark">Security posture</p><h2 className="mt-4 font-serif text-3xl font-bold tracking-[-0.035em] sm:text-4xl">A screening opinion, not a government verdict.</h2></div><div className="grid gap-4 sm:grid-cols-2"><TrustCard icon={<LockKeyhole />} title="Encrypted handling" body="Uploads travel through the authenticated application path and are retained as secure storage references." /><TrustCard icon={<Check />} title="Inspectable findings" body="Reports explain what was observed instead of asking you to trust an opaque score." /><TrustCard icon={<ShieldCheck />} title="Account-scoped data" body="Dashboard records are associated with the signed-in account through protected server procedures." /><TrustCard icon={<FileCheck2 />} title="Human review ready" body="When the evidence is mixed, request a human review rather than forcing a binary decision." /></div></div>
        </section>

        <section id="use-cases" className="bg-paper py-20 text-ink sm:py-24"><div className="container max-w-6xl"><div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-bronze-dark">Built for careful decisions</p><h2 className="mt-4 font-serif text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Useful wherever a document changes the outcome.</h2></div><Link href={user ? "/dashboard" : "/auth/signup"} className="inline-flex items-center text-sm font-semibold text-bronze-dark hover:text-bronze">Explore the workspace <ArrowRight className="ml-2 h-4 w-4" /></Link></div><div className="grid gap-5 pt-8 sm:grid-cols-3"><UseCase title="KYC & onboarding" body="Add another layer of care to identity-document screening." /><UseCase title="Hiring & credentials" body="Identify inconsistencies in certificates before they become costly." /><UseCase title="Lending & insurance" body="Surface document signals that deserve a closer look." /></div></div></section>
      </main>

      <footer className="border-t border-paper/10 bg-charcoal py-8 text-paper/55"><div className="container flex flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><VeriScanLogo compact /><span>Documents encrypted in transit. Files are automatically deleted according to workspace retention rules.</span></div><span>© 2026 VeriScan</span></div></footer>
    </div>
  );
}

function Step({ number, icon, title, body }: { number: string; icon: React.ReactNode; title: string; body: string }) { return <div className="rounded-[20px] border border-border bg-paper p-6 shadow-[0_10px_28px_rgba(66,58,44,0.06)]"><div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal text-bronze">{icon}</div><span className="font-serif text-3xl text-[#d8cdb9]">{number}</span></div><h3 className="mt-8 font-serif text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-ink">{body}</p></div>; }
function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="rounded-[18px] bg-paper p-5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bronze/12 text-bronze-dark">{icon}</div><h3 className="mt-5 font-serif text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-ink">{body}</p></div>; }
function UseCase({ title, body }: { title: string; body: string }) { return <div className="border-l-2 border-bronze px-5"><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-ink">{body}</p></div>; }
