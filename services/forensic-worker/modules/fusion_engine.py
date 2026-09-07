from __future__ import annotations

from typing import Any

CHECK_WEIGHTS: dict[str, float] = {
    "checksum_validation": 3.5,
    "qr_signature_verification": 3.0,
    "ocr_typography_consistency": 2.0,
    "metadata_exif_inspection": 1.5,
    "trufor_inference": 2.0,
    "catnet_inference": 2.0,
    "ela_compression_analysis": 1.5,
    "copy_move_clone_detection": 1.5,
    "ai_generated_image_detector": 1.2,
    "screenshot_capture_detection": 1.0,
}

DETERMINISTIC_CHECKS = {"checksum_validation", "qr_signature_verification"}


NEURAL_MODULE_CHECKS = {
    "trufor_inference",
    "catnet_inference",
    "ai_generated_image_detector",
    "pixel_clone_worker",
    "copy_move_clone_detection",
    "ocr_typography_consistency",
}


def fuse_scores(checks: list[dict[str, Any]]) -> dict[str, Any]:
    # Normalize offline, uninitialized, 503/501, or null-value checks to not_applicable with 0.0 weight
    unconfigured_modules: list[str] = []
    dormant_neural_checks: list[str] = []

    for c in checks:
        result = c.get("result")
        conf = c.get("confidence")
        expl = str(c.get("explanation", "")).lower()
        status_code = c.get("status")
        check_name = c.get("checkName", "")

        is_offline = (
            result in ("not_applicable", "error")
            or conf is None
            or status_code in (501, 503)
            or "503" in expl
            or "501" in expl
            or "missing weight" in expl
            or "weights missing" in expl
            or "missing local weight" in expl
            or "checkpoint is not configured" in expl
            or "missing checkpoint" in expl
            or "not configured" in expl
            or "uninitialized" in expl
            or "offline" in expl
            or "missing api key" in expl
            or "add hf_api_token" in expl
            or "no third-party api key" in expl
            or "neutral score" in expl
            or "neutral fallback" in expl
            or "fallback to neutral" in expl
            or "dormant" in expl
            or c.get("providerState") == "not_configured"
            or c.get("available") is False
        )
        if is_offline:
            c["result"] = "not_applicable"
            c["confidence"] = 0
            c["available"] = False
            c["weight"] = 0.0
            c["effective_weight"] = 0.0
            unconfigured_modules.append(check_name)
            if check_name in NEURAL_MODULE_CHECKS or "neural" in expl or "weights" in expl:
                dormant_neural_checks.append(check_name)
        else:
            w = CHECK_WEIGHTS.get(check_name, 1.0)
            c["weight"] = w
            c["effective_weight"] = w

    active_checks = [c for c in checks if c.get("result") != "not_applicable"]

    if not active_checks:
        return {
            "score": 50,
            "status": "needs_review",
            "verdict": "Needs Review",
            "summary": "No active forensic checks could be applied to this document.",
            "hard_fail": False,
            "flagged_findings": [],
            "flagged_count": 0,
            "passed_count": 0,
            "total_active_checks": 0,
            "not_applicable_checks": [c.get("checkName") for c in checks if c.get("result") == "not_applicable"],
            "unconfigured_modules": unconfigured_modules,
            "dormant_neural_checks": dormant_neural_checks,
            "active_modules_count": 0,
            "checks": checks,
        }

    # Deterministic failure: checksum fail, QR signature fail, or high-confidence clone/tamper localization
    def is_tier_a_fail(c: dict[str, Any]) -> bool:
        if c.get("result") != "flag":
            return False
        name = c.get("checkName", "")
        if name in DETERMINISTIC_CHECKS:
            return True
        expl = str(c.get("explanation", "")).lower()
        conf = float(c.get("confidence", 50))
        if name in ("copy_move_clone_detection", "pixel_clone_worker", "trufor_inference", "catnet_inference"):
            if "high-confidence" in expl or "high confidence" in expl or "confirmed clone" in expl:
                return True
            if conf <= 20:
                return True
        if name == "ocr_typography_consistency" and conf <= 10:
            return True
        return False

    hard_failed_checks = [c for c in active_checks if is_tier_a_fail(c)]
    has_hard_fail = len(hard_failed_checks) > 0

    flagged_checks = [c for c in active_checks if c.get("result") == "flag"]
    tier_b_checks = [c for c in flagged_checks if not is_tier_a_fail(c)]
    passed_checks = [c for c in active_checks if c.get("result") == "pass"]
    has_strong_passes = any(float(c.get("confidence", 0)) >= 85 for c in passed_checks)

    # 1. Base Score = 100 (Penalty-Subtraction Model)
    BASE_SCORE = 100
    penalties = 0

    # Passing checks minor variance
    for c in passed_checks:
        conf = float(c.get("confidence", 100))
        if conf < 70:
            penalties += round((85 - conf) * 0.15)
        elif conf < 85:
            penalties += round((85 - conf) * 0.08)

    # Tier B Visual / Typography deductions
    if len(tier_b_checks) >= 2:
        # Check if they are just mild metadata + slight compression (mixed review signals)
        is_mixed_review = (
            len(tier_b_checks) == 2
            and any(c.get("checkName") == "metadata_exif_inspection" for c in tier_b_checks)
            and any(c.get("checkName") == "ela_compression_analysis" for c in tier_b_checks)
            and all(float(c.get("confidence", 0)) >= 35 for c in tier_b_checks)
        )
        if is_mixed_review:
            penalties += 50  # Results in 50 (Needs Review)
        else:
            for c in tier_b_checks:
                name = c.get("checkName", "")
                deduction = 34 if name == "ocr_typography_consistency" else 32
                penalties += deduction
    elif len(tier_b_checks) == 1:
        c = tier_b_checks[0]
        name = c.get("checkName", "")
        expl = str(c.get("explanation", "")).lower()
        is_minor = (
            (name == "ela_compression_analysis" and ("minor" in expl or "slight" in expl or float(c.get("confidence", 0)) >= 50))
            or (name == "copy_move_clone_detection" and "potential" in expl)
        )
        if is_minor and has_strong_passes:
            penalties += 12
        else:
            penalties += 30

    raw_score = max(0, BASE_SCORE - penalties)
    final_score = raw_score

    # If cumulative visual/typography failure (2+ Tier B flags, not mixed review), drop sharply below 40
    if len(tier_b_checks) >= 2 and not (
        len(tier_b_checks) == 2
        and any(c.get("checkName") == "metadata_exif_inspection" for c in tier_b_checks)
        and any(c.get("checkName") == "ela_compression_analysis" for c in tier_b_checks)
        and all(float(c.get("confidence", 0)) >= 35 for c in tier_b_checks)
    ):
        final_score = min(36, final_score)

    # Protect clean genuine documents with single minor flag from dropping below 85
    if len(tier_b_checks) == 1 and not has_hard_fail and has_strong_passes:
        c = tier_b_checks[0]
        expl = str(c.get("explanation", "")).lower()
        if "minor" in expl or "potential" in expl:
            final_score = max(85, final_score)

    # Hard Tier A Overrides: strictly clamp final score into 15 to 25 range ("Likely Forged")
    if has_hard_fail:
        final_score = min(25, max(15, final_score if final_score <= 25 else 20))

    # Thresholds: >80 Verified, 40-80 Needs Review, <40 Likely Forged
    if final_score > 80:
        status = "verified"
        verdict = "Verified"
    elif final_score >= 40:
        status = "needs_review"
        verdict = "Needs Review"
    else:
        status = "likely_forged"
        verdict = "Likely Forged"

    flagged = [c for c in active_checks if c.get("result") == "flag"]
    passed = [c for c in active_checks if c.get("result") == "pass"]
    na_list = [c.get("checkName") for c in checks if c.get("result") == "not_applicable"]

    explanations = [f"- {c.get('checkName')}: {c.get('explanation')}" for c in flagged]

    if has_hard_fail:
        summary = (
            f"Likely Forged (Score: {final_score}/100). Critical failure in mathematical/integrity verification "
            f"({', '.join(c.get('checkName') for c in hard_failed_checks)}). "
            f"{len(flagged)} checks flagged out of {len(active_checks)} active forensic modules."
        )
    elif flagged:
        summary = (
            f"{verdict} (Score: {final_score}/100). {len(flagged)} forensic check(s) flagged anomalies. "
            f"{len(passed)} checks passed cleanly."
        )
    else:
        summary = (
            f"Verified (Score: {final_score}/100). All {len(passed)} active forensic modules confirmed document consistency."
        )

    return {
        "score": final_score,
        "status": status,
        "verdict": verdict,
        "summary": summary,
        "hard_fail": has_hard_fail,
        "flagged_findings": explanations,
        "flagged_count": len(flagged),
        "passed_count": len(passed),
        "total_active_checks": len(active_checks),
        "not_applicable_checks": na_list,
        "unconfigured_modules": unconfigured_modules,
        "dormant_neural_checks": dormant_neural_checks,
        "active_modules_count": len(active_checks),
        "checks": checks,
    }
