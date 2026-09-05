import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState } from "react";

// Initialize Supabase Client
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://dubwryhfjyeuilahaknw.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1YndyeWhmanlldWlsYWhha253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTcxNzksImV4cCI6MjEwMzk5MzE3OX0.15K1XKBHaObYpgm6kpljd4Sqb1u7QXH5MSy1iiN3c08";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const router = useRouter();

  // State Management
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1); // 1 = Email, 2 = OTP
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Action 1: On submit Step 1, request 6-digit Email OTP from Supabase
   */
  const handleSendLoginCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid official email address.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        setError(supabaseError.message);
        return;
      }

      setStep(2);
      setSuccessMessage(`A 6-digit login code has been sent to ${cleanEmail}.`);
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      setError(err?.message || "Failed to dispatch login code. Please check email and retry.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action 2 & 3: On submit Step 2, verify 6-digit OTP and redirect to /dashboard
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit login code.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: supabaseError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "email",
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        setError(supabaseError.message);
        return;
      }

      // Action 3: On successful verification, redirect user to /dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      setError(err?.message || "Invalid or expired verification code. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 1-Click Demo Account Access without Authentication
   */
  const handleDemoAccess = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("veriscan_auth_token", "demo-institutional-token");
    }
    router.push("/dashboard");
  };

  return (
    <>
      <Head>
        <title>Sign in to VeriScan · Document Forensics</title>
        <meta name="description" content="Secure authentication for VeriScan document forensics." />
      </Head>

      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#2A2C30] to-[#3A3D42] text-[#FAF7F0] font-sans antialiased selection:bg-[#8A6D1F] selection:text-[#FAF7F0]">
        {/* Institutional Top Bar */}
        <header className="container mx-auto flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#FAF7F0] text-[#2A2C30] font-serif font-bold text-sm shadow-sm">
              V
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-[#FAF7F0]">
              VeriScan
            </span>
          </div>
        </header>

        {/* Centered Login Card */}
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-[420px] rounded-[10px] bg-[#FAF7F0] p-8 sm:p-10 shadow-2xl shadow-black/40 border border-black/5 text-[#2A2C30]">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#8A6D1F]/15 text-[#8A6D1F]">
                <ShieldCheck className="h-6 w-6 text-[#8A6D1F]" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2A2C30]">
                Sign in to VeriScan
              </h1>
              <p className="mt-2 text-sm text-[#2A2C30]/70 leading-relaxed">
                {step === 1
                  ? "Enter your official email to receive a 6-digit login code."
                  : `Enter the 6-digit login code sent to ${email}`}
              </p>
            </div>

            {/* Error Message in Red (#A23E3E) */}
            {error && (
              <div
                className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-[#A23E3E]/20 bg-[#A23E3E]/10 p-3 text-xs font-medium text-[#A23E3E]"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && !error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-emerald-600/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Step 1: Email Entry */}
            {step === 1 && (
              <form onSubmit={handleSendLoginCode} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#2A2C30] mb-2"
                  >
                    Work or Official Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investigator@agency.gov.in"
                    className="w-full h-11 px-3.5 py-2 text-sm text-[#2A2C30] bg-white border border-[#2A2C30]/20 rounded-[8px] placeholder-[#2A2C30]/40 focus:outline-none focus:border-[#8A6D1F] focus:ring-1 focus:ring-[#8A6D1F] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-11 mt-2 rounded-[8px] bg-[#8A6D1F] hover:bg-[#B08D2E] text-[#FAF7F0] font-medium text-sm transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Login Code…</span>
                    </>
                  ) : (
                    "Send Login Code"
                  )}
                </button>
              </form>
            )}

            {/* 1-Click Demo Account Access without Authentication */}
            {step === 1 && (
              <div className="mt-6 pt-5 border-t border-[#2A2C30]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2A2C30]/70 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#8A6D1F]" />
                    1-Click Demo Access
                  </span>
                  <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-200">
                    Instant Bypass
                  </span>
                </div>
                <p className="text-[11px] text-[#2A2C30]/65 mb-2.5 leading-snug">
                  Access the website and forensic tools instantly without entering an email or OTP.
                </p>
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  disabled={isLoading}
                  className="w-full h-10 rounded-[8px] bg-[#2A2C30] hover:bg-[#3A3D42] text-[#FAF7F0] font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Building2 className="h-3.5 w-3.5 text-[#8A6D1F]" />
                  <span>Enter as Verified Forensic Examiner (Demo)</span>
                </button>
              </div>
            )}

            {/* Step 2: 6-Digit OTP Entry */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#2A2C30] mb-2 flex items-center gap-1.5"
                  >
                    <LockKeyhole className="h-3.5 w-3.5 text-[#8A6D1F]" /> 6-Digit Login Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className="w-full h-12 px-3.5 py-2 text-center font-mono text-xl tracking-[0.4em] font-semibold text-[#2A2C30] bg-white border border-[#2A2C30]/20 rounded-[8px] placeholder-[#2A2C30]/30 focus:outline-none focus:border-[#8A6D1F] focus:ring-1 focus:ring-[#8A6D1F] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length !== 6}
                  className="w-full h-11 rounded-[8px] bg-[#8A6D1F] hover:bg-[#B08D2E] text-[#FAF7F0] font-medium text-sm transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying & Logging In…</span>
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs text-[#2A2C30]/70">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp("");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#8A6D1F] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to email
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSendLoginCode}
                    className="font-medium text-[#8A6D1F] hover:text-[#B08D2E] transition-colors cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 border-t border-[#2A2C30]/10 pt-4 text-center text-[11px] text-[#2A2C30]/50">
              Protected by Supabase Secure Authentication · VeriScan Forensics
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#FAF7F0]/50">
          &copy; {new Date().getFullYear()} VeriScan National Document Forensics. All rights reserved.
        </footer>
      </div>
    </>
  );
}
