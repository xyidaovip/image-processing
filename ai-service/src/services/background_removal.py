import numpy as np
from PIL import Image
import onnxruntime as ort
import time
import os
from typing import Dict, Tuple
import cv2

class BackgroundRemovalService:
    def __init__(self):
        self.session = None
        self.model_path = os.getenv("MODEL_PATH", "models/rmbg-1.4.onnx")
        self.input_size = (1024, 1024)
        self.is_warmed_up = False
        self.max_image_size = 4096  # Maximum dimension for preprocessing optimization
        
    def is_model_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.session is not None
    
    def load_model(self):
        """Load ONNX model with optimizations"""
        try:
            if not os.path.exists(self.model_path):
                print(f"Warning: Model not found at {self.model_path}")
                print("Please download RMBG-1.4 model and place it in the models directory")
                return
            
            # Configure session options for performance
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = os.cpu_count() or 4
            sess_options.inter_op_num_threads = 1
            
            # Enable memory pattern optimization
            sess_options.enable_mem_pattern = True
            sess_options.enable_cpu_mem_arena = True
            
            # Create ONNX Runtime session with optimizations
            self.session = ort.InferenceSession(
                self.model_path,
                sess_options=sess_options,
                providers=['CPUExecutionProvider']
            )
            print(f"Model loaded successfully from {self.model_path}")
            
            # Warm up the model
            self.warmup_model()
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def warmup_model(self):
        """Warm up model with dummy inference to optimize first-run performance"""
        if not self.is_model_loaded() or self.is_warmed_up:
            return
        
        try:
            print("Warming up model...")
            # Create dummy input
            dummy_input = np.random.rand(1, 3, *self.input_size).astype(np.float32)
            input_name = self.session.get_inputs()[0].name
            output_name = self.session.get_outputs()[0].name
            
            # Run dummy inference
            _ = self.session.run([output_name], {input_name: dummy_input})
            
            self.is_warmed_up = True
            print("Model warmup complete")
        except Exception as e:
            print(f"Warning: Model warmup failed: {e}")
    
    def preprocess_image(self, image: Image.Image) -> Tuple[np.ndarray, Tuple[int, int], bool]:
        """Preprocess image for model input with optimization"""
        # Store original size
        original_size = image.size
        was_downsampled = False
        
        # Optimize: Downsample very large images before processing
        if max(original_size) > self.max_image_size:
            scale = self.max_image_size / max(original_size)
            new_size = (int(original_size[0] * scale), int(original_size[1] * scale))
            image = image.resize(new_size, Image.LANCZOS)
            was_downsampled = True
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize to model input size using faster method for large images
        if max(image.size) > self.input_size[0] * 2:
            # Two-step resize for better performance on large images
            intermediate_size = (self.input_size[0] * 2, self.input_size[1] * 2)
            image = image.resize(intermediate_size, Image.BILINEAR)
            image_resized = image.resize(self.input_size, Image.LANCZOS)
        else:
            image_resized = image.resize(self.input_size, Image.LANCZOS)
        
        # Convert to numpy array and normalize (optimized)
        img_array = np.array(image_resized, dtype=np.float32)
        
        # Normalize to [0, 1] in-place
        img_array *= (1.0 / 255.0)
        
        # Transpose to CHW format (channels first)
        img_array = np.transpose(img_array, (2, 0, 1))
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array, original_size, was_downsampled
    
    def postprocess_mask(self, mask: np.ndarray, original_size: Tuple[int, int]) -> np.ndarray:
        """Postprocess model output mask"""
        # Remove batch dimension
        mask = mask.squeeze()
        
        # Ensure mask is 2D
        if len(mask.shape) == 3:
            mask = mask[0]
        
        # Convert to uint8
        mask = (mask * 255).astype(np.uint8)
        
        # Apply morphological operations to refine mask
        mask = self.refine_mask(mask)
        
        # Resize to original size
        mask_resized = cv2.resize(mask, original_size, interpolation=cv2.INTER_LINEAR)
        
        return mask_resized
    
    def refine_mask(self, mask: np.ndarray) -> np.ndarray:
        """Refine mask using morphological operations"""
        # Apply slight blur to smooth edges
        mask = cv2.GaussianBlur(mask, (3, 3), 0)
        
        # Apply morphological closing to fill small holes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Apply morphological opening to remove small noise
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_small)
        
        return mask
    
    def apply_mask_to_image(self, image: Image.Image, mask: np.ndarray) -> Image.Image:
        """Apply mask to image to remove background"""
        # Convert image to RGBA
        if image.mode != "RGBA":
            image = image.convert("RGBA")
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Apply mask to alpha channel
        img_array[:, :, 3] = mask
        
        # Convert back to PIL Image
        result = Image.fromarray(img_array, mode="RGBA")
        
        return result
    
    def calculate_confidence(self, mask: np.ndarray) -> float:
        """Calculate confidence score based on mask quality"""
        try:
            # Normalize mask to [0, 1]
            mask_normalized = mask.astype(np.float32) / 255.0
            
            # Metric 1: Foreground ratio (should be reasonable, not too small or too large)
            foreground_ratio = np.mean(mask_normalized > 0.5)
            
            # Penalize if foreground is too small (<5%) or too large (>95%)
            if foreground_ratio < 0.05 or foreground_ratio > 0.95:
                ratio_score = 0.3
            else:
                ratio_score = 1.0
            
            # Metric 2: Edge sharpness (higher std indicates better defined edges)
            edge_sharpness = np.std(mask_normalized)
            sharpness_score = min(1.0, edge_sharpness * 3)
            
            # Metric 3: Mask continuity (check for fragmentation)
            binary_mask = (mask > 127).astype(np.uint8)
            num_labels, _, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
            
            if num_labels > 1:
                # Get area of largest component
                largest_area = np.max(stats[1:, cv2.CC_STAT_AREA]) if num_labels > 1 else 0
                total_foreground = np.sum(binary_mask > 0)
                continuity_score = largest_area / total_foreground if total_foreground > 0 else 0
            else:
                continuity_score = 1.0
            
            # Combine metrics with weights
            confidence = (
                ratio_score * 0.3 +
                sharpness_score * 0.4 +
                continuity_score * 0.3
            )
            
            # Ensure confidence is in [0, 1] range
            confidence = max(0.0, min(1.0, confidence))
            
            return float(confidence)
        except Exception as e:
            print(f"Error calculating confidence: {e}")
            return 0.5  # Return neutral confidence on error
    
    def remove_background(self, image: Image.Image) -> Dict:
        """Remove background from image with error handling and fallback"""
        start_time = time.time()
        
        if not self.is_model_loaded():
            # Try fallback method if model not loaded
            print("Model not loaded, using fallback method")
            return self.fallback_background_removal(image, start_time)
        
        try:
            # Preprocess with optimization
            input_array, original_size, was_downsampled = self.preprocess_image(image)
            
            # Run inference
            input_name = self.session.get_inputs()[0].name
            output_name = self.session.get_outputs()[0].name
            
            mask_output = self.session.run([output_name], {input_name: input_array})[0]
            
            # Postprocess
            mask = self.postprocess_mask(mask_output, original_size)
            
            # Apply mask to original image
            result_image = self.apply_mask_to_image(image, mask)
            
            # Calculate confidence
            confidence = self.calculate_confidence(mask)
            
            processing_time = time.time() - start_time
            
            # If confidence is too low, try fallback
            if confidence < 0.3:
                print(f"Low confidence ({confidence:.2f}), trying fallback method")
                return self.fallback_background_removal(image, start_time)
            
            return {
                "image": result_image,
                "mask": mask,
                "confidence": confidence,
                "processing_time": processing_time,
                "method": "ai_model",
                "was_downsampled": was_downsampled
            }
        except Exception as e:
            print(f"AI model inference failed: {e}")
            # Fall back to simple edge detection
            return self.fallback_background_removal(image, start_time)
        finally:
            # Explicit garbage collection for large images
            if hasattr(image, 'size') and max(image.size) > 2048:
                import gc
                gc.collect()
    
    def fallback_background_removal(self, image: Image.Image, start_time: float) -> Dict:
        """Fallback background removal using traditional computer vision"""
        try:
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply GaussianBlur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Use adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Create mask from largest contour
            mask = np.zeros(gray.shape, dtype=np.uint8)
            if contours:
                largest_contour = max(contours, key=cv2.contourArea)
                cv2.drawContours(mask, [largest_contour], -1, 255, -1)
            
            # Refine mask
            mask = self.refine_mask(mask)
            
            # Apply mask to image
            result_image = self.apply_mask_to_image(image, mask)
            
            # Calculate confidence (will be lower for fallback)
            confidence = self.calculate_confidence(mask) * 0.6  # Reduce confidence for fallback
            
            processing_time = time.time() - start_time
            
            return {
                "image": result_image,
                "mask": mask,
                "confidence": confidence,
                "processing_time": processing_time,
                "method": "fallback"
            }
        except Exception as e:
            raise RuntimeError(f"Fallback background removal failed: {str(e)}")
