import { VeriScanMark } from "@/components/VeriScanLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

export default function Auth() {
  const [, params] = useRoute("/auth/:mode");
  const [, setLocation] = useLocation();
  const isSignup = params?.mode === "signup";
  const { loginAsDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim() || "analyst@veriscan.internal";
    const name = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    loginAsDemo({
      id: 1,
      openId: `usr-${Date.now()}`,
      name: name || "Verified Analyst",
      email: cleanEmail,
      role: "admin",
    });
    setLocation("/dashboard");
  };

  const handleDemoAccess = () => {
    loginAsDemo();
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-charcoal text-paper">
      <header className="container flex min-h-[76px] items-center justify-between">
        <Link href="/">
          <VeriScanMark size="md" />
        </Link>
        <Link href="/" className="inline-flex items-center text-sm text-paper/60 hover:text-paper">
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to VeriScan
        </Link>
      </header>

      <main className="container flex min-h-[calc(100vh-76px)] items-center justify-center py-10">
        <div className="grid w-full max-w-[900px] overflow-hidden rounded-[26px] border border-paper/10 bg-charcoal-light shadow-[0_24px_70px_rgba(0,0,0,0.2)] lg:grid-cols-[0.88fr_1.12fr]">
          <div className="hidden flex-col justify-between bg-paper-deep p-8 text-ink lg:flex">
            <div>
              <p className="eyebrow text-bronze-dark">The VeriScan standard</p>
              <h1 className="mt-4 max-w-sm font-serif text-4xl font-bold tracking-[-0.04em]">
                A clearer record for consequential decisions.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-muted-ink">
                Keep document screening evidence in one private workspace, ready for review when the details matter.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-paper p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal text-bronze">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Private by design</p>
                  <p className="mt-1 text-xs text-muted-ink">Your records stay account-scoped.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-10">
            <div className="flex items-center gap-3 lg:hidden">
              <VeriScanMark size="sm" />
              <span className="font-serif text-xl font-semibold">VeriScan</span>
            </div>
            <p className="eyebrow mt-8 text-bronze-light lg:mt-0">
              {isSignup ? "Create workspace access" : "Secure workspace access"}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold">
              {isSignup ? "Start with a careful first check." : "Welcome back."}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-paper/60">
              {isSignup
                ? "Create an account to keep reports private and revisit your document screening history."
                : "Sign in to review reports and continue managing your document checks."}
            </p>

            <form onSubmit={handleAuth} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-paper/55">
                  Email address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@organization.com"
                  className="h-11 border-paper/15 bg-paper/5 text-paper placeholder:text-paper/35 focus:border-bronze"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-paper/55">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 border-paper/15 bg-paper/5 text-paper placeholder:text-paper/35 focus:border-bronze"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-bronze text-ink hover:bg-bronze-light font-semibold"
              >
                {isSignup ? "Create account & enter" : "Sign in securely"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-bronze/40 bg-bronze/10 text-bronze-light hover:bg-bronze hover:text-ink font-semibold"
                onClick={handleDemoAccess}
              >
                <UserCheck className="mr-2 h-4 w-4" /> Quick Access as Demo Analyst
              </Button>
            </form>

            <div className="mt-7 flex items-center gap-2 text-xs text-paper/45">
              <LockKeyhole className="h-3.5 w-3.5 text-bronze" /> Authentication is handled by VeriScan’s secure account provider.
            </div>

            <p className="mt-8 text-center text-sm text-paper/50">
              {isSignup ? "Already have an account?" : "New to VeriScan?"}{" "}
              <button
                className="font-semibold text-bronze-light hover:text-paper"
                onClick={() => setLocation(isSignup ? "/auth/login" : "/auth/signup")}
              >
                {isSignup ? "Sign in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
