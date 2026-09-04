from __future__ import annotations

from PIL import Image
import numpy as np
import pytest
from modules.screenshot_detector import detect_screenshot


def test_screenshot_flag_on_flat_canvas():
    # Pure flat synthetic color (digital canvas / screenshot)
    img = Image.new("RGB", (200, 200), color=(245, 245, 245))
    res = detect_screenshot(img)

    assert res["checkName"] == "screenshot_capture_detection"
    assert res["result"] == "flag"
    assert res["is_screenshot"] is True
    assert res["noise_variance"] < 2.5


def test_screenshot_pass_on_noisy_sensor():
    # Optical camera sensor simulation: base color + Gaussian noise
    base = np.full((200, 200), 128, dtype=np.float32)
    noise = np.random.normal(0, 10.0, (200, 200))
    noisy = np.clip(base + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.stack([noisy]*3, axis=-1))

    res = detect_screenshot(img)
    assert res["checkName"] == "screenshot_capture_detection"
    assert res["result"] == "pass"
    assert res["is_screenshot"] is False
    assert res["noise_variance"] >= 2.5
