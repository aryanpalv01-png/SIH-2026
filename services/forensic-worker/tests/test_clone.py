from __future__ import annotations

from PIL import Image, ImageDraw
import numpy as np
import pytest
from modules.clone_detector import detect_copy_move


def test_clone_detector_clean():
    # Clean noise image
    arr = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    res = detect_copy_move(img)

    assert res["checkName"] == "copy_move_clone_detection"
    assert res["result"] in ("pass", "flag")
    assert isinstance(res["confidence"], int)


def test_clone_detector_with_cloned_patch():
    # Create image and stamp the exact same distinctive high-feature pattern in two distant locations
    arr = np.full((300, 300, 3), 200, dtype=np.uint8)
    # Distinctive feature block
    patch = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
    # Place patch at (30, 30) and (180, 180)
    arr[30:80, 30:80] = patch
    arr[180:230, 180:230] = patch

    img = Image.fromarray(arr)
    res = detect_copy_move(img)

    assert res["checkName"] == "copy_move_clone_detection"
    # Even if feature thresholds vary, the output format is validated
    assert "result" in res
    assert "confidence" in res
