import type { AnalysisCheck } from "../analyzer";

export type ForensicProvider = "local" | "huggingface" | "trufor" | "catnet" | "ocr" | "pixel";
export type ForensicModuleResult = AnalysisCheck & {
  provider: ForensicProvider;
  available: boolean;
};

export type FusionVerdict = "verified" | "needs_review" | "likely_forged";

export interface FusionResult {
  score: number;
  status: FusionVerdict;
  tierAHardOverride: boolean;
  tierBCumulativePenalty: boolean;
  tierAFailures: string[];
  tierBFailures: string[];
  rawScore: number;
  penaltiesApplied: number;
}

const MODULE_WEIGHTS: Record<string, number> = {
  checksum_identifier_validation: 3.5,
  qr_signature_verification: 3.2,
  trufor_inference: 2.5,
  catnet_inference: 2.5,
  copy_move_clone_detection: 2.0,
  ocr_typography_consistency: 1.8,
  ela_compression_analysis: 1.5,
  screenshot_capture_detection: 1.2,
  ai_generated_image_detector: 1.2,
  metadata_exif_inspection: 1.0,
};

/**
 * High-evidentiary (Tier A) checks:
 * Failure here represents direct mathematical, cryptographic, or cloned visual proof.
 */
const TIER_A_CHECKS = new Set([
  "checksum_identifier_validation",
  "qr_signature_verification",
  "copy_move_clone_detection",
  "trufor_inference",
  "catnet_inference",
]);

/**
 * Medium-evidentiary (Tier B) checks:
 * Secondary heuristic indicators (typography, ELA resaving, screenshot variance).
 */
const TIER_B_CHECKS = new Set([
  "ocr_typography_consistency",
  "ela_compression_analysis",
  "screenshot_capture_detection",
]);

/**
 * VeriScan Institutional Score Fusion Engine:
 * Combines granular forensic observation outputs into a transparent Tamper Confidence Score (0–100).
 *
 * Enforces strict two-tier overrides:
 * - Tier A Hard Overrides: If any high-evidentiary check fails, forcibly cap the overall
 *   confidence score below 35 (verdict: "Likely Forged"), overriding any passing metadata or ELA checks.
 * - Tier B Cumulative Penalties: If two or more medium-evidentiary checks fail, apply a
 *   cumulative penalty pushing the score into "Needs Review" (<= 55) or "Likely Forged" (< 35).
 */
export function fuseForensicChecks(checks: ForensicModuleResult[]): FusionResult {
  const active = checks.filter((item) => item.result !== "not_applicable");
  if (!active.length) {
    return {
      score: 50,
      status: "needs_review",
      tierAHardOverride: false,
      tierBCumulativePenalty: false,
      tierAFailures: [],
      tierBFailures: [],
      rawScore: 50,
      penaltiesApplied: 0,
    };
  }

  // 1. Identify Tier A Hard Override Failures
  const tierAFailures: string[] = [];

  for (const c of active) {
    if (c.result !== "flag") continue;

    // A1: Deterministic Checksum Failure (Verhoeff for Aadhaar, Regex for PAN)
    if (c.checkName === "checksum_identifier_validation") {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    }

    // A2: Cryptographic Signature Failure (UIDAI 2048-bit digital signature mismatch)
    if (c.checkName === "qr_signature_verification") {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    }

    // A3: High-Confidence Copy-Move / Clone Localization Match
    if (c.checkName === "copy_move_clone_detection" && (Boolean(c.flaggedRegion) || c.confidence <= 40)) {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    }

    // A4: High-Confidence Neural Tamper Localization (TruFor / CAT-Net)
    if ((c.checkName === "trufor_inference" || c.checkName === "catnet_inference") && c.confidence < 40) {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    }
  }

  const isTierAFailed = tierAFailures.length > 0;

  // 2. Identify Tier B Medium-Evidentiary Failures
  const tierBFailures = active
    .filter((c) => TIER_B_CHECKS.has(c.checkName) && c.result === "flag")
    .map((c) => `${c.checkName}: ${c.explanation}`);

  const isTierBFailCumulative = tierBFailures.length >= 2;

  // 3. Compute Base Weighted Score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const item of active) {
    const weight = MODULE_WEIGHTS[item.checkName] ?? (TIER_A_CHECKS.has(item.checkName) ? 2.5 : 1.0);
    totalWeight += weight;
    weightedSum += item.confidence * weight;
  }

  const rawScore = Math.round(weightedSum / Math.max(0.1, totalWeight));
  let score = rawScore;
  let penaltiesApplied = 0;

  // 4. Apply Tier B Cumulative Penalties
  if (isTierBFailCumulative) {
    if (tierBFailures.length === 2) {
      // 2 medium checks fail: apply cumulative penalty (deduct 20) and cap at 55 (Needs Review)
      const penalty = 20;
      penaltiesApplied = penalty;
      score = Math.min(55, Math.max(0, score - penalty));
    } else if (tierBFailures.length >= 3) {
      // 3 or more medium checks fail: apply severe cumulative penalty and cap below 35 (Likely Forged)
      const penalty = 40;
      penaltiesApplied = penalty;
      score = Math.min(34, Math.max(0, score - penalty));
    }
  }

  // 5. Apply Tier A Hard Override (Absolute Priority)
  // Forcibly caps score below 35 (Likely Forged), overriding passing metadata or ELA checks
  if (isTierAFailed) {
    score = Math.min(34, score);
  }

  // Final Verdict Mapping
  const status: FusionVerdict =
    score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged";

  return {
    score,
    status,
    tierAHardOverride: isTierAFailed,
    tierBCumulativePenalty: isTierBFailCumulative,
    tierAFailures,
    tierBFailures,
    rawScore,
    penaltiesApplied,
  };
}
