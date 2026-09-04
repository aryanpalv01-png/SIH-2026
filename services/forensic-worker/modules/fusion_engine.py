from __future__ import annotations

from typing import Any

CHECK_WEIGHTS: dict[str, float] = {
    "checksum_validation": 3.0,
    "qr_signature_verification": 3.0,
    "trufor_inference": 2.0,
    "catnet_inference": 2.0,
    "ela_compression_analysis": 1.5,
    "copy_move_clone_detection": 1.5,
    "ai_generated_image_detector": 1.2,
    "ocr_typography_consistency": 1.2,
    "metadata_exif_inspection": 1.0,
    "screenshot_capture_detection": 1.0,
}

DETERMINISTIC_CHECKS = {"checksum_validation", "qr_signature_verification"}


def fuse_scores(checks: list[dict[str, Any]]) -> dict[str, Any]:
    active_checks = [c for c in checks if c.get("result") != "not_applicable"]

    if not active_checks:
        return {
            "score": 50,
            "status": "needs_review",
            "verdict": "Needs Review",
            "summary": "No active forensic checks could be applied to this document.",
            "hard_fail": False,
            "flagged_checks": [],
            "passed_checks": [],
            "not_applicable_checks": [c.get("checkName") for c in checks if c.get("result") == "not_applicable"],
            "checks": checks,
        }

    # Check for deterministic failures (Aadhaar/PAN checksum, QR signature)
    hard_failed_checks = [
        c for c in active_checks
        if c.get("checkName") in DETERMINISTIC_CHECKS and c.get("result") == "flag"
    ]
    has_hard_fail = len(hard_failed_checks) > 0

    total_weight = 0.0
    weighted_sum = 0.0

    for c in active_checks:
        name = c.get("checkName", "")
        weight = CHECK_WEIGHTS.get(name, 1.0)
        conf = float(c.get("confidence", 50))
        total_weight += weight
        weighted_sum += conf * weight

    raw_score = round(weighted_sum / max(0.1, total_weight))

    # Deterministic failure override:
    # A failure in checksum or QR signature MUST push verdict strongly to Likely Forged (<40)
    if has_hard_fail:
        final_score = min(raw_score, 29)
    else:
        final_score = max(0, min(100, raw_score))

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
            f"Likely Forged (Score: {final_score}/100). Critical failure in deterministic mathematical verification "
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
        "checks": checks,
    }
