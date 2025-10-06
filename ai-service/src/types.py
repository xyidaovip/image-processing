from typing import Tuple, Optional
from pydantic import BaseModel
import numpy as np

class ImageProcessingRequest(BaseModel):
    image_path: str
    output_path: Optional[str] = None

class ImageProcessingResponse(BaseModel):
    success: bool
    processed_image_path: Optional[str] = None
    mask_path: Optional[str] = None
    confidence: float = 0.0
    processing_time: float = 0.0
    error: Optional[str] = None

class ModelConfig(BaseModel):
    model_path: str
    input_size: Tuple[int, int] = (1024, 1024)
    confidence_threshold: float = 0.5

class BackgroundRemovalService:
    """AI背景移除服务接口"""
    
    def remove_background(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        移除图片背景
        
        Args:
            image: 输入图片数组
            
        Returns:
            Tuple[分割后的图片, 蒙版]
        """
        raise NotImplementedError
    
    def get_confidence_score(self, mask: np.ndarray) -> float:
        """
        计算分割质量置信度
        
        Args:
            mask: 分割蒙版
            
        Returns:
            置信度分数 (0-1)
        """
        raise NotImplementedError
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        图片预处理
        
        Args:
            image: 原始图片
            
        Returns:
            预处理后的图片
        """
        raise NotImplementedError
    
    def postprocess_mask(self, mask: np.ndarray) -> np.ndarray:
        """
        蒙版后处理
        
        Args:
            mask: 原始蒙版
            
        Returns:
            后处理后的蒙版
        """
        raise NotImplementedError