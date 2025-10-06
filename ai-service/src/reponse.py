# ai-service/src/models/response.py
from pydantic import BaseModel
from typing import Optional

class RemovalResponse(BaseModel):
    success: bool
    confidence: float
    processing_time: float
    message: str
    mask_path: Optional[str] = None # 👈 添加这一行

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
