# Forensic integration research

The requested specification separates file-level deterministic signals from pretrained model inference. Official TruFor repository review confirms it is a PyTorch image-forgery framework that combines RGB and noise-sensitive traces, returns a pixel-level localization map, a whole-image integrity score, and a reliability map. The repository documents Docker inference and training/test directories, and its license limits use to informational and nonprofit purposes.

The WebDev deployment runtime is Node-only with a low memory ceiling, so TruFor/CAT-Net should be implemented as explicit optional adapters or an external inference service seam rather than silently claimed as active local models. The application must surface provider availability and treat unavailable modules as not applicable.

Source: https://github.com/grip-unina/TruFor


The official CAT-Net repository provides pretrained weights for its DCT and full streams and documents a Python inference script that writes localization heatmaps. It is a separate PyTorch-style runtime and should remain an optional adapter in WebDev rather than being bundled into the Node server.

The Organika/sdxl-detector model is an image-classification model available through Hugging Face Inference API. Its model card says it was fine-tuned for SDXL-generated imagery and may perform worse on other generators; it also indicates non-commercial/fair-use constraints inherited from the training data. Therefore VeriScan should present this as an AI-image likelihood signal, not as proof of editing or document forgery.

Sources:
- https://github.com/mjkwon2021/CAT-Net
- https://huggingface.co/Organika/sdxl-detector


The updated landing page was visually verified at 1280×900 and 375×812. The eleven-layer metric and expanded screening copy remain legible, the upload-first hero retains its institutional hierarchy, and the mobile layout remains single-column without visible horizontal overflow.


The authenticated workspace was available in the connected browser for desktop visual verification. Settings renders the Hugging Face connected state plus optional TruFor/CAT-Net provider cards, scan history remains scannable with filters and confidence values, and the report view renders the structured module list with the existing visual hierarchy. The report still correctly frames the output as screening observations rather than issuing-authority confirmation.


The authenticated private routes were also verified at 375×812. Settings stacks provider cards without overflow, history converts records into readable cards with filters above them, and the report reflows into a single-column evidence sequence while keeping the verdict, secure reference, module checks, and guidance visible.


The two official UIDAI certificate-page URLs surfaced by search both returned 404 in the connected browser session on 30 Aug 2026. I am not embedding a guessed or third-party certificate artifact. The implementation will instead support a project-local `UIDAI_PUBLIC_CERT_PATH` / `certs/uidai_public_cert.cer` contract and will remain not-applicable until the certificate is downloaded from a currently valid UIDAI page and verified by the operator.


Final visual verification covered the landing page, authenticated settings, and demo report at desktop and 375×812 mobile widths. The settings provider grid clearly distinguishes Hugging Face key-required from local OCR, UIDAI certificate, and self-hosted TruFor/CAT-Net. The report remains readable and its evidence details reflow correctly. Private routes display the authenticated workspace in the connected session and remain protected when signed out.


After the exact-policy correction, desktop verification confirmed that Settings distinguishes HF_API_TOKEN from local OCR, UIDAI certificate, and self-hosted TruFor/CAT-Net. The detailed report remains readable with persisted provider-health badges where server evidence is available. The private routes remain protected by authentication; demo reports remain available only through the explicit preview fallback.
