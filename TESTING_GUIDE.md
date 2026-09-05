# VeriScan Live System Verification & QA Testing Guide

This guide provides an end-to-end verification protocol for the deployed **VeriScan National Digital Forensics Platform** spanning:
- **Frontend**: Vercel (Next.js / React)
- **Database & Storage**: Supabase (`public.documents`, `documents` bucket, Auth)
- **Workflow Orchestration**: n8n (Database Webhooks -> Pipeline Router)
- **Forensic Engine**: Render (`VeriScan Fast Check Service` Docker container)

---

## 1. Pre-Flight Architecture Health Checks

Before testing the frontend UI, verify all microservices are operational:

| Component | Target URL / Service | Expected Health Response |
| :--- | :--- | :--- |
| **Fast Check Service** | `https://<render-service>.onrender.com/` | `{"status": "online", "service": "VeriScan Fast Check API", "message": "System is operational."}` |
| **Worker Health Check** | `https://<render-service>.onrender.com/health` | `{"status": "healthy", "tesseract_available": true, "pyzbar_available": true, ...}` |
| **n8n Orchestrator** | `https://<n8n-instance>/webhook/...` | Webhook node active and listening for `public.documents` `INSERT` events |
| **Supabase DB** | Supabase Dashboard | Table `public.documents` exists with RLS policies enabled |
| **Supabase Storage** | Storage > Buckets | `documents` bucket created with authenticated RLS policy |

---

## 2. Automated Backend Loop Verification

Run the automated Python integration script to verify the backend pipeline in isolation:

```bash
# Activate your python environment
source services/forensic-worker/venv/bin/activate

# Execute the live test script
python scripts/e2e_live_test.py --email <your-test-user@email.com> --password <your-password>
```

> [!TIP]
> The test script will generate a synthetic identity certificate image, upload it to the Supabase `documents` bucket, insert a record into `public.documents`, and poll for the updated `status`, `confidence_score`, and anomaly breakdown.

---

## 3. Manual UI Verification Protocol (Vercel Live URL)

### Phase 1: Authentication & Route Protection Gate
1. Open an incognito browser window and navigate to your Vercel deployment root: `https://<your-vercel-app>.vercel.app`.
2. Attempt to navigate directly to `/dashboard`, `/verify`, or `/history`:
   - **Expected Result**: Next.js Edge Middleware ([`middleware.ts`](file:///home/aryan/Desktop/Verif.ai/SIH-2026/middleware.ts)) intercepts the request and redirects to `/auth/login?redirect=...`.
3. Click **"Screen Document"** on the landing page:
   - **Expected Result**: Prompts you to log in.
4. On `/auth/login`:
   - Enter your email address and click **"Send Login Code"** (or use Phone OTP).
   - Enter the 6-digit OTP code.
   - Click **"Verify Securely"**.
   - **Expected Result**: Successful login automatically routes to `/dashboard`.

---

### Phase 2: Document Intake & Live Upload
1. From the top navigation or sidebar, click **"Screen Document"** (`/verify`).
2. Drag and drop or browse to upload an identity document (JPEG, PNG, or PDF).
   - *Test Samples*: Aadhaar Card, PAN Card, Passport, or Marksheet.
3. Observe the upload interaction:
   - Progress bar indicates upload progress to Supabase Storage (`documents/<user_id>/...`).
   - Database record is created in `public.documents` with `status: 'processing'`.
   - The UI displays an animated forensic screening status: *"OpenCV noise preflight -> Adaptive OCR -> Tamper Zone Scan"*.

---

### Phase 3: n8n Webhook & Render Fast Check Execution
1. Open your **n8n Workflow Execution History**:
   - Verify the `INSERT` event from Supabase triggered the workflow immediately.
   - Verify n8n downloaded the file from Supabase Storage and called `POST /analyze` (or `/analyze-lightweight`) on your Render Web Service.
2. Open your **Render Dashboard Logs**:
   - Confirm the incoming HTTP request was processed with status `200 OK`.
   - Confirm Tesseract OCR, ELA, and metadata analyzers completed without memory errors.
3. Check the Supabase table:
   - Record updates to `status: 'verified'`, `'needs_review'`, or `'likely_forged'`.
   - `confidence_score` and `checks` payload are populated.

---

### Phase 4: Forensic Report & Anomaly Viewer (`/report/:id`)
Once processing completes, the UI redirects to the interactive Forensic Audit Report:

#### 1. Header & Verdict Badge
- Verify the **Tiranga Tricolor Bar** and **Ashok Chakra VeriScan Seal** appear at the top.
- Verify the **Verdict Badge** displays properly:
  - 🟢 **Verified Genuine** (Score > 80)
  - 🟡 **Flagged for Forensic Review** (Score 40–80)
  - 🔴 **High Probability of Tampering** (Score < 40)

#### 2. Interactive Anomaly Viewer
- Locate the document preview card.
- Click the **"Show Tampered Zones"** toggle:
  - **Expected Result**: The toggle switches state to active. Red bounding boxes with pulse animations appear over detected anomaly coordinates (`x_pct`, `y_pct`, `width_pct`, `height_pct`).
- Hover over or click an anomaly bounding box:
  - **Expected Result**: A tooltip displays the anomaly reason (e.g., *"Font thickness mismatch"*, *"Copy-Move keypoint cluster"*, or *"ELA compression residual difference"*).
- Resize the browser window between mobile and desktop widths:
  - **Expected Result**: Percentage-based coordinates scale seamlessly without shifting out of position.

#### 3. Forensic Loupe Canvas
- Hover your cursor over the document image:
  - **Expected Result**: A circular 3x forensic loupe follows the cursor, rendering pixel-level detail of font edges and microprinting.

#### 4. Contextual Justification Chips
- Scroll down to the **11-Point Verification Matrix**:
  - Verify that soft-copy or non-applicable checks display reasoned justifications rather than blank "N/A" (e.g., *"N/A · Disabled for digital soft-copies: OpenCV noise variance preflight confirmed document lacks camera sensor grain"*).

---

### Phase 5: Court-Admissible PDF Export
1. At the top right of the report, click **"Download Certificate (PDF)"**.
2. In the print / preview dialog:
   - **Expected Result**:
     - The document preview image is rendered completely (no blank squares or CORS failures).
     - The red anomaly bounding boxes are preserved on the printed artifact.
     - Includes the SHA-256 cryptographic hash, Certificate ID, and Statutory Section 65B (Bharatiya Sakshya Adhiniyam) legal disclaimer.
3. Save or print the PDF to confirm layout pagination (`page-break-inside: avoid`).

---

## 4. Troubleshooting Quick Reference

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| Document remains in `'processing'` | n8n Webhook did not trigger or failed | Check Supabase Database > Webhooks to ensure URL points to n8n Production Webhook URL. |
| Render returns 500 error | Missing C++ system libraries | Confirm Dockerfile contains `tesseract-ocr`, `libzbar0`, and `opencv-python-headless`. |
| 401 Unauthorized on Storage | Supabase RLS Policy violation | Ensure file is stored at `<auth.uid()>/filename.jpg` matching Supabase storage policy. |
| Red boxes misaligned | Bounding boxes using absolute pixels | Ensure anomaly coordinates use percentage properties (`x_pct`, `y_pct`, `width_pct`, `height_pct`). |
