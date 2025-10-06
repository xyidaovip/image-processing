from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import uvicorn
from services.background_removal import BackgroundRemovalService
from models.response import RemovalResponse, HealthResponse # 确保 models/response.py 已创建
from models.exceptions import (
    BackgroundRemovalError,
    ModelNotLoadedError,
    ImageProcessingError,
    InferenceError,
    LowConfidenceError
)
import io
import os
import uuid
from PIL import Image
import traceback

# --- 配置 ---
PROCESSED_DIR = "/app/uploads/processed"

# --- FastAPI 应用实例 ---
app = FastAPI(title="AI Background Removal Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bg_removal_service = BackgroundRemovalService()

@app.on_event("startup")
async def startup_event():
    """应用启动时加载模型并创建目录"""
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    try:
        bg_removal_service.load_model()
        print("AI 服务启动成功，模型已加载")
    except Exception as e:
        print(f"警告: 启动时加载模型失败: {e}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查端点"""
    return HealthResponse(
        status="healthy",
        model_loaded=bg_removal_service.is_model_loaded()
    )

@app.post("/api/remove-background", response_model=RemovalResponse)
async def remove_background(file: UploadFile = File(...)):
    """移除图片背景，并返回包含蒙版路径的JSON。"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="文件必须是图片格式")
    
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        result = bg_removal_service.remove_background(image)
        
        # --- 关键修改：保存蒙版文件 ---
        mask_image = Image.fromarray(result["mask"])
        mask_filename = f"mask-{uuid.uuid4()}.png"
        mask_path = os.path.join(PROCESSED_DIR, mask_filename)
        mask_image.save(mask_path)
        # -----------------------------
        
        message = "背景移除成功"
        
        return RemovalResponse(
            success=True,
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            message=message,
            mask_path=mask_path  # 在响应中返回路径
        )
    except Exception as e:
        print(f"未知错误: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"处理失败: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
