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
  qr_signature_verification: 3.5,
  copy_move_clone_detection: 1.8,
  trufor_inference: 1.8,
  catnet_inference: 1.8,
  ocr_typography_consistency: 1.5,
  screenshot_capture_detection: 1.2,
  ela_compression_analysis: 1.0,
  ai_generated_image_detector: 1.0,
  metadata_exif_inspection: 1.0,
};

/**
 * Tier A Checks:
 * STRICT RULE: Tier A hard overrides apply ONLY to definitive deterministic failures:
 * - Mathematical checksum failure (Verhoeff algorithm / PAN structural regex)
 * - Cryptographic signature mismatch (UIDAI 2048-bit digital signature / issuer cert)
 *
 * Visual and neural modules are heuristic and MUST NOT trigger Tier A hard overrides.
 */
export const DETERMINISTIC_TIER_A_CHECKS = new Set([
  "checksum_identifier_validation",
  "qr_signature_verification",
]);

/**
 * Visual & Heuristic (Tier B) Checks:
 * Secondary indicators (typography, ELA resaving, screenshot capture, clone localization, TruFor/CAT-Net).
 * These modules are cumulative:
 * - A single heuristic flag lowers the score moderately.
 * - 2 or more failing simultaneously triggers a "Likely Forged" verdict (<40).
 */
export const HEURISTIC_CHECKS = new Set([
  "ela_compression_analysis",
  "ocr_typography_consistency",
  "screenshot_capture_detection",
  "copy_move_clone_detection",
  "trufor_inference",
  "catnet_inference",
  "ai_generated_image_detector",
]);

/**
 * VeriScan Institutional Score Fusion Engine:
 * Combines granular forensic observations into a transparent Tamper Confidence Score (0–100).
 *
 * Rules:
 * 1. Tier A hard overrides apply ONLY to definitive deterministic failures (checksum or QR signature).
 * 2. Visual/heuristic modules are cumulative: a single flag lowers score moderately, while 2 or more
 *    failing simultaneously trigger "Likely Forged" (< 40).
 * 3. Clean, high-resolution genuine documents are protected from getting dragged into "Needs Review"
 *    due to minor compression variations.
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

  // 1. Identify Tier A Deterministic Hard Failures ONLY
  const tierAFailures: string[] = [];

  for (const c of active) {
    if (c.result !== "flag") continue;

    // Only definitive deterministic failures trigger Tier A
    if (DETERMINISTIC_TIER_A_CHECKS.has(c.checkName)) {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    }
  }

  const isTierAFailed = tierAFailures.length > 0;

  // 2. Identify Heuristic (Visual / Neural) Failures
  const tierBFailures = active
    .filter((c) => HEURISTIC_CHECKS.has(c.checkName) && c.result === "flag")
    .map((c) => `${c.checkName}: ${c.explanation}`);

  const isCumulativeHeuristicFail = tierBFailures.length >= 2;
  const isSingleHeuristicFail = tierBFailures.length === 1;

  // 3. Compute Base Weighted Score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const item of active) {
    const weight = MODULE_WEIGHTS[item.checkName] ?? 1.0;
    totalWeight += weight;
    weightedSum += item.confidence * weight;
  }

  const rawScore = Math.round(weightedSum / Math.max(0.1, totalWeight));
  let score = rawScore;
  let penaltiesApplied = 0;

  // 4. Apply Cumulative Heuristic Rules
  if (isCumulativeHeuristicFail) {
    // 2 or more heuristic flags failing simultaneously: trigger "Likely Forged" (< 40)
    const penalty = Math.max(35, score - 38);
    penaltiesApplied += penalty;
    score = Math.min(38, Math.max(0, score - penalty));
  } else if (isSingleHeuristicFail) {
    // A single heuristic flag: lower score moderately without dragging clean genuine documents down
    const failedCheck = active.find((c) => HEURISTIC_CHECKS.has(c.checkName) && c.result === "flag");
    const isMinorCompression = failedCheck?.checkName === "ela_compression_analysis";

    // Minor compression variation penalty is mild (3 points); other single flags deduct 5 points
    const moderatePenalty = isMinorCompression ? 3 : 5;
    penaltiesApplied += moderatePenalty;
    score = Math.max(0, score - moderatePenalty);

    // Rule 3 Protection: Prevent clean, high-resolution genuine documents from getting dragged into "Needs Review"
    // If the document has strong authentic signals (raw score >= 80 and no deterministic failure),
    // protect the "verified" status (> 80, e.g. 81-88) from an isolated compression variation or single heuristic flag.
    const hasStrongPasses = active.some(
      (c) => c.result === "pass" && c.confidence >= 85
    );

    if (!isTierAFailed && rawScore >= 80 && hasStrongPasses) {
      score = Math.max(81, score);
    }
  }

  // 5. Apply Tier A Hard Override (Definitive Deterministic Failures ONLY)
  // Forcibly caps score below 35 (Likely Forged), overriding any passing metadata or heuristics
  if (isTierAFailed) {
    score = Math.min(34, score);
  }

  // 6. Final Verdict Mapping
  // verified: score > 80
  // needs_review: 40 <= score <= 80
  // likely_forged: score < 40
  const status: FusionVerdict =
    score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged";

  return {
    score,
    status,
    tierAHardOverride: isTierAFailed,
    tierBCumulativePenalty: isCumulativeHeuristicFail,
    tierAFailures,
    tierBFailures,
    rawScore,
    penaltiesApplied,
  };
}
