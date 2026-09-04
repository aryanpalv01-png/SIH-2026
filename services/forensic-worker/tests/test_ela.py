from __future__ import annotations

from PIL import Image
import pytest
from modules.ela_analyzer import analyze_ela


def test_ela_analysis():
    # Create simple RGB image
    img = Image.new("RGB", (120, 120), color=(180, 180, 180))
    res = analyze_ela(img, quality=90)

    assert res["checkName"] == "ela_compression_analysis"
    assert res["result"] in ("pass", "flag")
    assert isinstance(res["confidence"], int)
    assert "mean_difference" in res
    assert "ela_preview_b64" in res
    assert len(res["ela_preview_b64"]) > 0
