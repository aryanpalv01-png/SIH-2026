from __future__ import annotations

import pytest
from modules.fusion_engine import fuse_scores


def test_fusion_verified_high_score():
    checks = [
        {"checkName": "checksum_validation", "result": "pass", "confidence": 99},
        {"checkName": "qr_signature_verification", "result": "pass", "confidence": 98},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 90},
        {"checkName": "copy_move_clone_detection", "result": "pass", "confidence": 88},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 88},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "verified"
    assert report["verdict"] == "Verified"
    assert report["score"] > 80
    assert report["hard_fail"] is False


def test_fusion_hard_fail_override_on_checksum_flag():
    # Even if all image-level AI models return 100% pass, a checksum failure is mathematical proof of invalidity!
    checks = [
        {"checkName": "checksum_validation", "result": "flag", "confidence": 5, "explanation": "Invalid Verhoeff digit"},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 95},
        {"checkName": "copy_move_clone_detection", "result": "pass", "confidence": 95},
        {"checkName": "trufor_inference", "result": "pass", "confidence": 95},
        {"checkName": "catnet_inference", "result": "pass", "confidence": 95},
    ]

    report = fuse_scores(checks)
    # MUST be likely_forged and score strictly < 40!
    assert report["hard_fail"] is True
    assert report["status"] == "likely_forged"
    assert report["verdict"] == "Likely Forged"
    assert report["score"] < 40


def test_fusion_hard_fail_override_on_qr_flag():
    checks = [
        {"checkName": "qr_signature_verification", "result": "flag", "confidence": 5, "explanation": "Invalid digital signature"},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 90},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 85},
    ]

    report = fuse_scores(checks)
    assert report["hard_fail"] is True
    assert report["status"] == "likely_forged"
    assert report["score"] < 40


def test_fusion_needs_review_threshold():
    # Mixed signals: some pass, some moderate flags, without hard fail
    checks = [
        {"checkName": "metadata_exif_inspection", "result": "flag", "confidence": 35, "explanation": "Derivative file"},
        {"checkName": "ela_compression_analysis", "result": "flag", "confidence": 45, "explanation": "Slight recompression"},
        {"checkName": "screenshot_capture_detection", "result": "pass", "confidence": 80},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "needs_review"
    assert 40 <= report["score"] <= 80
    assert report["hard_fail"] is False


def test_fusion_handles_not_applicable():
    checks = [
        {"checkName": "checksum_validation", "result": "not_applicable", "confidence": 0},
        {"checkName": "qr_signature_verification", "result": "not_applicable", "confidence": 0},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 85},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 85},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "verified"
    assert report["score"] > 80
    assert "checksum_validation" in report["not_applicable_checks"]
