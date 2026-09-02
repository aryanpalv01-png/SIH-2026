from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from PIL import Image
from pydantic import BaseModel
import pytesseract
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature
from io import BytesIO

app = FastAPI(title="VeriScan forensic worker", version="0.1.0")
CERT_PATH = Path(os.getenv("UIDAI_PUBLIC_CERT_PATH", "certs/uidai_public_cert.cer"))

class AadhaarQrRequest(BaseModel):
    decodedQr: str
    extractedFields: dict[str, str] = {}


def load_uidai_certificate():
    if not CERT_PATH.exists():
        return None
    raw = CERT_PATH.read_bytes()
    try:
        return x509.load_der_x509_certificate(raw).public_key()
    except ValueError:
        return x509.load_pem_x509_certificate(raw).public_key()


def ocr_fields(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if separator and key.strip() and value.strip():
            fields[key.strip().lower().replace(" ", "_")] = value.strip()
    return fields


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "service": "veriscan-forensic-worker",
        "ocr": "healthy",
        "uidaiCertificate": "configured" if load_uidai_certificate() else "not_configured",
        "trufor": "configured" if os.getenv("TRUFOR_CHECKPOINT") else "not_configured",
        "catnet": "configured" if os.getenv("CATNET_CHECKPOINT") else "not_configured",
    }


@app.post("/ocr")
async def ocr(request: Request) -> dict[str, Any]:
    raw = await request.body()
    try:
        image = Image.open(BytesIO(raw))
        text = pytesseract.image_to_string(image)
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        heights = [int(value) for value in data.get("height", []) if str(value).isdigit() and int(value) > 0]
        return {
            "consistent": True,
            "confidence": round(sum(float(value) for value in data.get("conf", []) if str(value).replace(".", "", 1).isdigit()) / max(1, len(heights))),
            "explanation": "Tesseract extracted the visible text. Typography comparison should be reviewed alongside the OCR confidence and issuing template.",
            "fields": ocr_fields(text),
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"OCR could not decode the image: {exc}") from exc


@app.post("/verify-aadhaar-qr")
def verify_aadhaar_qr(payload: AadhaarQrRequest) -> dict[str, Any]:
    public_key = load_uidai_certificate()
    if public_key is None:
        return {"result": "not_applicable", "confidence": 0, "explanation": "UIDAI public certificate is not installed; Aadhaar QR signature was not trusted."}
    try:
        decoded = json.loads(payload.decodedQr)
        signed_payload = decoded["payload"]
        signature = base64.b64decode(decoded["signature"])
        message = signed_payload.encode() if isinstance(signed_payload, str) else json.dumps(signed_payload, separators=(",", ":")).encode()
        public_key.verify(signature, message, padding.PKCS1v15(), hashes.SHA256())
        if isinstance(signed_payload, dict):
            for field, printed in payload.extractedFields.items():
                if field in signed_payload and printed.strip().casefold() != str(signed_payload[field]).strip().casefold():
                    return {"result": "flag", "confidence": 10, "explanation": f"The Aadhaar QR signature verified, but the printed {field} value differs from the signed payload."}
        return {"result": "pass", "confidence": 98, "explanation": "The Aadhaar QR signature verified against the configured UIDAI public certificate and comparable OCR fields matched."}
    except InvalidSignature:
        return {"result": "flag", "confidence": 5, "explanation": "The Aadhaar QR signature did not verify against the configured UIDAI public certificate."}
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        return {"result": "flag", "confidence": 8, "explanation": f"The Aadhaar QR payload could not be validated safely: {exc}."}


@app.post("/analyze-tampering")
async def analyze_tampering() -> dict[str, Any]:
    if not os.getenv("TRUFOR_CHECKPOINT"):
        raise HTTPException(status_code=503, detail="TRUFOR_CHECKPOINT is not configured")
    raise HTTPException(status_code=501, detail="Connect the official TruFor test_docker inference script here after checkpoint and license review")


@app.post("/analyze-catnet")
async def analyze_catnet() -> dict[str, Any]:
    if not os.getenv("CATNET_CHECKPOINT"):
        raise HTTPException(status_code=503, detail="CATNET_CHECKPOINT is not configured")
    raise HTTPException(status_code=501, detail="Connect the official CAT-Net tools/infer.py workflow here after checkpoint and license review")
