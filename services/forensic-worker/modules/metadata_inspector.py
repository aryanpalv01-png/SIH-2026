from __future__ import annotations

import re
from io import BytesIO
from typing import Any
import exifread
import pikepdf

EDITING_SOFTWARE_PATTERN = re.compile(
    r"(photoshop|gimp|canva|illustrator|affinity|pixelmator|coreldraw|paint\.net|snapseed)",
    re.IGNORECASE,
)


def inspect_image_exif(raw_bytes: bytes) -> dict[str, Any]:
    try:
        tags = exifread.process_file(BytesIO(raw_bytes), details=False)
    except Exception as exc:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Unable to parse image EXIF metadata: {exc}",
            "software": None,
            "tags_found": 0,
        }

    if not tags:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "No readable EXIF metadata was found. Stripped metadata is inconclusive.",
            "software": None,
            "tags_found": 0,
        }

    combined_metadata = " ".join(f"{k}: {v}" for k, v in tags.items())
    match = EDITING_SOFTWARE_PATTERN.search(combined_metadata)

    if match:
        software = match.group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 20,
            "explanation": f"Image metadata reveals traces of editing software: {software}.",
            "software": software,
            "tags_found": len(tags),
        }

    return {
        "checkName": "metadata_exif_inspection",
        "result": "pass",
        "confidence": 88,
        "explanation": "Image EXIF metadata parsed successfully; no common editing-software signatures found.",
        "software": None,
        "tags_found": len(tags),
    }


def inspect_pdf_metadata(raw_bytes: bytes) -> dict[str, Any]:
    try:
        pdf = pikepdf.open(BytesIO(raw_bytes))
        docinfo = pdf.docinfo
        meta_dict = {str(k): str(v) for k, v in docinfo.items()} if docinfo else {}
        pdf.close()
    except Exception as exc:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Unable to parse PDF metadata: {exc}",
            "software": None,
            "tags_found": 0,
        }

    if not meta_dict:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "PDF metadata dictionary is empty or stripped.",
            "software": None,
            "tags_found": 0,
        }

    combined = " ".join(f"{k}: {v}" for k, v in meta_dict.items())
    match = EDITING_SOFTWARE_PATTERN.search(combined)

    if match:
        software = match.group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 20,
            "explanation": f"PDF metadata indicates document was created or modified with {software}.",
            "software": software,
            "tags_found": len(meta_dict),
        }

    return {
        "checkName": "metadata_exif_inspection",
        "result": "pass",
        "confidence": 88,
        "explanation": "PDF metadata parsed successfully; no unauthorized editing-software markers detected.",
        "software": None,
        "tags_found": len(meta_dict),
    }


def inspect_metadata(raw_bytes: bytes, filename: str = "", mime_type: str = "") -> dict[str, Any]:
    is_pdf = mime_type == "application/pdf" or filename.lower().endswith(".pdf") or raw_bytes.startswith(b"%PDF")
    if is_pdf:
        return inspect_pdf_metadata(raw_bytes)
    return inspect_image_exif(raw_bytes)
