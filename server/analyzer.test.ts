import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyzer";

describe("analyzeDocument", () => {
  it("returns a verified result for a supported, consistent PDF", () => {
    const result = analyzeDocument({ filename: "passport_scan.pdf", mimeType: "application/pdf", fileSize: 2400000, documentType: "passport" });
    expect(result.status).toBe("verified");
    expect(result.score).toBeGreaterThan(80);
    expect(result.checks).toHaveLength(6);
    expect(result.checks.find((check) => check.checkName === "qr_checksum_validation")?.result).toBe("pass");
  });

  it("flags edit markers and keeps a structured explanation for the report", () => {
    const result = analyzeDocument({ filename: "marksheet_final_copy.pdf", mimeType: "application/pdf", fileSize: 3100000, documentType: "marksheet" });
    expect(result.status).toBe("likely_forged");
    expect(result.score).toBeLessThan(40);
    expect(result.checks.some((check) => check.result === "flag")).toBe(true);
    expect(result.checks.every((check) => check.explanation.length > 10)).toBe(true);
  });

  it("marks QR validation as not applicable for documents without a machine-readable field", () => {
    const result = analyzeDocument({ filename: "salary_certificate.jpg", mimeType: "image/jpeg", fileSize: 1800000, documentType: "other" });
    const qrCheck = result.checks.find((check) => check.checkName === "qr_checksum_validation");
    expect(qrCheck?.result).toBe("not_applicable");
    expect(qrCheck?.confidence).toBe(0);
  });

  it("rejects unsupported formats deterministically", () => {
    const result = analyzeDocument({ filename: "unknown.txt", mimeType: "text/plain", fileSize: 1200, documentType: "other" });
    expect(result.status).toBe("likely_forged");
    expect(result.checks[0]?.result).toBe("flag");
  });
});
