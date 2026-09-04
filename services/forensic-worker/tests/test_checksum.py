from __future__ import annotations

import pytest
from modules.checksum_validator import (
    validate_verhoeff,
    generate_verhoeff_checksum,
    validate_pan_structure,
    validate_checksum,
)


def test_verhoeff_valid_and_invalid():
    # 21934567890 + checksum
    base = "21934567890"
    check_digit = generate_verhoeff_checksum(base)
    valid_aadhaar = f"{base}{check_digit}"

    assert validate_verhoeff(valid_aadhaar) is True

    # Tampering any single digit must fail Verhoeff
    tampered = valid_aadhaar[:-1] + str((check_digit + 1) % 10)
    assert validate_verhoeff(tampered) is False


def test_pan_structure():
    # 4th character must be in [ABCFGHLJPT]
    assert validate_pan_structure("ABCPE1234F") is True  # P = Person/Individual
    assert validate_pan_structure("XYZCA5678K") is True  # C = Company
    assert validate_pan_structure("AAATA9999Z") is True  # T = Trust

    # Invalid 4th characters or structural violations
    assert validate_pan_structure("ABCZE1234F") is False  # Z is not a valid PAN status
    assert validate_pan_structure("12345ABCDE") is False
    assert validate_pan_structure("ABCDE12345") is False
    assert validate_pan_structure("ABCDEF123G") is False


def test_validate_checksum_aadhaar_pass():
    base = "98765432101"
    check_digit = generate_verhoeff_checksum(base)
    valid_aadhaar = f"{base}{check_digit}"

    res = validate_checksum(document_type="aadhaar", candidate_id=valid_aadhaar)
    assert res["result"] == "pass"
    assert res["confidence"] >= 90
    assert res["is_deterministic"] is True


def test_validate_checksum_aadhaar_flag():
    # Invalid checksum
    res = validate_checksum(document_type="aadhaar", candidate_id="123456789012")
    if not validate_verhoeff("123456789012"):
        assert res["result"] == "flag"
        assert res["confidence"] <= 10


def test_validate_checksum_pan_pass_and_flag():
    res_pass = validate_checksum(document_type="pan", candidate_id="ABCPE1234F")
    assert res_pass["result"] == "pass"
    assert res_pass["confidence"] >= 90

    res_flag = validate_checksum(document_type="pan", candidate_id="ABCZE1234F")
    assert res_flag["result"] == "flag"
    assert res_flag["confidence"] <= 10


def test_validate_checksum_text_extraction():
    text = "Government of India\nName: Ramesh Kumar\nUnique ID: 3456 7890 1234\nDOB: 01/01/1990"
    res = validate_checksum(document_type="aadhaar", extracted_text=text)
    # The candidate was found
    assert res["candidate"] is not None
