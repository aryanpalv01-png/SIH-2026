from __future__ import annotations

from io import BytesIO
from PIL import Image
import pytest
from modules.metadata_inspector import inspect_metadata


def create_test_image(software_tag: str | None = None) -> bytes:
    img = Image.new("RGB", (100, 100), color=(240, 240, 240))
    buffer = BytesIO()
    exif = img.getexif()
    if software_tag:
        # EXIF Software tag id is 305
        exif[305] = software_tag
    img.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def test_metadata_clean_image():
    clean_bytes = create_test_image(software_tag=None)
    res = inspect_metadata(clean_bytes, filename="scan.jpg", mime_type="image/jpeg")
    assert res["checkName"] == "metadata_exif_inspection"
    assert res["result"] in ("pass", "not_applicable")


def test_metadata_flag_photoshop():
    ps_bytes = create_test_image(software_tag="Adobe Photoshop 2024 (Windows)")
    res = inspect_metadata(ps_bytes, filename="aadhaar_front.jpg", mime_type="image/jpeg")
    assert res["result"] == "flag"
    assert "photoshop" in res["explanation"].lower()
    assert res["confidence"] <= 25


def test_metadata_flag_canva():
    canva_bytes = create_test_image(software_tag="Canva v2.4")
    res = inspect_metadata(canva_bytes, filename="document.jpg", mime_type="image/jpeg")
    assert res["result"] == "flag"
    assert "canva" in res["explanation"].lower()
