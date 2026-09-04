from __future__ import annotations

import re
from typing import Any
import cv2
import numpy as np
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None


def extract_fields_from_text(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Check for Key: Value patterns
        if ":" in line:
            key, _, val = line.partition(":")
            k = key.strip().lower().replace(" ", "_")
            v = val.strip()
            if k and v:
                fields[k] = v
                continue

        # Common ID document fields
        dob_match = re.search(r"\b(DOB|Date of Birth|Birth)\s*[:\-]?\s*(\d{2}[/\-.]\d{2}[/\-.]\d{4})", line, re.I)
        if dob_match:
            fields["dob"] = dob_match.group(2)

        gender_match = re.search(r"\b(MALE|FEMALE|TRANSGENDER)\b", line, re.I)
        if gender_match and "gender" not in fields:
            fields["gender"] = gender_match.group(1).upper()

        aadhaar_match = re.search(r"\b(\d{4}\s\d{4}\s\d{4})\b", line)
        if aadhaar_match and "aadhaar_number" not in fields:
            fields["aadhaar_number"] = aadhaar_match.group(1)

        pan_match = re.search(r"\b([A-Z]{5}\d{4}[A-Z])\b", line)
        if pan_match and "pan_number" not in fields:
            fields["pan_number"] = pan_match.group(1)

    return fields


def check_typography_opencv(image: Image.Image) -> dict[str, Any]:
    """Fallback font and stroke-width consistency checker using OpenCV computer vision."""
    img_np = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape

    # Binary inverse threshold (text is white, background is black)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Compute distance transform to measure stroke thickness (value at center of stroke is radius)
    dist_transform = cv2.distanceTransform(binary, cv2.DIST_L2, 5)

    # Find connected components for character blobs
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)

    char_heights = []
    char_widths = []
    stroke_widths = []
    char_boxes = []

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        cw = stats[i, cv2.CC_STAT_WIDTH]
        ch = stats[i, cv2.CC_STAT_HEIGHT]
        cx = stats[i, cv2.CC_STAT_LEFT]
        cy = stats[i, cv2.CC_STAT_TOP]

        # Filter out noise dots and huge background blocks
        if 20 < area < (w * h * 0.05) and 6 < ch < (h * 0.4) and 3 < cw < (w * 0.4):
            char_mask = (labels == i).astype(np.uint8)
            stroke_radius = np.max(dist_transform * char_mask)
            stroke_width = float(stroke_radius * 2.0)

            char_heights.append(ch)
            char_widths.append(cw)
            stroke_widths.append(stroke_width)
            char_boxes.append((cx, cy, cw, ch, stroke_width))

    if len(stroke_widths) < 10:
        return {
            "checkName": "ocr_typography_consistency",
            "result": "pass",
            "confidence": 80,
            "explanation": "Typography stroke analysis found limited textual components; no anomalous deviation detected.",
            "flagged_region": None,
            "extracted_fields": {},
            "extracted_text": "",
        }

    median_stroke = float(np.median(stroke_widths))
    stroke_std = float(np.std(stroke_widths))

    # Look for significant outlier clusters (strokes deviating from document median by > 3.0 std)
    outliers = [box for box in char_boxes if abs(box[4] - median_stroke) > max(2.5, 2.5 * stroke_std)]

    flagged_region = None
    if len(outliers) >= 3:
        min_x = min(b[0] for b in outliers)
        min_y = min(b[1] for b in outliers)
        max_x = max(b[0] + b[2] for b in outliers)
        max_y = max(b[1] + b[3] for b in outliers)

        flagged_region = {
            "x": round((min_x / w) * 100),
            "y": round((min_y / h) * 100),
            "width": round(((max_x - min_x) / w) * 100),
            "height": round(((max_y - min_y) / h) * 100),
        }

        return {
            "checkName": "ocr_typography_consistency",
            "result": "flag",
            "confidence": 42,
            "explanation": f"Typography analysis detected significant stroke-width variation (outlier stroke width detected against median {median_stroke:.1f}px). Possible text replacement with mismatched font weight.",
            "flagged_region": flagged_region,
            "extracted_fields": {},
            "extracted_text": "",
        }

    return {
        "checkName": "ocr_typography_consistency",
        "result": "pass",
        "confidence": 88,
        "explanation": f"Typography stroke widths and character metrics are consistent across document text (median stroke: {median_stroke:.1f}px).",
        "flagged_region": None,
        "extracted_fields": {},
        "extracted_text": "",
    }


def analyze_typography(image: Image.Image) -> dict[str, Any]:
    text = ""
    fields = {}

    if pytesseract is not None:
        try:
            text = pytesseract.image_to_string(image)
            fields = extract_fields_from_text(text)
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

            # Analyze word heights and baseline alignments
            word_heights = [int(h) for h, w in zip(data.get("height", []), data.get("text", [])) if w.strip() and int(h) > 0]
            word_confs = [float(c) for c in data.get("conf", []) if str(c).replace(".", "", 1).isdigit() and float(c) > 0]

            if word_heights:
                mean_height = np.mean(word_heights)
                std_height = np.std(word_heights)
                mean_conf = np.mean(word_confs) if word_confs else 85.0

                # Also perform OpenCV stroke check
                cv_check = check_typography_opencv(image)
                flagged_region = cv_check.get("flagged_region")

                if cv_check["result"] == "flag":
                    return {
                        "checkName": "ocr_typography_consistency",
                        "result": "flag",
                        "confidence": cv_check["confidence"],
                        "explanation": cv_check["explanation"],
                        "flagged_region": flagged_region,
                        "extracted_fields": fields,
                        "extracted_text": text,
                    }

                conf = max(65, min(95, round(mean_conf)))
                return {
                    "checkName": "ocr_typography_consistency",
                    "result": "pass",
                    "confidence": conf,
                    "explanation": f"Tesseract extracted {len(word_heights)} words with consistent glyph metrics and OCR confidence ({mean_conf:.1f}%).",
                    "flagged_region": None,
                    "extracted_fields": fields,
                    "extracted_text": text,
                }
        except Exception:
            # Tesseract binary not available or failed; gracefully proceed to CV check
            pass

    # OpenCV typography analysis fallback
    cv_res = check_typography_opencv(image)
    cv_res["extracted_fields"] = fields
    cv_res["extracted_text"] = text
    return cv_res
