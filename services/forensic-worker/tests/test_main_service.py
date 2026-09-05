from __future__ import annotations

import base64
import hashlib
import hmac
from io import BytesIO
import json
import os
import cv2
from fastapi.testclient import TestClient
import numpy as np
from PIL import Image
import pytest

from main import (
    app,
    calculate_noise_variance,
    check_demographic_sanity,
    detect_dense_text_blocks_opencv,
    detect_faces_opencv,
    extract_name_entity,
    identify_document_type,
    load_image_bytes_in_memory,
    preprocess_image_for_ocr,
    validate_checksum_fault_tolerant,
    validate_verhoeff,
)

client = TestClient(app)


def create_digital_image_bytes() -> bytes:
    """Simulates a genuine soft-copy (clean screenshot/vector render) with near-zero sensor noise."""
    img = np.full((300, 400, 3), 245, dtype=np.uint8)
    cv2.putText(img, "Government of India", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Aadhaar Card", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "Name: Rahul Sharma", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "DOB: 15/08/1992", (30, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "2193 4567 8905", (30, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    _, encoded = cv2.imencode(".png", img)
    return encoded.tobytes()


def create_camera_photo_bytes() -> bytes:
    """Simulates a physical photo/scan with optical sensor noise and grain."""
    img = np.full((300, 400, 3), 200, dtype=np.uint8)
    # Add Gaussian sensor noise
    noise = np.random.normal(0, 12, img.shape).astype(np.float32)
    noisy_img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    cv2.putText(noisy_img, "Government of India", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    _, encoded = cv2.imencode(".jpg", noisy_img)
    return encoded.tobytes()


# =====================================================================
# RULE 1 TESTS: Physical vs. Digital Routing
# =====================================================================

def test_noise_variance_digital_softcopy():
    raw_bytes = create_digital_image_bytes()
    img_bgr = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
    variance, is_digital = calculate_noise_variance(img_bgr)
    assert is_digital is True
    assert variance < 2.5


def test_noise_variance_camera_photo():
    raw_bytes = create_camera_photo_bytes()
    img_bgr = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
    variance, is_digital = calculate_noise_variance(img_bgr)
    assert is_digital is False
    assert variance >= 2.5


# =====================================================================
# RULE 2 TESTS: Checksum OCR Resilience (Pre-processing & Fault Tolerance)
# =====================================================================

def test_preprocess_image_for_ocr():
    raw_bytes = create_digital_image_bytes()
    img_bgr = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
    thresh = preprocess_image_for_ocr(img_bgr)
    assert thresh is not None
    assert len(thresh.shape) == 2  # Grayscale binary
    assert thresh.shape == img_bgr.shape[:2]


def test_verhoeff_validation():
    # Known valid Aadhaar (passes Verhoeff D5)
    valid_aadhaar = "219345678905"
    assert validate_verhoeff(valid_aadhaar) is True
    # Mutated digit fails
    invalid_aadhaar = "219345678904"
    assert validate_verhoeff(invalid_aadhaar) is False


def test_aadhaar_ocr_fault_tolerance():
    # OCR misread '0' as 'O'
    ocr_text_with_o = "Government of India\nUnique Identification Authority\n2193 4567 89O5"
    is_valid, candidate = validate_checksum_fault_tolerant("aadhaar", ocr_text_with_o)
    assert is_valid is True
    assert candidate == "219345678905"

    # OCR misread '1' as 'I'
    ocr_text_with_i = "UIDAI\n2I93 4567 8905"
    is_valid_i, cand_i = validate_checksum_fault_tolerant("aadhaar", ocr_text_with_i)
    assert is_valid_i is True


def test_pan_ocr_fault_tolerance():
    # Standard valid PAN
    valid_text = "INCOME TAX DEPARTMENT\nPERMANENT ACCOUNT NUMBER\nABCPE1234F"
    is_valid, cand = validate_checksum_fault_tolerant("pan", valid_text)
    assert is_valid is True

    # OCR confused 'O' for '0' in numeric field: ABCPE123OF -> ABCPE1230F
    ocr_pan_misread = "INCOME TAX DEPARTMENT\nABCPE123OF"
    is_valid_norm, cand_norm = validate_checksum_fault_tolerant("pan", ocr_pan_misread)
    assert is_valid_norm is True
    assert cand_norm == "ABCPE1230F"

    # Structural violation (4th char 'Z' is invalid)
    invalid_pan_text = "INCOME TAX DEPARTMENT\nABCZE1234F"
    is_valid_inv, _ = validate_checksum_fault_tolerant("pan", invalid_pan_text)
    assert is_valid_inv is False


def test_garbled_ocr_returns_none_not_applicable():
    """OCR text too blurry or garbled must return None (null) rather than False."""
    garbled_text = "lorem ipsum dolor sit amet blurred noise without identifier"
    is_valid_aadhaar, _ = validate_checksum_fault_tolerant("aadhaar", garbled_text)
    assert is_valid_aadhaar is None  # Does not penalize blurry document

    is_valid_pan, _ = validate_checksum_fault_tolerant("pan", garbled_text)
    assert is_valid_pan is None


# =====================================================================
# RULE 3 TESTS: Semantic Consistency (Demographic Sanity Check)
# =====================================================================

def test_semantic_mismatch_donald_trump_aadhaar():
    text = (
        "GOVERNMENT OF INDIA\n"
        "Name: Donald Trump\n"
        "DOB: 14/06/1946\n"
        "Gender: MALE\n"
        "2193 4567 8904"
    )
    name = extract_name_entity(text, "aadhaar")
    assert name == "Donald Trump"

    mismatch, explanation = check_demographic_sanity(name, "aadhaar", text)
    assert mismatch is True
    assert "Donald Trump" in explanation


def test_semantic_mismatch_john_doe_pan():
    text = (
        "INCOME TAX DEPARTMENT\n"
        "Name\n"
        "John Doe\n"
        "Father's Name\n"
        "Richard Doe\n"
        "ABCPE1234F"
    )
    name = extract_name_entity(text, "pan")
    assert name == "John Doe"

    mismatch, _ = check_demographic_sanity(name, "pan", text)
    assert mismatch is True


def test_genuine_indian_name_passes():
    text = (
        "GOVERNMENT OF INDIA\n"
        "Name: Rahul Sharma\n"
        "DOB: 01/01/1990\n"
        "2193 4567 8904"
    )
    name = extract_name_entity(text, "aadhaar")
    assert name == "Rahul Sharma"

    mismatch, _ = check_demographic_sanity(name, "aadhaar", text)
    assert mismatch is False


def test_indian_christian_name_passes():
    # Genuine Indian Christian names must NOT throw false positive
    mismatch, _ = check_demographic_sanity("George Fernandes", "aadhaar", "GOVERNMENT OF INDIA")
    assert mismatch is False


# =====================================================================
# DOCUMENT TYPE IDENTIFICATION TESTS
# =====================================================================

def test_identify_document_types():
    assert identify_document_type("REPUBLIC OF INDIA PASSPORT GIVEN NAMES") == "passport"
    assert identify_document_type("GOVERNMENT OF INDIA MERA AADHAAR 2193 4567 8904") == "aadhaar"
    assert identify_document_type("INCOME TAX DEPARTMENT PERMANENT ACCOUNT NUMBER ABCPE1234F") == "pan"
    assert identify_document_type("DRIVING LICENCE UNION OF INDIA TRANSPORT DEPARTMENT") == "driving_license"
    assert identify_document_type("ELECTION COMMISSION OF INDIA ELECTORAL PHOTO IDENTITY") == "voter_id"
    assert identify_document_type("Utility Bill Electric Company Payment") == "other"


# =====================================================================
# API ENDPOINT TESTS
# =====================================================================

def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "opencv" in data


def test_analyze_endpoint_with_data_uri():
    raw_bytes = create_digital_image_bytes()
    b64_str = f"data:image/png;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"

    resp = client.post("/analyze", json={"file_url": b64_str})
    assert resp.status_code == 200
    data = resp.json()

    # Verify all 4 requirements are present in the response
    assert "is_digital_copy" in data
    assert isinstance(data["is_digital_copy"], bool)
    assert data["is_digital_copy"] is True

    assert "checksum_valid" in data
    assert "semantic_mismatch" in data
    assert "doc_type" in data
    assert data["doc_type"] == "aadhaar"
    assert data["semantic_mismatch"] is False


def test_analyze_upload_endpoint():
    raw_bytes = create_digital_image_bytes()
    resp = client.post(
        "/analyze-upload",
        files={"file": ("doc.png", raw_bytes, "image/png")},
        data={"documentType": "aadhaar"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["doc_type"] == "aadhaar"
    assert data["is_digital_copy"] is True


# =====================================================================
# SECURITY UPGRADES TESTS: Zero-Disk, HMAC Auth, PII Redaction
# =====================================================================

def test_zero_disk_data_uri_loader():
    """Verify that image bytes are loaded strictly into RAM with zero disk writes."""
    raw_bytes = create_digital_image_bytes()
    b64_str = f"data:image/png;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"
    loaded = load_image_bytes_in_memory(b64_str)
    assert isinstance(loaded, bytes)
    assert len(loaded) == len(raw_bytes)
    assert loaded == raw_bytes


def test_hmac_network_isolation():
    """Verify HMAC SHA-256 dependency blocks unauthorized requests and accepts authenticated signatures."""
    test_key = "veriscan-super-secret-test-key"
    old_key = os.environ.get("VERISCAN_SECRET_KEY")
    os.environ["VERISCAN_SECRET_KEY"] = test_key

    try:
        raw_bytes = create_digital_image_bytes()
        b64_str = f"data:image/png;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"
        payload_bytes = json.dumps({"file_url": b64_str}).encode("utf-8")

        # 1. Reject without header (401)
        resp_no_header = client.post(
            "/analyze",
            content=payload_bytes,
            headers={"Content-Type": "application/json"},
        )
        assert resp_no_header.status_code == 401
        assert "Missing" in resp_no_header.json()["detail"]

        # 2. Reject with invalid signature (403)
        resp_bad_sig = client.post(
            "/analyze",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-VeriScan-Signature": "invalid_hex_signature_deadbeef",
            },
        )
        assert resp_bad_sig.status_code == 403
        assert "Invalid HMAC signature" in resp_bad_sig.json()["detail"]

        # 3. Accept with valid HMAC-SHA256 signature
        valid_sig = hmac.new(test_key.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        resp_valid = client.post(
            "/analyze",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-VeriScan-Signature": valid_sig,
            },
        )
        assert resp_valid.status_code == 200
        assert resp_valid.json()["doc_type"] == "aadhaar"

        # 4. Accept with sha256= prefix
        resp_prefix = client.post(
            "/analyze",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-VeriScan-Signature": f"sha256={valid_sig}",
            },
        )
        assert resp_prefix.status_code == 200
    finally:
        if old_key is not None:
            os.environ["VERISCAN_SECRET_KEY"] = old_key
        else:
            os.environ.pop("VERISCAN_SECRET_KEY", None)


def test_redact_pii_solid_black_boxes():
    """Verify POST /redact-pii masks text and faces with solid black boxes, returning base64."""
    raw_bytes = create_digital_image_bytes()
    b64_str = f"data:image/png;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"

    resp = client.post("/redact-pii", json={"image_url": b64_str})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "redacted_image_base64" in data
    assert data["redacted_image_base64"].startswith("data:image/png;base64,")
    assert data["text_blocks_detected"] > 0
    assert data["total_redactions"] > 0

    # Decode redacted image and verify solid black rectangles (BGR: 0, 0, 0)
    _, _, b64_content = data["redacted_image_base64"].partition(",")
    redacted_bytes = base64.b64decode(b64_content)
    redacted_img = cv2.imdecode(np.frombuffer(redacted_bytes, np.uint8), cv2.IMREAD_COLOR)
    assert redacted_img is not None
    # Verify presence of pitch-black pixels [0, 0, 0]
    black_pixels = np.all(redacted_img == [0, 0, 0], axis=-1)
    assert np.any(black_pixels), "Expected black mask rectangles covering text/faces"


def test_redact_pii_empty_payload_rejected():
    resp = client.post("/redact-pii", json={})
    assert resp.status_code == 400

