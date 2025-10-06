# AI Background Removal Service

FastAPI service for AI-powered background removal using ONNX Runtime.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Download the RMBG-1.4 model:
   - Visit: https://huggingface.co/briaai/RMBG-1.4
   - Download the ONNX model file
   - Place it in `models/rmbg-1.4.onnx`

3. Configure environment:
```bash
cp .env.example .env
```

4. Run the service:
```bash
python src/main.py
```

The service will be available at http://localhost:8001

## API Endpoints

### Health Check
```
GET /health
```

### Remove Background (JSON Response)
```
POST /api/remove-background
Content-Type: multipart/form-data
Body: file (image file)
```

### Remove Background (Image Response)
```
POST /api/remove-background/image
Content-Type: multipart/form-data
Body: file (image file)
```

## Model Information

This service uses the RMBG-1.4 model for background removal:
- Model: RMBG-1.4 (Remove Background 1.4)
- Provider: BRIA AI
- Runtime: ONNX Runtime
- Input: RGB images (1024x1024)
- Output: Binary mask for foreground/background segmentation
