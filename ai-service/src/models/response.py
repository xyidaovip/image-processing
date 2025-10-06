from pydantic import BaseModel
from typing import Optional

class RemovalResponse(BaseModel):
    """
    定义背景移除API的JSON响应结构。
    """
    success: bool
    confidence: float
    processing_time: float
    message: str
    mask_path: Optional[str] = None  # 添加蒙版文件路径字段

class HealthResponse(BaseModel):
    """
    定义健康检查API的响应结构。
    """
    status: str
    model_loaded: bool
