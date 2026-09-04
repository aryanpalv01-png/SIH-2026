from __future__ import annotations

import re
from typing import Any
import cv2
import numpy as np
from PIL import Image

try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr = RapidOCR()
except Exception:
    _rapid_ocr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

SPECIMEN_PATTERN = re.compile(
    r"\b(SPECIMEN|SAMPLE|DUMMY|FAKE|FORGERY|FORGED|VOID|TEST\s+DOCUMENT|NOT\s+VALID|ALTERED\s+COPY|TEMPLATE)\b",
    re.IGNORECASE,
)


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
        if dob_match and "dob" not in fields:
            fields["dob"] = dob_match.group(2)

        gender_match = re.search(r"\b(MALE|FEMALE|TRANSGENDER)\b", line, re.I)
        if gender_match and "gender" not in fields:
            fields["gender"] = gender_match.group(1).upper()

        aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", line)
        if aadhaar_match and "aadhaar_number" not in fields:
            raw_aadhaar = re.sub(r"\D", "", aadhaar_match.group(1))
            if len(raw_aadhaar) == 12:
                fields["aadhaar_number"] = f"{raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}"

        pan_match = re.search(r"\b([A-Z]{5}\d{4}[A-Z])\b", line)
        if pan_match and "pan_number" not in fields:
            fields["pan_number"] = pan_match.group(1)

    # Document-wide regex search if lines missed patterns
    if "aadhaar_number" not in fields:
        m = re.search(r"\b(\d{4}\s\d{4}\s\d{4})\b", text) or re.search(r"\b(\d{12})\b", text.replace(" ", ""))
        if m:
            raw_aadhaar = re.sub(r"\D", "", m.group(0))
            if len(raw_aadhaar) == 12:
                fields["aadhaar_number"] = f"{raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}"

    if "pan_number" not in fields:
        m = re.search(r"\b([A-Z]{5}\d{4}[A-Z])\b", text)
        if m:
            fields["pan_number"] = m.group(1)

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
    fields: dict[str, str] = {}
    flagged_region = None
    w, h = image.size

    # 1. Try RapidOCR (high accuracy ONNX model with full bounding boxes)
    if _rapid_ocr is not None:
        try:
            img_np = np.array(image.convert("RGB"))
            ocr_res, _ = _rapid_ocr(img_np)
            if ocr_res:
                text_lines = []
                confidences = []
                box_heights = []

                for item in ocr_res:
                    pts = item[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    line_text = str(item[1]).strip()
                    conf = float(item[2])
                    text_lines.append(line_text)
                    confidences.append(conf)

                    ys = [p[1] for p in pts]
                    xs = [p[0] for p in pts]
                    box_h = max(ys) - min(ys)
                    box_w = max(xs) - min(xs)
                    box_heights.append((min(xs), min(ys), box_w, box_h, line_text))

                text = "\n".join(text_lines)
                fields = extract_fields_from_text(text)

                # Check for explicit specimen / fake markers in extracted text
                specimen_match = SPECIMEN_PATTERN.search(text)
                if specimen_match:
                    matched_word = specimen_match.group(0).upper()
                    specimen_box = next((b for b in box_heights if matched_word.lower() in b[4].lower()), None)
                    if specimen_box:
                        flagged_region = {
                            "x": round((specimen_box[0] / w) * 100),
                            "y": round((specimen_box[1] / h) * 100),
                            "width": round((specimen_box[2] / w) * 100),
                            "height": round((specimen_box[3] / h) * 100),
                        }
                    return {
                        "checkName": "ocr_typography_consistency",
                        "result": "flag",
                        "confidence": 6,
                        "explanation": f"Document text contains explicit specimen/forgery marker ('{matched_word}'). The file cannot be authenticated.",
                        "flagged_region": flagged_region,
                        "extracted_fields": fields,
                        "extracted_text": text,
                    }

                # Check for font height / baseline anomalies in digits or numbers
                if len(box_heights) >= 4:
                    mean_h = np.mean([b[3] for b in box_heights])
                    std_h = np.std([b[3] for b in box_heights])

                    anomalies = [b for b in box_heights if abs(b[3] - mean_h) > max(4.0, 2.8 * std_h) and re.search(r"\d", b[4])]
                    if anomalies:
                        ab = anomalies[0]
                        flagged_region = {
                            "x": round((ab[0] / w) * 100),
                            "y": round((ab[1] / h) * 100),
                            "width": round((ab[2] / w) * 100),
                            "height": round((ab[3] / h) * 100),
                        }
                        return {
                            "checkName": "ocr_typography_consistency",
                            "result": "flag",
                            "confidence": 36,
                            "explanation": f"Detected font height discrepancy ({ab[3]:.1f}px vs average {mean_h:.1f}px) in numeric text field '{ab[4]}'. Possible spliced or edited typography.",
                            "flagged_region": flagged_region,
                            "extracted_fields": fields,
                            "extracted_text": text,
                        }

                mean_conf = float(np.mean(confidences)) if confidences else 0.85
                cv_res = check_typography_opencv(image)
                if cv_res["result"] == "flag":
                    cv_res["extracted_fields"] = fields
                    cv_res["extracted_text"] = text
                    return cv_res

                return {
                    "checkName": "ocr_typography_consistency",
                    "result": "pass",
                    "confidence": max(75, min(97, round(mean_conf * 100))),
                    "explanation": f"OCR extracted {len(text_lines)} text regions with consistent font baseline, stroke geometry, and high character confidence ({mean_conf * 100:.1f}%).",
                    "flagged_region": None,
                    "extracted_fields": fields,
                    "extracted_text": text,
                }
        except Exception:
            pass

    # 2. Try pytesseract if available
    if pytesseract is not None:
        try:
            text = pytesseract.image_to_string(image)
            fields = extract_fields_from_text(text)
        except Exception:
            pass

    # 3. Fallback to OpenCV typography analysis
    cv_res = check_typography_opencv(image)
    cv_res["extracted_fields"] = fields
    cv_res["extracted_text"] = text
    return cv_res
