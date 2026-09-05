#!/usr/bin/env python3
"""
VeriScan End-to-End Live Integration Test
Simulates the live user flow across:
  - Supabase Auth (Sign In / User Session)
  - Supabase Storage (Upload to 'documents' bucket)
  - Supabase Database (Insert into 'public.documents' table triggering n8n webhook)
  - Asynchronous Webhook Polling (n8n -> Render Fast Check Service -> Supabase update)
  - Assertion & Anomaly Breakdown Verification
"""

import argparse
import io
import json
import os
import sys
import time
import uuid
from pathlib import Path

# Load environment variables from .env or .env.local
from dotenv import load_dotenv

# Try loading project root .env and .env.local
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local", override=True)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None

from supabase import create_client, Client


def get_supabase_client() -> tuple[Client, str, str]:
    """Retrieve Supabase URL & Key from environment and initialize client."""
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        print("[!] ERROR: Missing Supabase credentials in .env file.")
        print("    Required: VITE_SUPABASE_URL (or SUPABASE_URL) and VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)")
        sys.exit(1)

    url = url.strip().rstrip("/")
    key = key.strip()

    client: Client = create_client(url, key)
    return client, url, key


def create_dummy_test_image(text: str = "VERISCAN QA LIVE TEST DOCUMENT") -> tuple[bytes, str]:
    """Generate a realistic test document image in memory using Pillow."""
    filename = f"qa_test_{uuid.uuid4().hex[:8]}.jpg"

    if Image is not None:
        # Create a standard A4-ratio canvas (width 800, height 1000)
        img = Image.new("RGB", (800, 1000), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Draw outer borders
        draw.rectangle([20, 20, 780, 980], outline=(40, 60, 100), width=3)
        draw.rectangle([30, 30, 770, 970], outline=(180, 180, 180), width=1)

        # Header banner
        draw.rectangle([30, 30, 770, 100], fill=(240, 245, 255))
        draw.text((50, 50), text, fill=(20, 30, 80))
        draw.text((50, 75), "CONFIDENTIAL GOVERNMENT FORENSIC AUDIT SAMPLE", fill=(100, 100, 100))

        # Document body lines
        draw.text((50, 140), f"Document ID: VS-TEST-{uuid.uuid4().hex[:12].upper()}", fill=(30, 30, 30))
        draw.text((50, 170), f"Timestamp:   {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}", fill=(30, 30, 30))
        draw.text((50, 200), "Issuer:      VeriScan National Forensic Authority", fill=(30, 30, 30))
        draw.text((50, 230), "Doc Type:    Standard Test Identity Certificate", fill=(30, 30, 30))

        # Simulated portrait box
        draw.rectangle([50, 280, 230, 480], outline=(100, 100, 100), fill=(230, 235, 240), width=2)
        draw.text((75, 370), "[ PHOTO BOX ]", fill=(120, 120, 120))

        # Mock metadata fields
        fields = [
            ("Applicant Name:", "Aryan Pal"),
            ("Date of Birth:", "15-08-1998"),
            ("National Identifier:", "9874 5612 3012"),
            ("Security Clearance:", "Level-3 Forensic Analyst"),
            ("Checksum Code:", "VERHOEFF-PASS-099"),
        ]
        y_pos = 290
        for label, val in fields:
            draw.text((260, y_pos), label, fill=(100, 100, 100))
            draw.text((430, y_pos), val, fill=(20, 20, 20))
            y_pos += 35

        # Mock QR Code container
        draw.rectangle([50, 520, 210, 680], outline=(0, 0, 0), width=3)
        draw.text((65, 590), "[ SECURE QR ]", fill=(0, 0, 0))

        # Bottom statutory declaration
        draw.rectangle([30, 880, 770, 970], fill=(250, 250, 250))
        draw.text((50, 900), "STATUTORY DECLARATION UNDER IT ACT & BHARATIYA SAKSHYA ADHINIYAM", fill=(120, 120, 120))
        draw.text((50, 925), "Automated end-to-end integration test artifact. Single-use sandbox execution.", fill=(150, 150, 150))

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        return buffer.getvalue(), filename
    else:
        # Fallback minimal JPEG
        data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x10\x00\x10\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
        return data, filename


def main():
    parser = argparse.ArgumentParser(description="VeriScan Live E2E Integration Test")
    parser.add_argument("--email", "-e", help="Test user email (default: TEST_USER_EMAIL or prompt)")
    parser.add_argument("--password", "-p", help="Test user password (default: TEST_USER_PASSWORD or prompt)")
    parser.add_argument("--timeout", "-t", type=int, default=30, help="Polling timeout in seconds (default: 30)")
    parser.add_argument("--bucket", "-b", default="documents", help="Supabase storage bucket name (default: documents)")
    args = parser.parse_args()

    print("=" * 72)
    print("        VERISCAN END-TO-END LIVE INTEGRATION TEST SUITE        ")
    print("=" * 72)

    # 1. Connect to Supabase
    client, sb_url, sb_key = get_supabase_client()
    print(f"[*] Supabase Endpoint: {sb_url}")
    print(f"[*] Storage Bucket:    {args.bucket}")

    # Step 1: Authentication
    print("\n--- STEP 1: Authenticating User Session ---")
    email = args.email or os.getenv("TEST_USER_EMAIL")
    password = args.password or os.getenv("TEST_USER_PASSWORD")

    user_id = None
    user_email = None

    if email and password:
        print(f"[*] Attempting password sign-in for: {email}...")
        try:
            auth_response = client.auth.sign_in_with_password({"email": email, "password": password})
            if auth_response and auth_response.user:
                user_id = auth_response.user.id
                user_email = auth_response.user.email
                print(f"[+] Authenticated successfully! User ID: {user_id}")
        except Exception as e:
            print(f"[!] Password sign-in failed: {e}")
            print("[*] Attempting sign-up with credentials in case user does not exist...")
            try:
                signup_response = client.auth.sign_up({"email": email, "password": password})
                if signup_response and signup_response.user:
                    user_id = signup_response.user.id
                    user_email = signup_response.user.email
                    print(f"[+] Account registered: {user_id}")
            except Exception as se:
                print(f"[!] Sign-up failed: {se}")

    # Fallback: check existing session or service role key
    if not user_id:
        try:
            session = client.auth.get_session()
            if session and session.user:
                user_id = session.user.id
                user_email = session.user.email
                print(f"[+] Reusing active session for user: {user_id} ({user_email})")
        except Exception:
            pass

    if not user_id:
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if service_role_key:
            print("[*] Using SUPABASE_SERVICE_ROLE_KEY for automated test execution...")
            client = create_client(sb_url, service_role_key)
            user_id = str(uuid.uuid4())
            user_email = "service_role_tester@veriscan.internal"
            print(f"[+] Service Role Client configured. Synthetic User ID: {user_id}")
        else:
            print("[!] No user credentials provided in CLI or environment.")
            print("    You can pass credentials via:")
            print("    python scripts/e2e_live_test.py --email <user> --password <pass>")
            print("    or set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env")
            user_id = str(uuid.uuid4())
            print(f"[*] Proceeding with generated User UUID: {user_id}")

    # Step 2: Upload Dummy Document Image
    print("\n--- STEP 2: Generating & Uploading Document to Storage ---")
    image_bytes, filename = create_dummy_test_image()
    storage_path = f"{user_id}/{filename}"
    print(f"[*] Generated synthetic forensic sample ({len(image_bytes)} bytes): {filename}")
    print(f"[*] Target storage path: {storage_path}")

    upload_succeeded = False
    try:
        client.storage.from_(args.bucket).upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        upload_succeeded = True
        print(f"[+] Storage upload successful: {storage_path}")
    except Exception as e:
        print(f"[!] User-folder upload returned: {e}")
        print("[*] Attempting fallback upload at root path...")
        storage_path = filename
        try:
            client.storage.from_(args.bucket).upload(
                path=storage_path,
                file=image_bytes,
                file_options={"content-type": "image/jpeg", "upsert": "true"},
            )
            upload_succeeded = True
            print(f"[+] Storage upload successful at root: {storage_path}")
        except Exception as e2:
            print(f"[!] Fallback upload failed: {e2}")

    public_url_resp = client.storage.from_(args.bucket).get_public_url(storage_path)
    file_url = public_url_resp if isinstance(public_url_resp, str) else getattr(public_url_resp, "public_url", str(public_url_resp))
    print(f"[*] Resolved File URL: {file_url}")

    # Step 3: Insert row into documents table
    print("\n--- STEP 3: Inserting Row into `public.documents` Table ---")
    doc_payload = {
        "user_id": user_id,
        "file_path": storage_path,
        "file_url": file_url,
        "document_type": "other",
        "original_filename": filename,
        "mime_type": "image/jpeg",
        "file_size": len(image_bytes),
        "status": "processing",
        "confidence_score": 0,
        "checks": [],
        "report": {},
    }

    try:
        insert_res = client.table("documents").insert(doc_payload).execute()
        if not insert_res.data or len(insert_res.data) == 0:
            print("[!] Insert failed: No data returned from Supabase insert query.")
            sys.exit(1)

        inserted_row = insert_res.data[0]
        doc_id = inserted_row.get("id")
        print(f"[+] Successfully inserted record into 'documents' table!")
        print(f"    Document ID: {doc_id}")
        print(f"    Status:      {inserted_row.get('status')}")
        print(f"    Trigger:     n8n Database Webhook (INSERT on public.documents)")
    except Exception as e:
        print(f"[!] Table insertion failed: {e}")
        print("    If RLS policy blocks anonymous insert, pass an authenticated test user (--email / --password)")
        sys.exit(1)

    # Step 4: Poll for Results
    print(f"\n--- STEP 4: Polling for Webhook Results (Timeout: {args.timeout}s) ---")
    print("[*] Waiting for n8n orchestrator to fetch document, invoke Render Fast Check API, and update Supabase...")

    start_time = time.time()
    poll_interval = 3
    final_row = None

    while time.time() - start_time < args.timeout:
        elapsed = int(time.time() - start_time)
        time.sleep(poll_interval)

        try:
            query_res = client.table("documents").select("*").eq("id", doc_id).single().execute()
            data = query_res.data
            current_status = data.get("status") if data else "unknown"
            print(f"    [+{elapsed:02d}s] Polling Document ID {doc_id}... Status: '{current_status}'")

            if current_status in ["verified", "needs_review", "likely_forged"]:
                final_row = data
                break
        except Exception as qe:
            print(f"    [+{elapsed:02d}s] Query warning: {qe}")

    # Step 5: Assertion & Result Verification
    print("\n" + "=" * 72)
    if final_row and final_row.get("status") in ["verified", "needs_review", "likely_forged"]:
        status = final_row.get("status")
        score = final_row.get("confidence_score", 0)
        checks = final_row.get("checks", [])
        report = final_row.get("report", {})

        print("🎉" * 12)
        print("  MASSIVE SUCCESS: END-TO-END VERISCAN WEBHOOK LOOP CONFIRMED!  ")
        print("🎉" * 12)
        print(f"\n  Final Document Status:   {status.upper()}")
        print(f"  Confidence Score:        {score}/100")
        print(f"  Processed At:            {final_row.get('updated_at')}")
        print("\n  --- FORENSIC CHECKS BREAKDOWN ---")
        if isinstance(checks, list) and checks:
            for c in checks:
                check_name = c.get("check_name", c.get("name", "Unknown Check"))
                res = c.get("result", c.get("status", "N/A"))
                expl = c.get("explanation", c.get("details", ""))
                print(f"    - [{res.upper():14s}] {check_name}: {expl}")
        else:
            print(f"    Checks Raw Payload: {json.dumps(checks, indent=2)}")

        if report:
            print("\n  --- DETAILED REPORT / ANOMALIES ---")
            print(f"    {json.dumps(report, indent=4)}")

        print("\n" + "=" * 72)
        print("Backend orchestration (Supabase -> n8n -> Render -> Supabase) is OPERATIONAL!")
        print("=" * 72)
        sys.exit(0)
    else:
        print("❌" * 12)
        print("  INTEGRATION TEST TIMEOUT / FAILURE  ")
        print("❌" * 12)
        print(f"\n  Document ID {doc_id} did not reach a terminal status within {args.timeout} seconds.")
        print("  Troubleshooting Checklist:")
        print("  1. Verify n8n Webhook is ACTIVE and configured to trigger on public.documents INSERT.")
        print("  2. Check n8n execution logs to see if the webhook fired.")
        print("  3. Check Render.com Fast Check service logs to see if HTTP POST /analyze was received.")
        print("  4. Ensure n8n has the correct SUPABASE_SERVICE_ROLE_KEY to update the documents row.")
        print("=" * 72)
        sys.exit(1)


if __name__ == "__main__":
    main()
