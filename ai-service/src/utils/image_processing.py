import numpy as np
from PIL import Image
import cv2
from typing import Tuple

def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize image to [0, 1] range"""
    return image.astype(np.float32) / 255.0

def denormalize_image(image: np.ndarray) -> np.ndarray:
    """Denormalize image from [0, 1] to [0, 255]"""
    return (image * 255).astype(np.uint8)

def resize_with_aspect_ratio(image: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
    """Resize image while maintaining aspect ratio"""
    original_width, original_height = image.size
    target_width, target_height = target_size
    
    # Calculate scaling factor
    scale = min(target_width / original_width, target_height / original_height)
    
    # Calculate new dimensions
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    # Resize image
    resized = image.resize((new_width, new_height), Image.LANCZOS)
    
    return resized

def create_smooth_edges(mask: np.ndarray, feather_amount: int = 2) -> np.ndarray:
    """Create smooth edges on mask using feathering"""
    # Apply Gaussian blur for feathering
    if feather_amount > 0:
        mask_float = mask.astype(np.float32) / 255.0
        mask_float = cv2.GaussianBlur(mask_float, (feather_amount * 2 + 1, feather_amount * 2 + 1), 0)
        mask = (mask_float * 255).astype(np.uint8)
    
    return mask

def extract_largest_component(mask: np.ndarray) -> np.ndarray:
    """Extract the largest connected component from mask"""
    # Find connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    
    if num_labels <= 1:
        return mask
    
    # Find largest component (excluding background at index 0)
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    
    # Create mask with only largest component
    largest_mask = np.zeros_like(mask)
    largest_mask[labels == largest_label] = 255
    
    return largest_mask

def apply_alpha_matting(image: np.ndarray, mask: np.ndarray, trimap_erosion: int = 5) -> np.ndarray:
    """Apply simple alpha matting for better edge quality"""
    # Create trimap
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (trimap_erosion, trimap_erosion))
    
    # Foreground (sure foreground)
    fg_mask = cv2.erode(mask, kernel, iterations=1)
    
    # Background (sure background)
    bg_mask = cv2.dilate(255 - mask, kernel, iterations=1)
    
    # Unknown region
    unknown = 255 - fg_mask - bg_mask
    
    # Blend in unknown region
    alpha = mask.astype(np.float32) / 255.0
    alpha[unknown > 0] = 0.5  # Simple blending for unknown regions
    
    return (alpha * 255).astype(np.uint8)
