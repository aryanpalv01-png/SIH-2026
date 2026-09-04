# Project TODO

- [x] Replace starter page with VeriScan landing and authenticated dashboard experience
- [x] Add responsive institutional design system with charcoal, cream, and bronze tokens
- [x] Add VeriScan logo mark and reusable seal-style status indicators
- [x] Add clear navigation for verification, reports, scan history, and settings
- [x] Add document upload flow with file type/size validation and upload states
- [x] Add simulated sequential document scanning states
- [x] Add modular document analysis service with deterministic observations and swappable external webhook seam
- [x] Add secure document reference persistence without storing file bytes in the database
- [x] Add user-scoped scan records and report retrieval procedures
- [x] Add structured authenticity report with confidence score, metadata, findings, and recommended next steps
- [x] Add request human review interaction
- [x] Add searchable/filterable scan history
- [x] Add settings page with account, API access, and notification preferences sections
- [x] Add auth-aware behavior using the existing authentication-ready foundation
- [x] Add responsive layout, keyboard focus states, reduced-motion handling, and accessible status labels
- [x] Add Vitest coverage for analysis scoring and scan/report data behavior
- [x] Run typecheck, tests, and visual verification
- [x] Save final project checkpoint and deliver the VeriScan project version

## Implementation decision

- [x] Use authenticated Manus OAuth as the secure access gate for dashboard data; provide a polished landing page for unauthenticated visitors.
- [x] Use secure S3-backed file references via the existing storage helpers, with scan metadata and analysis observations stored in the database.
- [x] Use a deterministic simulation layer for the initial analysis flow, with a configurable external webhook seam for future forensic ML services.
- [x] Use local demo state only for the polished preview experience when database-backed procedures are unavailable; never fabricate customer reviews or testimonials.

## Change history

- [x] Initial implementation request added: responsive secure VeriScan dashboard with upload, scanning, reports, history, settings, secure storage references, and structured authenticity guidance.
- [x] Product naming constraint added: product name must be VeriScan.
- [x] Style direction added: elegant institutional experience.

## Bugs

- [x] None reported yet.

## Completed

- [x] Project initialized as a full-stack web-db-user application scaffold.
- [x] User-provided VeriScan product specification reviewed.
- [x] Initial implementation plan created and refined for dashboard scope.

## Forensic detection expansion

- [x] Add independently callable metadata/EXIF and PDF metadata inspection module
- [x] Add Aadhaar Verhoeff and PAN structural validation module with explicit scope boundaries
- [x] Add QR/barcode decoding and signed-payload verification seam with issuer-key configuration
- [x] Add image ELA, screenshot/capture-noise, and copy-move/clone analysis modules
- [x] Add OCR typography consistency analysis seam with optional Tesseract/OpenCV runtime
- [x] Add Hugging Face AI-image detector integration using a secure HF_API_TOKEN secret
- [x] Add TruFor and CAT-Net pretrained inference adapters without training or pretending model availability
- [x] Add score-fusion engine with weighted checksum/signature overrides and per-module breakdown
- [x] Wire expanded module results into protected scan reports and UI
- [x] Add tests for module contracts, fusion thresholds, and provider fallbacks
- [x] Document API-key setup, model-runtime requirements, accuracy limitations, and sample evaluation workflow
- [x] Re-run typecheck, tests, and responsive visual verification
- [ ] Save an expanded project checkpoint and deliver the new version

## Forensic QA

- [ ] Keep final validation open until real genuine and edited document samples are evaluated
- [ ] Do not claim government-record verification or guaranteed authenticity from file-level signals

## Accuracy hardening

- [x] Replace metadata filename heuristics with actual image EXIF and PDF metadata parsing or a validated worker adapter
- [x] Implement QR/barcode decoding and signed payload verification with issuer public-key parsing and field comparison
- [x] Replace byte heuristics with authenticated pixel-analysis adapters for ELA heatmaps, screenshot noise variance, and clone regions
- [x] Add a real OCR typography adapter contract with runtime health reporting and structured result validation
- [x] Keep the report explicit about which pixel/worker providers are active versus not applicable

