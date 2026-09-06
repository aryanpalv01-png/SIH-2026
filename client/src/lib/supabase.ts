import { createClient } from "@supabase/supabase-js";

// Supabase credentials for VeriScan Govt Forensic Architecture
export const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://dubwryhfjyeuilahaknw.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.endsWith(".anon") &&
  !SUPABASE_ANON_KEY.includes("placeholder") &&
  SUPABASE_ANON_KEY.length > 40
);

// Always create client so supabase.auth methods are callable
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Returns the production redirect URL for Supabase Auth (email confirmation, magic links).
 * Strictly avoids localhost to prevent ERR_CONNECTION_REFUSED on mobile devices.
 */
export function getAuthRedirectUrl(path: string = "/dashboard"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    const isLocal =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("0.0.0.0");
    if (!isLocal) {
      return `${origin}${cleanPath}`;
    }
  }

  const envRedirect =
    (typeof process !== "undefined" &&
      (process.env?.VITE_AUTH_REDIRECT_URL || process.env?.NEXT_PUBLIC_AUTH_REDIRECT_URL)) ||
    (import.meta as any).env?.VITE_AUTH_REDIRECT_URL;

  if (envRedirect) {
    return `${envRedirect.replace(/\/+$/, "")}${cleanPath}`;
  }

  // Official production URL
  return `https://bharatdrishti.onrender.com${cleanPath}`;
}

/**
 * Strict E.164 phone number formatter for SMS gateways (Twilio / Supabase).
 * Strips all spaces, dashes, brackets, and non-digit characters.
 * Ensures the phone number starts strictly with '+' and country code (e.g. +91).
 */
export function formatToE164(rawPhone: string, defaultCountryCode: string = "+91"): string {
  if (!rawPhone) return "";

  // Strip all spaces, dashes, parentheses, dots, slashes
  let cleaned = rawPhone.replace(/[\s\-\(\)\[\]\.\/\\]/g, "").trim();

  // Strip international dialing prefixes like 0091 -> +91
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Strip leading domestic single 0 (e.g. 09876543210 -> 9876543210)
  if (cleaned.startsWith("0") && !cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/^0+/, "");
  }

  // Ensure leading '+'
  if (!cleaned.startsWith("+")) {
    // If it starts with '91' and has 12 digits (Indian format without plus)
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    } else {
      // Prepend country code (e.g. +91)
      const cc = defaultCountryCode.startsWith("+") ? defaultCountryCode : `+${defaultCountryCode}`;
      cleaned = `${cc}${cleaned}`;
    }
  }

  return cleaned;
}

// Alias for backward compatibility
export const formatE164Phone = formatToE164;

/**
 * Standard E.164 Phone Format Regular Expression:
 * Strictly '+' followed by 1-3 digits country code, followed by national subscriber digits (8-15 total digits)
 */
export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Validates whether a phone string satisfies strict E.164 specification.
 */
export function isValidE164(phone: string): boolean {
  return E164_PHONE_REGEX.test(phone);
}

/**
 * Step 1: Send SMS OTP to phone number using Supabase Phone Auth.
 */
export async function sendPhoneOtp(phoneNumber: string) {
  const formattedPhone = formatToE164(phoneNumber);
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    if (error) {
      console.error("SUPABASE_AUTH_ERROR:", error);
      return { success: false, message: error.message, error, data: null, phone: formattedPhone };
    }
    return { success: true, message: null, error: null, data, phone: formattedPhone };
  } catch (err: any) {
    console.error("SUPABASE_AUTH_ERROR:", err);
    return { success: false, message: err?.message || "Failed to send SMS OTP", error: err, data: null, phone: formattedPhone };
  }
}

/**
 * Step 2: Verify SMS OTP using Supabase Phone Auth.
 */
export async function verifyPhoneOtp(phoneNumber: string, manualOtp: string) {
  const formattedPhone = formatToE164(phoneNumber);
  const cleanOtp = manualOtp.trim();
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: cleanOtp,
      type: "sms",
    });
    if (error) {
      console.error("SUPABASE_AUTH_ERROR:", error);
      return { success: false, message: error.message, error, session: null, user: null, phone: formattedPhone };
    }
    return { success: true, message: null, error: null, session: data.session, user: data.user, phone: formattedPhone };
  } catch (err: any) {
    console.error("SUPABASE_AUTH_ERROR:", err);
    return { success: false, message: err?.message || "Invalid or expired SMS OTP", error: err, session: null, user: null, phone: formattedPhone };
  }
}

/**
 * Register a new user with Email and Password using Supabase.
 * Embeds full name and ensures email confirmation / magic links redirect to production URL.
 */
export async function signUpWithEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  redirectTo?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const redirectUrl = params.redirectTo || getAuthRedirectUrl("/dashboard");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          name: params.name.trim(),
          full_name: params.name.trim(),
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("SUPABASE_SIGNUP_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_SIGNUP_ERROR:", err);
    return { success: false, message: err?.message || "Registration failed", error: err, data: null };
  }
}

/**
 * Sign in an existing user with Email and Password using Supabase.
 */
export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: params.password,
    });

    if (error) {
      console.error("SUPABASE_LOGIN_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_LOGIN_ERROR:", err);
    return { success: false, message: err?.message || "Login failed", error: err, data: null };
  }
}

/**
 * Send an Email OTP / Magic Link with production redirect URL.
 */
export async function sendEmailOtpOrMagicLink(params: {
  email: string;
  redirectTo?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const redirectUrl = params.redirectTo || getAuthRedirectUrl("/dashboard");

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("SUPABASE_EMAIL_OTP_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_EMAIL_OTP_ERROR:", err);
    return { success: false, message: err?.message || "Failed to dispatch email code", error: err, data: null };
  }
}

/**
 * Verify a 6-digit Email OTP code using Supabase.
 */
export async function verifyEmailOtp(params: {
  email: string;
  token: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanToken = params.token.trim();

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });

    if (error) {
      console.error("SUPABASE_VERIFY_OTP_ERROR:", error);
      return { success: false, message: error.message, error, session: null, user: null };
    }

    return { success: true, message: null, error: null, session: data.session, user: data.user };
  } catch (err: any) {
    console.error("SUPABASE_VERIFY_OTP_ERROR:", err);
    return { success: false, message: err?.message || "Verification code invalid or expired", error: err, session: null, user: null };
  }
}

