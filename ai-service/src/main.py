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
import os
import uuid
from PIL import Image
import traceback

# --- 配置 ---
# 定义处理后文件存储的目录，确保这个路径在容器内是可写的
# 我们假设 '/app/uploads' 是一个持久化的卷或可写目录
PROCESSED_DIR = "/app/uploads/processed"

# --- FastAPI 应用实例 ---
app = FastAPI(title="AI Background Removal Service")

# --- 中间件 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 服务初始化 ---
bg_removal_service = BackgroundRemovalService()

# --- 事件处理 ---
@app.on_event("startup")
async def startup_event():
    """应用启动时加载模型并创建目录"""
    try:
        # 确保存储目录存在
        os.makedirs(PROCESSED_DIR, exist_ok=True)
        print(f"确保目录存在: {PROCESSED_DIR}")
        
        bg_removal_service.load_model()
        print("AI 服务启动成功，模型已加载")
    except Exception as e:
        print(f"警告: 启动时加载模型失败: {e}")
        print("服务将使用备用方法")

# --- 异常处理 ---
@app.exception_handler(BackgroundRemovalError)
async def background_removal_exception_handler(request, exc: BackgroundRemovalError):
    """处理自定义的背景移除错误"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "type": exc.__class__.__name__
        }
    )

# --- API 端点 ---
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查端点"""
    return HealthResponse(
        status="healthy",
        model_loaded=bg_removal_service.is_model_loaded()
    )

@app.post("/api/remove-background", response_model=RemovalResponse)
async def remove_background(file: UploadFile = File(...)):
    """
    移除图片背景。
    处理成功后，返回包含蒙版文件路径的JSON。
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="文件必须是图片格式")
    
    try:
        # 读取图片
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # 处理图片
        result = bg_removal_service.remove_background(image)
        
        # --- 关键修改：保存蒙版文件 ---
        mask_image = Image.fromarray(result["mask"])
        mask_filename = f"mask-{uuid.uuid4()}.png"
        mask_path = os.path.join(PROCESSED_DIR, mask_filename)
        mask_image.save(mask_path)
        # -----------------------------

        method = result.get("method", "ai_model")
        message = "背景移除成功"
        if method == "fallback":
            message = "背景移除成功 (使用备用方法)"
        
        return RemovalResponse(
            success=True,
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            message=message,
            mask_path=mask_path  # 在响应中返回路径
        )
    except LowConfidenceError as e:
        raise HTTPException(status_code=422, detail=f"图片可能不适合自动处理: {e}")
    except ModelNotLoadedError as e:
        raise HTTPException(status_code=503, detail=f"AI模型不可用: {e}")
    except ImageProcessingError as e:
        raise HTTPException(status_code=400, detail=f"图片处理失败: {e}")
    except InferenceError as e:
        raise HTTPException(status_code=500, detail=f"模型推理失败: {e}")
    except Exception as e:
        print(f"未知错误: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"处理失败: {e}")

@app.post("/api/remove-background/image")
async def remove_background_image(file: UploadFile = File(...)):
    """移除背景并直接返回处理后的图片文件"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="文件必须是图片格式")
    
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        result = bg_removal_service.remove_background(image)
        
        output_buffer = io.BytesIO()
        result["image"].save(output_buffer, format="PNG")
        output_buffer.seek(0)
        
        return Response(
            content=output_buffer.getvalue(),
            media_type="image/png",
            headers={
                "X-Confidence": str(result["confidence"]),
                "X-Processing-Time": str(result["processing_time"]),
                "X-Method": result.get("method", "ai_model")
            }
        )
    except Exception as e:
        # 为简洁起见，使用通用错误处理
        print(f"未知错误 (image endpoint): {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"处理失败: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
