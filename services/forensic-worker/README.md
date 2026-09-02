# VeriScan self-hosted forensic worker

This service is the local Python runtime for the modules that should not be routed through a paid third-party API. It runs Tesseract OCR through `pytesseract`, loads an operator-installed UIDAI public certificate for Aadhaar QR verification, and provides controlled integration points for the official TruFor and CAT-Net inference workflows.

## Local OCR and certificate setup

Install system and Python dependencies with:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr
python3 -m pip install -r requirements.txt
```

Place the official UIDAI public certificate at `certs/uidai_public_cert.cer` or set `UIDAI_PUBLIC_CERT_PATH` to its location. VeriScan intentionally does not embed a guessed certificate: the official UIDAI certificate page currently returned 404 during setup, so the operator must download and verify the current `.cer` file from UIDAI before enabling Aadhaar QR trust.

Run the worker with:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

The Node app can point `FORENSIC_WORKER_URL` at this worker. It calls `/ocr` for local Tesseract extraction and `/verify-aadhaar-qr` for UIDAI certificate-backed validation. `TRUFOR_API_URL` and `CATNET_API_URL` may point at self-hosted model endpoints, and `PIXEL_ANALYSIS_API_URL` may point at a compatible internal pixel worker. These are internal service configuration values, not third-party API keys.

## TruFor

The official repository is vendored under `vendor/TruFor`. Its documented Docker inference setup downloads `TruFor_weights.zip` from `https://www.grip.unina.it/download/prog/TruFor/TruFor_weights.zip` and records MD5 `7bee48f3476c75616c3c5721ab256ff8`. Review the repository license before any operational deployment. After the checkpoint is installed, implement the `/analyze-tampering` endpoint by calling the official `test_docker` workflow and mapping its `score`, `map`, and `conf` outputs into VeriScan’s validated response schema. There is no TruFor API key.

## CAT-Net

The official repository is vendored under `vendor/CAT-Net`. Its README lists pretrained and trained weights, including `DCT_djpeg.pth.tar`, `hrnetv2_w48_imagenet_pretrained.pth`, and the `CAT_full_v2` general-forgery model. The project documents Google Drive and Baidu download locations; review the code and weight licenses before obtaining them. After installation, implement `/analyze-catnet` by calling the official `tools/infer.py` workflow and mapping its heatmap outputs into VeriScan’s validated response schema. There is no CAT-Net API key.

## API-key policy

`HF_API_TOKEN` is the only third-party secret used by VeriScan, and it is used solely for the optional `Organika/sdxl-detector` Hugging Face image signal. OCR, TruFor, CAT-Net, the pixel worker, and the UIDAI certificate are not configured as third-party API-key providers. Do not place private signing keys in this worker or in the web application.
