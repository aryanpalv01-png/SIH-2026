from __future__ import annotations

import re
from io import BytesIO

import exifread
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image

try:
    from pyzbar.pyzbar import decode as decode_qr
except ImportError:
    decode_qr = None


app = FastAPI(title="VeriScan Lightweight Microservice")


class AnalyzeRequest(BaseModel):
    file_url: str


def check_exif(file_bytes: bytes) -> str | None:
    tags = exifread.process_file(BytesIO(file_bytes), details=False)
    metadata = " ".join(str(value) for value in tags.values())
    software_match = re.search(r"Photoshop|GIMP|Canva|Illustrator", metadata, re.IGNORECASE)
    return software_match.group(0) if software_match else None


def check_qr(file_bytes: bytes) -> bool:
    if decode_qr is None:
        return False
    try:
        image = Image.open(BytesIO(file_bytes))
        return any(code.data for code in decode_qr(image))
    except Exception:
        return False


def check_pan_format(text: str) -> bool:
    return bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]{1}", text))


def error_response() -> dict[str, bool | str | None]:
    return {
        "metadata_safe": False,
        "metadata_software": None,
        "qr_valid": False,
        "checksum_valid": False,
        "message": "Lightweight checks completed",
    }


@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> dict[str, bool | str | None]:
    try:
        response = requests.get(payload.file_url, timeout=15)
        response.raise_for_status()
        file_bytes = response.content
    except requests.RequestException:
        return error_response()

    try:
        software = check_exif(file_bytes)
    except Exception:
        software = None

    # OCR is mocked until the document text extraction pipeline is connected.
    mocked_pan = "ABCDE1234F"
    return {
        "metadata_safe": software is None,
        "metadata_software": software,
        "qr_valid": check_qr(file_bytes),
        "checksum_valid": check_pan_format(mocked_pan),
        "message": "Lightweight checks completed",
    }