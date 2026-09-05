import { describe, expect, it, vi } from "vitest";
import {
  formatToE164,
  formatE164Phone,
  isValidE164,
  E164_PHONE_REGEX,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "./supabase";

describe("Supabase Phone Auth E.164 Formatter", () => {
  it("formats plain 10-digit Indian numbers with +91 prepended", () => {
    expect(formatToE164("9876543210")).toBe("+919876543210");
  });

  it("strips spaces and hyphens from phone numbers", () => {
    expect(formatToE164("98765 43210")).toBe("+919876543210");
    expect(formatToE164("987-654-3210")).toBe("+919876543210");
    expect(formatToE164("+91 98765 43210")).toBe("+919876543210");
    expect(formatToE164("+91-98765-43210")).toBe("+919876543210");
  });

  it("strips parentheses and brackets", () => {
    expect(formatToE164("(+91) 98765-43210")).toBe("+919876543210");
    expect(formatToE164("[91] 98765 43210")).toBe("+919876543210");
  });

  it("strips leading domestic 0 prefix", () => {
    expect(formatToE164("09876543210")).toBe("+919876543210");
    expect(formatToE164("0 98765 43210")).toBe("+919876543210");
  });

  it("handles 12-digit format starting with 91 without plus", () => {
    expect(formatToE164("919876543210")).toBe("+919876543210");
  });

  it("handles international dial prefix 00", () => {
    expect(formatToE164("00919876543210")).toBe("+919876543210");
  });

  it("preserves international numbers with country code", () => {
    expect(formatToE164("+1 (555) 234-5678")).toBe("+15552345678");
  });

  it("supports formatE164Phone alias", () => {
    expect(formatE164Phone("9876543210")).toBe("+919876543210");
  });

  it("validates formatted numbers against E.164 standard regex", () => {
    const formatted = formatToE164("9876543210");
    expect(isValidE164(formatted)).toBe(true);
    expect(E164_PHONE_REGEX.test(formatted)).toBe(true);

    expect(isValidE164("+919876543210")).toBe(true);
    expect(isValidE164("+15552345678")).toBe(true);
    expect(isValidE164("9876543210")).toBe(false); // Missing '+'
    expect(isValidE164("+0123456789")).toBe(false); // Leading zero in country code
    expect(isValidE164("+123")).toBe(false); // Too short
  });
});

describe("Supabase Phone Auth Error Handling", () => {
  it("captures and logs SUPABASE_AUTH_ERROR on auth failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await sendPhoneOtp("+919876543210");

    // Because VITE_SUPABASE_ANON_KEY is empty/placeholder, it should capture the error
    expect(consoleSpy).toHaveBeenCalledWith(
      "SUPABASE_AUTH_ERROR:",
      expect.anything()
    );
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("captures and logs SUPABASE_AUTH_ERROR on verify failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await verifyPhoneOtp("+919876543210", "123456");

    expect(consoleSpy).toHaveBeenCalledWith(
      "SUPABASE_AUTH_ERROR:",
      expect.anything()
    );
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    consoleSpy.mockRestore();
  });
});
