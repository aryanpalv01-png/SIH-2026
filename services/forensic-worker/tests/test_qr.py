from __future__ import annotations

from PIL import Image
import pytest
from modules.qr_verifier import verify_qr_signature


def test_qr_not_applicable_for_non_aadhaar():
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    res = verify_qr_signature(img, document_type="pan")
    assert res["checkName"] == "qr_signature_verification"
    assert res["result"] == "not_applicable"

    res_passport = verify_qr_signature(img, document_type="passport")
    assert res_passport["result"] == "not_applicable"


def test_qr_no_code_detected():
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    res = verify_qr_signature(img, document_type="aadhaar")
    assert res["result"] == "not_applicable"
    assert res["qr_detected"] is False
