import { useAuth } from "@/_core/hooks/useAuth";
import { supabase, formatToE164, isValidE164 } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  LockKeyhole,
  Building2,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export function Login() {
  const [, setLocation] = useLocation();
  const { user, sendOtp, verifyOtp, quickLogin } = useAuth();

  // Authentication mode: Email OTP (primary) or Phone SMS OTP
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");

  // State management for Email flow
  const [email, setEmail] = useState<string>("");

  // State management for Phone flow
  const [phone, setPhone] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");

  // Shared 2-step OTP flow state
  const [otp, setOtp] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1); // 1 for Email/Phone Entry, 2 for OTP Entry
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  /**
   * Action 1: Send Login Code via Supabase Email OTP
   */
  const handleSendEmailCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid official email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Direct Supabase Email OTP call
      const { data, error: supabaseError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        setError(supabaseError.message);
        toast.error(`Authentication Error: ${supabaseError.message}`);
        return;
      }

      // Success: swap UI to Step 2
      setStep(2);
      const msg = `A 6-digit login code was sent to ${cleanEmail}.`;
      setSuccessMessage(msg);
      toast.success("Login Code Dispatched", { description: msg });
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      const msg = err?.message || "Failed to dispatch login code. Please check email and retry.";
      setError(msg);
      toast.error(`Authentication Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action 2: Verify OTP via Supabase Email OTP & Redirect
   */
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit passcode.");
      return;
    }

    setIsLoading(true);

    try {
      // Call Supabase verifyOtp with type 'email'
      const { data, error: supabaseError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "email",
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        setError(supabaseError.message);
        toast.error(`Verification Failed: ${supabaseError.message}`);
        return;
      }

      // Synchronize with local server session if available
      try {
        await verifyOtp({
          email: email.trim().toLowerCase(),
          token: cleanOtp,
        });
      } catch (syncErr) {
        console.warn("Server session sync notice (non-fatal):", syncErr);
      }

      toast.success("Identity verified successfully", {
        description: "Welcome back to the VeriScan Forensic Workspace.",
      });

      // Action 3: Automatically redirect to /dashboard
      setLocation("/dashboard");
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      const msg = err?.message || "Invalid or expired verification code. Please retry.";
      setError(msg);
      toast.error(`Verification Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Phone SMS OTP handlers (fallback / secondary mode)
   */
  const handleSendPhoneCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formattedPhoneNumber = formatToE164(phone, countryCode);
    if (!formattedPhoneNumber || !isValidE164(formattedPhoneNumber)) {
      setError(`Invalid phone number format (${phone}). Please enter a valid mobile number.`);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithOtp({
        phone: formattedPhoneNumber,
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        let msg = supabaseError.message;
        if (supabaseError.message.includes("Unsupported phone provider") || (supabaseError as any).code === "phone_provider_disabled") {
          msg = "Phone provider disabled in Supabase. Please use Email OTP or enable Phone in Supabase Dashboard.";
        }
        setError(msg);
        toast.error(`Authentication Error: ${msg}`);
        return;
      }

      setStep(2);
      const msg = `A 6-digit SMS code was sent to ${formattedPhoneNumber}.`;
      setSuccessMessage(msg);
      toast.success("Security SMS Dispatched", { description: msg });
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      setError(err?.message || "Failed to dispatch SMS code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit passcode.");
      return;
    }

    const formattedPhoneNumber = formatToE164(phone, countryCode);
    setIsLoading(true);

    try {
      const { data, error: supabaseError } = await supabase.auth.verifyOtp({
        phone: formattedPhoneNumber,
        token: cleanOtp,
        type: "sms",
      });

      if (supabaseError) {
        console.error("SUPABASE_AUTH_ERROR:", supabaseError);
        setError(supabaseError.message);
        toast.error(`Verification Failed: ${supabaseError.message}`);
        return;
      }

      try {
        await verifyOtp({
          phone: formattedPhoneNumber,
          token: cleanOtp,
        });
      } catch (syncErr) {
        console.warn("Server session sync notice:", syncErr);
      }

      toast.success("Identity verified successfully");
      setLocation("/dashboard");
    } catch (err: any) {
      console.error("SUPABASE_AUTH_ERROR:", err);
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 1-Click Demo Account Access without Authentication (Bypass OTP for evaluation)
   */
  const handleDemoAccess = async (profile: "analyst" | "investigator" = "investigator") => {
    setIsLoading(true);
    setError(null);
    try {
      await quickLogin(profile);
      toast.success("Institutional Demo Access Granted", {
        description: "Authenticated as Senior Forensic Investigator (National Cyber Crime Portal).",
      });
      setLocation("/dashboard");
    } catch {
      localStorage.setItem("veriscan_auth_token", "demo-token");
      setLocation("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#2A2C30] to-[#3A3D42] text-[#FAF7F0] font-sans antialiased selection:bg-[#8A6D1F] selection:text-[#FAF7F0]">
      {/* Top minimal institutional bar */}
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#FAF7F0] text-[#2A2C30] font-serif font-bold text-sm shadow-sm">
            V
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-[#FAF7F0]">
            VeriScan
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#FAF7F0]/70 hover:text-[#FAF7F0] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </header>

      {/* Main Centered Authentication Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] rounded-[10px] bg-[#FAF7F0] p-8 sm:p-10 shadow-2xl shadow-black/40 border border-black/5 text-[#2A2C30]">
          {/* Brand Header */}
          <div className="text-center">
            <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#8A6D1F]/15 text-[#8A6D1F]">
              <ShieldCheck className="h-6 w-6 text-[#8A6D1F]" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2A2C30]">
              Sign in to VeriScan
            </h1>
            <p className="mt-2 text-sm text-[#2A2C30]/70 leading-relaxed">
              {step === 1
                ? authMode === "email"
                  ? "Enter your official email to receive a 6-digit login code."
                  : "Enter your mobile phone number to receive an SMS passcode."
                : authMode === "email"
                ? `Enter the 6-digit login code sent to ${email}`
                : `Enter the 6-digit SMS code sent to ${phone}`}
            </p>
          </div>

          {/* Mode Selector Tabs (Email vs Phone) */}
          {step === 1 && (
            <div className="mt-6 flex rounded-[8px] bg-[#2A2C30]/5 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("email");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "email"
                    ? "bg-white text-[#2A2C30] shadow-xs"
                    : "text-[#2A2C30]/60 hover:text-[#2A2C30]"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("phone");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "phone"
                    ? "bg-white text-[#2A2C30] shadow-xs"
                    : "text-[#2A2C30]/60 hover:text-[#2A2C30]"
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Phone SMS
              </button>
            </div>
          )}

          {/* Error Message in Red */}
          {error && (
            <div
              className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-[#A23E3E]/20 bg-[#A23E3E]/10 p-3 text-xs font-medium text-[#A23E3E]"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && !error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-emerald-600/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* STEP 1: EMAIL ENTRY */}
          {step === 1 && authMode === "email" && (
            <form onSubmit={handleSendEmailCode} className="mt-6 space-y-4">
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

          {/* STEP 1 (PHONE ALTERNATIVE) */}
          {step === 1 && authMode === "phone" && (
            <form onSubmit={handleSendPhoneCode} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#2A2C30] mb-2"
                >
                  Mobile Phone Number
                </label>
                <div className="flex rounded-[8px] border border-[#2A2C30]/20 bg-white focus-within:border-[#8A6D1F] focus-within:ring-1 focus-within:ring-[#8A6D1F] transition-all">
                  <span className="flex items-center px-3 border-r border-[#2A2C30]/15 text-xs font-bold text-[#2A2C30]/80 select-none">
                    {countryCode}
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full h-11 px-3 py-2 text-sm text-[#2A2C30] bg-transparent focus:outline-none placeholder-[#2A2C30]/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !phone.trim()}
                className="w-full h-11 mt-2 rounded-[8px] bg-[#8A6D1F] hover:bg-[#B08D2E] text-[#FAF7F0] font-medium text-sm transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Security SMS…</span>
                  </>
                ) : (
                  "Send SMS Code"
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
                onClick={() => handleDemoAccess("investigator")}
                disabled={isLoading}
                className="w-full h-10 rounded-[8px] bg-[#2A2C30] hover:bg-[#3A3D42] text-[#FAF7F0] font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Building2 className="h-3.5 w-3.5 text-[#8A6D1F]" />
                <span>Enter as Verified Forensic Examiner (Demo)</span>
              </button>
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP ENTRY */}
          {step === 2 && (
            <form
              onSubmit={authMode === "email" ? handleVerifyEmailCode : handleVerifyPhoneCode}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="otp"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#2A2C30] mb-2 flex items-center gap-1.5"
                >
                  <LockKeyhole className="h-3.5 w-3.5 text-[#8A6D1F]" /> 6-Digit Passcode
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
                  <ArrowLeft className="h-3 w-3" /> Back to {authMode === "email" ? "email" : "phone"}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={authMode === "email" ? () => handleSendEmailCode() : () => handleSendPhoneCode()}
                  className="font-medium text-[#8A6D1F] hover:text-[#B08D2E] transition-colors cursor-pointer"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* Footer inside card */}
          <div className="mt-8 border-t border-[#2A2C30]/10 pt-4 text-center text-[11px] text-[#2A2C30]/50">
            Protected by Supabase Secure Authentication · VeriScan Forensics
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="py-4 text-center text-xs text-[#FAF7F0]/50">
        &copy; {new Date().getFullYear()} VeriScan National Document Forensics. All rights reserved.
      </footer>
    </div>
  );
}

export default Login;
