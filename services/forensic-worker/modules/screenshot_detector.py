from __future__ import annotations

from typing import Any
import cv2
import numpy as np
from PIL import Image


def detect_screenshot(
    image: Image.Image,
    variance_threshold: float = 2.5,
    flat_patch_size: int = 16,
) -> dict[str, Any]:
    try:
        img_np = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape

        if h < 32 or w < 32:
            return {
                "checkName": "screenshot_capture_detection",
                "result": "not_applicable",
                "confidence": 0,
                "explanation": "Image dimensions too small to compute sensor noise variance.",
                "noise_variance": 0.0,
            }

        # Compute gradient magnitude with Sobel to identify flat vs textured/edge regions
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)

        # High-pass filter via Laplacian to isolate high-frequency sensor noise
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)

        # Divide into non-overlapping patches
        patch_variances = []
        for y in range(0, h - flat_patch_size, flat_patch_size):
            for x in range(0, w - flat_patch_size, flat_patch_size):
                grad_patch = grad_mag[y : y + flat_patch_size, x : x + flat_patch_size]
                # If the patch is relatively flat (mean gradient is low)
                if np.mean(grad_patch) < 15.0:
                    noise_patch = laplacian[y : y + flat_patch_size, x : x + flat_patch_size]
                    var = np.var(noise_patch)
                    patch_variances.append(var)

        if not patch_variances:
            # Fallback: estimate overall high-frequency variance across image
            overall_var = float(np.var(laplacian))
            patch_variances = [overall_var]

        mean_variance = float(np.mean(patch_variances))
        median_variance = float(np.median(patch_variances))

        # Real scanner/camera sensors have noise variance > threshold (sensor shot/read noise)
        # Screenshots and digitally generated documents have near-zero variance
        is_screenshot = median_variance < variance_threshold

        if is_screenshot:
            confidence = max(20, min(50, round(20 + median_variance * 10)))
            return {
                "checkName": "screenshot_capture_detection",
                "result": "flag",
                "confidence": confidence,
                "explanation": (
                    f"Near-zero sensor noise variance detected (noise variance: {median_variance:.2f} < {variance_threshold}). "
                    "Image exhibits digital rasterization/screenshot characteristics rather than authentic optical camera or scanner capture."
                ),
                "noise_variance": round(median_variance, 2),
                "is_screenshot": True,
            }

        confidence = max(70, min(95, round(70 + min(25.0, median_variance))))
        return {
            "checkName": "screenshot_capture_detection",
            "result": "pass",
            "confidence": confidence,
            "explanation": (
                f"Consistent optical sensor noise variance detected (noise variance: {median_variance:.2f}). "
                "Grain profile matches physical camera or scanner capture."
            ),
            "noise_variance": round(median_variance, 2),
            "is_screenshot": False,
        }

    except Exception as exc:
        return {
            "checkName": "screenshot_capture_detection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Screenshot analysis could not be evaluated: {exc}",
            "noise_variance": 0.0,
        }
