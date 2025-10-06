from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import uvicorn
from services.background_removal import BackgroundRemovalService
from models.response import RemovalResponse, HealthResponse
from models.exceptions import (
    BackgroundRemovalError,
    ModelNotLoadedError,
    ImageProcessingError,
    InferenceError,
    LowConfidenceError
)
import io
from PIL import Image
import traceback

app = FastAPI(title="AI Background Removal Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize background removal service
bg_removal_service = BackgroundRemovalService()

@app.exception_handler(BackgroundRemovalError)
async def background_removal_exception_handler(request, exc: BackgroundRemovalError):
    """Handle background removal errors"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "type": exc.__class__.__name__
        }
    )

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    try:
        bg_removal_service.load_model()
        print("AI service started successfully")
    except Exception as e:
        print(f"Warning: Failed to load model on startup: {e}")
        print("Service will use fallback method")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=bg_removal_service.is_model_loaded()
    )

@app.post("/api/remove-background", response_model=RemovalResponse)
async def remove_background(file: UploadFile = File(...)):
    """Remove background from uploaded image"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Process image
        result = bg_removal_service.remove_background(image)
        
        method = result.get("method", "ai_model")
        message = "Background removed successfully"
        if method == "fallback":
            message = "Background removed using fallback method (AI model unavailable or low confidence)"
        
        return RemovalResponse(
            success=True,
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            message=message
        )
    except LowConfidenceError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Image may not be suitable for automatic processing: {str(e)}"
        )
    except ModelNotLoadedError as e:
        raise HTTPException(
            status_code=503,
            detail="AI model not available, using fallback method"
        )
    except ImageProcessingError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Image processing failed: {str(e)}"
        )
    except InferenceError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@app.post("/api/remove-background/image")
async def remove_background_image(file: UploadFile = File(...)):
    """Remove background and return processed image"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Process image
        result = bg_removal_service.remove_background(image)
        
        # Convert result to bytes
        output_buffer = io.BytesIO()
        result["image"].save(output_buffer, format="PNG")
        output_buffer.seek(0)
        
        method = result.get("method", "ai_model")
        
        return Response(
            content=output_buffer.getvalue(),
            media_type="image/png",
            headers={
                "X-Confidence": str(result["confidence"]),
                "X-Processing-Time": str(result["processing_time"]),
                "X-Method": method
            }
        )
    except LowConfidenceError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Image may not be suitable for automatic processing: {str(e)}"
        )
    except ModelNotLoadedError as e:
        raise HTTPException(
            status_code=503,
            detail="AI model not available"
        )
    except ImageProcessingError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Image processing failed: {str(e)}"
        )
    except InferenceError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
