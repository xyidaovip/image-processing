from .image_processing import (
    normalize_image,
    denormalize_image,
    resize_with_aspect_ratio,
    create_smooth_edges,
    extract_largest_component,
    apply_alpha_matting
)

__all__ = [
    "normalize_image",
    "denormalize_image",
    "resize_with_aspect_ratio",
    "create_smooth_edges",
    "extract_largest_component",
    "apply_alpha_matting"
]
