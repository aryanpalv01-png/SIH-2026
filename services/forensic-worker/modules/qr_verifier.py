from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any
from PIL import Image

try:
    from pyzbar.pyzbar import decode as decode_barcodes
except ImportError:
    decode_barcodes = None

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature

CERT_PATH = Path(os.getenv("UIDAI_PUBLIC_CERT_PATH", "certs/uidai_public_cert.cer"))


def load_uidai_certificate():
    if not CERT_PATH.exists():
        return None
    raw = CERT_PATH.read_bytes()
    try:
        return x509.load_der_x509_certificate(raw).public_key()
    except Exception:
        try:
            return x509.load_pem_x509_certificate(raw).public_key()
        except Exception:
            return None


def extract_qr_codes(image: Image.Image) -> list[str]:
    if decode_barcodes is None:
        return []
    try:
        codes = decode_barcodes(image)
        results = []
        for code in codes:
            try:
                results.append(code.data.decode("utf-8"))
            except UnicodeDecodeError:
                results.append(code.data.decode("latin1", errors="replace"))
        return results
    except Exception:
        return []


def verify_qr_signature(
    image: Image.Image,
    document_type: str,
    extracted_fields: dict[str, str] | None = None,
) -> dict[str, Any]:
    doc_type = document_type.lower().strip()
    if doc_type != "aadhaar":
        return {
            "checkName": "qr_signature_verification",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "QR cryptographic signature verification is currently scoped exclusively to Aadhaar documents.",
            "qr_detected": False,
            "is_deterministic": True,
        }

    qr_codes = extract_qr_codes(image)
    if not qr_codes:
        return {
            "checkName": "qr_signature_verification",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "No readable QR code was detected in the document image.",
            "qr_detected": False,
            "is_deterministic": True,
        }

    qr_data = qr_codes[0]
    public_key = load_uidai_certificate()

    # Try parsing structured JSON or signed packet
    parsed_payload: dict[str, Any] | None = None
    signature_b64: str | None = None

    try:
        data_obj = json.loads(qr_data)
        if isinstance(data_obj, dict):
            parsed_payload = data_obj.get("payload", data_obj)
            signature_b64 = data_obj.get("signature")
    except Exception:
        pass

    if public_key is None:
        return {
            "checkName": "qr_signature_verification",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "Aadhaar QR code was decoded, but UIDAI public certificate is not installed at certs/uidai_public_cert.cer.",
            "qr_detected": True,
            "signature_verified": False,
            "is_deterministic": True,
        }

    if not signature_b64:
        return {
            "checkName": "qr_signature_verification",
            "result": "flag",
            "confidence": 30,
            "explanation": "Aadhaar QR code was detected but does not contain a valid digital signature envelope.",
            "qr_detected": True,
            "signature_verified": False,
            "is_deterministic": True,
        }

    try:
        signature = base64.b64decode(signature_b64)
        if isinstance(parsed_payload, dict):
            message = json.dumps(parsed_payload, separators=(",", ":")).encode()
        else:
            message = str(parsed_payload).encode()

        public_key.verify(signature, message, padding.PKCS1v15(), hashes.SHA256())
    except InvalidSignature:
        return {
            "checkName": "qr_signature_verification",
            "result": "flag",
            "confidence": 5,
            "explanation": "The cryptographic signature on the Aadhaar QR code is INVALID against the UIDAI public certificate.",
            "qr_detected": True,
            "signature_verified": False,
            "is_deterministic": True,
        }
    except Exception as exc:
        return {
            "checkName": "qr_signature_verification",
            "result": "flag",
            "confidence": 8,
            "explanation": f"Cryptographic verification error: {exc}",
            "qr_detected": True,
            "signature_verified": False,
            "is_deterministic": True,
        }

    # Cross-reference printed OCR fields with QR payload
    if extracted_fields and isinstance(parsed_payload, dict):
        mismatches = []
        for key, printed_val in extracted_fields.items():
            norm_key = key.lower().replace(" ", "_")
            if norm_key in parsed_payload:
                qr_val = str(parsed_payload[norm_key]).strip().casefold()
                if printed_val.strip().casefold() != qr_val:
                    mismatches.append(f"{key} (Printed: '{printed_val}' vs QR: '{qr_val}')")

        if mismatches:
            return {
                "checkName": "qr_signature_verification",
                "result": "flag",
                "confidence": 10,
                "explanation": f"Aadhaar QR signature is valid, BUT printed fields do not match signed QR data: {', '.join(mismatches)}.",
                "qr_detected": True,
                "signature_verified": True,
                "is_deterministic": True,
            }

    return {
        "checkName": "qr_signature_verification",
        "result": "pass",
        "confidence": 99,
        "explanation": "Aadhaar digital signature verified successfully against UIDAI certificate; payload matches printed fields.",
        "qr_detected": True,
        "signature_verified": True,
        "is_deterministic": True,
    }
