from __future__ import annotations

import base64
from io import BytesIO
from typing import Any
import numpy as np
from PIL import Image, ImageChops, ImageEnhance


def analyze_ela(
    image: Image.Image,
    quality: int = 90,
    scale: int = 15,
) -> dict[str, Any]:
    try:
        rgb_image = image.convert("RGB")
        width, height = rgb_image.size

        # Save to buffer at fixed quality
        buffer = BytesIO()
        rgb_image.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)
        recompressed = Image.open(buffer).convert("RGB")

        # Pixel-wise difference
        diff = ImageChops.difference(rgb_image, recompressed)
        diff_np = np.array(diff, dtype=np.float32)

        # Mean and standard deviation across channels
        pixel_diffs = np.mean(diff_np, axis=2)  # shape (height, width)
        mean_diff = float(np.mean(pixel_diffs))
        std_diff = float(np.std(pixel_diffs))

        # Check for localized anomalies by dividing image into 8x8 grid
        grid_rows, grid_cols = 8, 8
        cell_h = max(1, height // grid_rows)
        cell_w = max(1, width // grid_cols)

        cell_means = []
        max_cell_val = 0.0
        max_cell_coords = None

        for r in range(grid_rows):
            for c in range(grid_cols):
                y1, y2 = r * cell_h, min(height, (r + 1) * cell_h)
                x1, x2 = c * cell_w, min(width, (c + 1) * cell_w)
                cell = pixel_diffs[y1:y2, x1:x2]
                cell_mean = float(np.mean(cell))
                cell_means.append(cell_mean)
                if cell_mean > max_cell_val:
                    max_cell_val = cell_mean
                    max_cell_coords = (x1, y1, x2 - x1, y2 - y1)

        overall_grid_mean = np.mean(cell_means)
        overall_grid_std = np.std(cell_means)

        # If a region is significantly higher than the average (more than 2.5 std devs)
        flagged_region = None
        is_anomalous = False
        if overall_grid_std > 1.5 and max_cell_coords and (max_cell_val - overall_grid_mean) > 2.2 * overall_grid_std:
            is_anomalous = True
            fx, fy, fw, fh = max_cell_coords
            flagged_region = {
                "x": round((fx / width) * 100),
                "y": round((fy / height) * 100),
                "width": round((fw / width) * 100),
                "height": round((fh / height) * 100),
            }

        # Generate enhanced ELA preview heatmap as base64 jpeg
        extrema = diff.getextrema()
        max_diff = max(ex[1] for ex in extrema)
        if max_diff == 0:
            max_diff = 1
        scale_factor = min(scale, int(255.0 / max_diff))
        enhanced = ImageEnhance.Brightness(diff).enhance(scale_factor)
        heatmap_buf = BytesIO()
        enhanced.save(heatmap_buf, format="JPEG", quality=85)
        heatmap_b64 = base64.b64encode(heatmap_buf.getvalue()).decode("ascii")

        # Confidence calculation: normal images have consistent low-medium mean difference
        # Inconsistent recompression drops confidence
        if is_anomalous:
            confidence = max(10, min(50, round(50 - (max_cell_val - overall_grid_mean) * 4)))
            result = "flag"
            explanation = (
                f"Error Level Analysis detected localized compression discrepancies (mean error {mean_diff:.2f}, "
                f"peak regional variance {max_cell_val:.2f}). Possible spliced text or inserted image region."
            )
        else:
            confidence = max(50, min(95, round(95 - mean_diff * 3)))
            result = "pass" if confidence >= 65 else "flag"
            explanation = (
                f"Compression error levels are uniform across the document surface (mean error {mean_diff:.2f})."
                if result == "pass"
                else f"Elevated overall compression error detected across the entire image (mean error {mean_diff:.2f})."
            )

        return {
            "checkName": "ela_compression_analysis",
            "result": result,
            "confidence": confidence,
            "explanation": explanation,
            "mean_difference": round(mean_diff, 2),
            "flagged_region": flagged_region,
            "ela_preview_b64": heatmap_b64,
        }

    except Exception as exc:
        return {
            "checkName": "ela_compression_analysis",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"ELA analysis could not be performed: {exc}",
            "mean_difference": 0.0,
            "flagged_region": None,
        }