## Evidence-fusion hardening

- [x] Add OCR-backed field extraction and compare printed fields with decoded QR payload fields
- [x] Add self-hosted pixel-analysis adapter for ELA, screenshot noise, and clone results with schema validation
- [x] Add provider health states to the analysis result and report model
- [x] Render real provider-state badges in the detailed report
- [x] Verify the new provider-state and evidence-fusion UI at desktop and mobile widths

## Clarified integration configuration

- [x] Remove OCR_API_URL and OCR_API_KEY requirements; use local pytesseract/Tesseract instead
- [x] Remove TruFor/CAT-Net API-key requirements; use self-hosted worker URLs without auth headers by default
- [x] Remove JSON issuer-key configuration requirement; load the UIDAI .cer certificate from project configuration
- [x] Mark QR verification not applicable for non-Aadhaar document types
- [x] Add local OCR worker scaffolding and field extraction contract
- [x] Add UIDAI certificate loader and Aadhaar QR signature verification contract
- [x] Add self-hosted TruFor and CAT-Net worker service scaffolding with checkpoint/configuration docs
- [x] Update settings/report provider state copy to match the exact clarified configuration
- [x] Re-run tests, visual verification, and save the clarified integration checkpoint

## Final exact-policy corrections

- [x] Remove OCR_API_URL from the Node analyzer and run pytesseract locally in the worker process contract
- [ ] Add a verified UIDAI certificate-path health state and end-to-end validation test without fabricating the certificate
- [x] Add live health probing for configured self-hosted OCR, UIDAI, TruFor, and CAT-Net services
- [x] Surface verified live provider health in settings and detailed reports

## Verified provider health

- [x] Add direct health probes for configured TRUFOR_API_URL and CATNET_API_URL endpoints
- [x] Persist direct health results rather than inferring them only from scan outcomes
- [x] Add tests covering health probe normalization and report/settings state mapping
- [ ] Save a new checkpoint after the clarified changes

## Provider-health test coverage

- [x] Add backend tests for healthy, degraded, and not-configured TruFor/CAT-Net health normalization
- [x] Add verifiable coverage for persisted providerHealth normalization and report/settings provider labels

## Corrected no-key validation

- [x] Rename the pixel-worker checklist item to reflect an unauthenticated self-hosted adapter with schema validation
- [x] Add direct health-probe tests for healthy, degraded, and not-configured TruFor/CAT-Net states
- [x] Add persisted providerHealth normalization coverage through serverDocumentToVerification
- [ ] Keep UIDAI certificate installation and end-to-end signature validation open until a real official .cer file is supplied

## Final health propagation coverage

- [x] Add CAT-Net-specific health-probe tests using the /analyze-catnet route
- [x] Add a backend test proving TruFor and CAT-Net probe states propagate into providerHealth

## Microservices architecture & crazy forensic workstation
- [x] Correct Verhoeff D5 Cayley table in Python and Node
- [x] Complete n8n orchestration workflow JSON (9-node architecture flow)
- [x] Complete Supabase master PostgreSQL schema and RLS policies
- [x] Build multi-layer Forensic Deep-Dive Canvas with real-time 2x/4x/8x loupe magnifier
- [x] Build live Microservices Architecture Telemetry visualizer
- [x] Build official bank-grade Certificate of Authenticity and PDF export
- [x] Add 1-click test document sandbox for genuine and forged Aadhaar, PAN, and certificates
- [x] 100% test coverage across Python worker (31/31 passed) and Node Vitest (20/20 passed)
- [x] Clean zero-error TypeScript check and successful production bundle

## GitHub delivery

- [ ] Push the current VeriScan codebase to aryanpalv01-png/SIH-2026
- [ ] Confirm the pushed branch and commit URL

