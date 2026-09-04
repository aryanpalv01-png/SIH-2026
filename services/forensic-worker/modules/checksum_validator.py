from __future__ import annotations

import re
from typing import Any

# Verhoeff algorithm tables
MULTIPLICATION = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)

PERMUTATION = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)

INVERSE = (0, 4, 3, 2, 1, 5, 6, 7, 8, 9)

# Standard PAN regex: 5 letters (4th is entity type [ABCFGHLJPT]), 4 digits, 1 letter
PAN_REGEX = re.compile(r"^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$")


def validate_verhoeff(number_str: str) -> bool:
    digits = [int(d) for d in re.sub(r"\D", "", number_str)]
    if not digits:
        return False
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        checksum = MULTIPLICATION[checksum][PERMUTATION[i % 8][digit]]
    return checksum == 0


def generate_verhoeff_checksum(number_str: str) -> int:
    digits = [int(d) for d in re.sub(r"\D", "", number_str)]
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        checksum = MULTIPLICATION[checksum][PERMUTATION[(i + 1) % 8][digit]]
    return INVERSE[checksum]


def validate_pan_structure(pan_str: str) -> bool:
    clean = pan_str.strip().upper()
    return bool(PAN_REGEX.fullmatch(clean))


def validate_checksum(
    document_type: str,
    candidate_id: str | None = None,
    extracted_text: str = "",
) -> dict[str, Any]:
    doc_type = document_type.lower().strip()
    text_upper = extracted_text.upper()

    # Auto-detect document type if "other" or unspecified
    if doc_type in ("other", "", "unknown"):
        if any(w in text_upper for w in ["AADHAAR", "UIDAI", "UNIQUE IDENTIFICATION", "MERA AADHAAR"]):
            doc_type = "aadhaar"
        elif any(w in text_upper for w in ["INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER"]):
            doc_type = "pan"
        elif re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", extracted_text):
            doc_type = "aadhaar"
        elif re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", text_upper):
            doc_type = "pan"

    if doc_type == "aadhaar":
        candidate = candidate_id
        if not candidate and extracted_text:
            matches = re.findall(r"\b\d{4}\s?\d{4}\s?\d{4}\b", extracted_text)
            if matches:
                candidate = re.sub(r"\s", "", matches[0])
            else:
                m = re.search(r"\b\d{12}\b", extracted_text.replace(" ", ""))
                if m:
                    candidate = m.group(0)

        if not candidate:
            return {
                "checkName": "checksum_validation",
                "result": "not_applicable",
                "confidence": 0,
                "explanation": "No 12-digit Aadhaar number could be identified in the text for checksum verification.",
                "candidate": None,
                "is_deterministic": True,
            }

        candidate_clean = re.sub(r"\D", "", candidate)
        if len(candidate_clean) != 12:
            return {
                "checkName": "checksum_validation",
                "result": "flag",
                "confidence": 5,
                "explanation": f"Extracted Aadhaar number has invalid length ({len(candidate_clean)} digits instead of 12).",
                "candidate": candidate_clean,
                "is_deterministic": True,
            }

        is_valid = validate_verhoeff(candidate_clean)
        return {
            "checkName": "checksum_validation",
            "result": "pass" if is_valid else "flag",
            "confidence": 99 if is_valid else 5,
            "explanation": (
                f"The 12-digit Aadhaar identifier passes the official Verhoeff dihedral group D5 checksum."
                if is_valid
                else f"The extracted 12-digit identifier fails the mathematical Verhoeff checksum algorithm. High forgery risk: UIDAI issuance rules require valid checksum congruence."
            ),
            "candidate": candidate_clean[:4] + "XXXX" + candidate_clean[-4:],
            "is_deterministic": True,
        }

    elif doc_type == "pan":
        candidate = candidate_id
        if not candidate and extracted_text:
            matches = re.findall(r"\b[A-Z]{5}\d{4}[A-Z]\b", text_upper)
            if matches:
                candidate = matches[0]

        if not candidate:
            return {
                "checkName": "checksum_validation",
                "result": "not_applicable",
                "confidence": 0,
                "explanation": "No 10-character PAN string could be identified in the text for structural validation.",
                "candidate": None,
                "is_deterministic": True,
            }

        clean_pan = candidate.strip().upper()
        is_valid = validate_pan_structure(clean_pan)
        return {
            "checkName": "checksum_validation",
            "result": "pass" if is_valid else "flag",
            "confidence": 95 if is_valid else 8,
            "explanation": (
                f"The PAN identifier '{clean_pan}' conforms to the required Income Tax Department issuing format and 4th-character entity code."
                if is_valid
                else f"The PAN identifier '{clean_pan}' violates official format rules: the 4th character must be one of [A,B,C,F,G,H,L,J,P,T]."
            ),
            "candidate": clean_pan,
            "is_deterministic": True,
        }

    # If document type is generic but has numbers that could be tested
    if candidate_id:
        digits = re.sub(r"\D", "", candidate_id)
        if len(digits) == 12:
            is_valid = validate_verhoeff(digits)
            return {
                "checkName": "checksum_validation",
                "result": "pass" if is_valid else "flag",
                "confidence": 94 if is_valid else 6,
                "explanation": (
                    "Extracted 12-digit identifier passes the Verhoeff checksum algorithm."
                    if is_valid
                    else "Extracted 12-digit identifier FAILS the mathematical Verhoeff checksum algorithm."
                ),
                "candidate": digits[:4] + "XXXX" + digits[-4:],
                "is_deterministic": True,
            }

    return {
        "checkName": "checksum_validation",
        "result": "not_applicable",
        "confidence": 0,
        "explanation": f"Checksum validation is not applicable to document type '{document_type}'.",
        "candidate": None,
        "is_deterministic": True,
    }
