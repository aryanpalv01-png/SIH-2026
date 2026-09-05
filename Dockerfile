# ==============================================================================
# VeriScan Fast-Check Service (FastAPI Microservice) Dockerfile
# Optimized for Render / Railway containerized deployment
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing bytecode and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install necessary C++ system dependencies:
# - tesseract-ocr & eng: OCR text recognition
# - libzbar0: QR code / Barcode decoding
# - libgl1 & libglib2.0-0: OpenCV headless image manipulation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Set working directory to services/forensic-worker for direct model and module access
WORKDIR /app/services/forensic-worker

# Expose service port (Render injects PORT dynamically at runtime, default 8000)
ENV PORT=8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start the FastAPI server using uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
