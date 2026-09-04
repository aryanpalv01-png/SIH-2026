# n8n + Supabase wiring

This repository currently has a Drizzle/MySQL application path. The SQL and worker contract below are for the Supabase/n8n architecture shown in the project diagram; they do not silently migrate the existing app.

## Supabase

1. Run `supabase/n8n-setup.sql` in the Supabase SQL Editor.
2. In Storage, confirm the private `documents` bucket exists.
3. In Database > Webhooks > Create webhook, select `public.documents`, event `INSERT`, method `POST`, and paste the n8n **Production URL**. Use the Test URL only while manually testing the workflow.
4. Enable Realtime for `public.documents` if the SQL publication statement was skipped because the table is already attached.

## n8n workflow

The Supabase webhook body is the inserted row. Keep this sequence:

1. **Webhook / Supabase Webhook** receives the row and responds immediately with HTTP 200.
2. **Supabase Storage download** fetches `file_path` from the private `documents` bucket using the service-role credential. Do not send document bytes from the browser to n8n.
3. **Lightweight Microservice** sends multipart field `file` and form field `documentType` to `POST /analyze-lightweight`.
4. **GPU Microservice** sends the same binary to the deployed TruFor/CAT-Net service. It must return `integrityScore`, `tamperProbability`, and `reliability` as numbers between 0 and 1.
5. **Score Fusion** combines the two results and sets `status` to `verified` above 80, `needs_review` from 40 to 80, otherwise `likely_forged`.
6. **Supabase Update** updates the row by `id` with `status`, `confidence_score`, `checks`, `report`, and `updated_at`. Use the service-role key only in n8n credentials.

## Credentials and URLs

Set these as n8n credentials/environment values, never in the exported workflow JSON or frontend bundle:

- `SUPABASE_URL`: `https://dubwryhfjyeuilahaknw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Project Settings > API > service_role key
- `HF_API_TOKEN`: Hugging Face token, only for the optional HF node
- `LIGHTWEIGHT_URL`: public HTTPS base URL for this FastAPI worker
- `GPU_URL`: public HTTPS base URL for the TruFor/CAT-Net service

The service-role key and HF token must not be placed in React code, Supabase browser settings, or a committed `.env` file. After changing credentials, execute the n8n workflow once with a test row and confirm the `documents` row changes from `processing` to a final status.