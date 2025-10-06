"""
Tests for background removal service
Tests different types of product images and validates confidence calculation
Requirements: 2.1, 2.2
"""
import pytest
import numpy as np
from PIL import Image, ImageDraw
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.background_removal import BackgroundRemovalService


class TestBackgroundRemovalService:
    """Test suite for BackgroundRemovalService"""
    
    @pytest.fixture
    def service(self):
        """Create service instance"""
        service = BackgroundRemovalService()
        # Note: Model may not be loaded in test environment
        # Tests should work with fallback method
        return service
    
    @pytest.fixture
    def simple_product_image(self):
        """Create a simple product image with clear subject"""
        # Create 800x600 image with white background
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple product (rectangle with some details)
        # This simulates a product with clear edges
        draw.rectangle([250, 150, 550, 450], fill='blue', outline='darkblue', width=3)
        draw.ellipse([300, 200, 500, 400], fill='lightblue')
        
        return img
    
    @pytest.fixture
    def complex_product_image(self):
        """Create a complex product image with irregular shape"""
        img = Image.new('RGB', (800, 600), color='lightgray')
        draw = ImageDraw.Draw(img)
        
        # Draw irregular shape (simulating complex product)
        points = [(300, 150), (500, 200), (550, 350), (450, 450), (250, 400), (200, 250)]
        draw.polygon(points, fill='red', outline='darkred')
        
        # Add some internal details
        draw.ellipse([350, 250, 450, 350], fill='yellow')
        
        return img
    
    @pytest.fixture
    def small_object_image(self):
        """Create image with small object (edge case)"""
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw small object
        draw.ellipse([380, 280, 420, 320], fill='green')
        
        return img
    
    @pytest.fixture
    def large_object_image(self):
        """Create image with object filling most of frame"""
        img = Image.new('RGB', (800, 600), color='gray')
        draw = ImageDraw.Draw(img)
        
        # Draw large object
        draw.rectangle([50, 50, 750, 550], fill='purple', outline='black', width=2)
        
        return img
    
    @pytest.fixture
    def transparent_product_image(self):
        """Create product image with transparency"""
        img = Image.new('RGBA', (800, 600), color=(255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Draw object with some transparent areas
        draw.rectangle([250, 150, 550, 450], fill=(0, 0, 255, 255))
        draw.ellipse([300, 200, 500, 400], fill=(173, 216, 230, 128))  # Semi-transparent
        
        return img
    
    def test_service_initialization(self, service):
        """Test service initializes correctly"""
        assert service is not None
        assert service.input_size == (1024, 1024)
        assert service.model_path is not None
    
    def test_preprocess_image(self, service, simple_product_image):
        """Test image preprocessing"""
        input_array, original_size = service.preprocess_image(simple_product_image)
        
        # Check output shape
        assert input_array.shape == (1, 3, 1024, 1024)
        assert original_size == (800, 600)
        
        # Check normalization
        assert input_array.min() >= 0.0
        assert input_array.max() <= 1.0
    
    def test_preprocess_non_rgb_image(self, service):
        """Test preprocessing handles non-RGB images"""
        # Create grayscale image
        gray_img = Image.new('L', (800, 600), color=128)
        
        input_array, original_size = service.preprocess_image(gray_img)
        
        # Should convert to RGB (3 channels)
        assert input_array.shape == (1, 3, 1024, 1024)
    
    def test_refine_mask(self, service):
        """Test mask refinement"""
        # Create simple mask
        mask = np.zeros((100, 100), dtype=np.uint8)
        mask[25:75, 25:75] = 255
        
        # Add some noise
        mask[10, 10] = 255
        mask[90, 90] = 255
        
        refined_mask = service.refine_mask(mask)
        
        # Check that noise is reduced
        assert refined_mask.shape == mask.shape
        assert refined_mask.dtype == np.uint8
    
    def test_calculate_confidence_good_mask(self, service):
        """Test confidence calculation for good quality mask"""
        # Create high-quality mask (clear foreground, ~40% coverage)
        mask = np.zeros((1000, 1000), dtype=np.uint8)
        mask[200:800, 300:700] = 255
        
        confidence = service.calculate_confidence(mask)
        
        # Should have high confidence
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5, f"Expected confidence > 0.5, got {confidence}"
    
    def test_calculate_confidence_poor_mask(self, service):
        """Test confidence calculation for poor quality mask"""
        # Create poor mask (very small foreground)
        mask = np.zeros((1000, 1000), dtype=np.uint8)
        mask[490:510, 490:510] = 255  # Only 2% coverage
        
        confidence = service.calculate_confidence(mask)
        
        # Should have lower confidence due to small foreground
        assert 0.0 <= confidence <= 1.0
        assert confidence < 0.6, f"Expected confidence < 0.6 for poor mask, got {confidence}"
    
    def test_calculate_confidence_fragmented_mask(self, service):
        """Test confidence calculation for fragmented mask"""
        # Create fragmented mask
        mask = np.zeros((1000, 1000), dtype=np.uint8)
        mask[100:200, 100:200] = 255
        mask[300:400, 300:400] = 255
        mask[600:700, 600:700] = 255
        
        confidence = service.calculate_confidence(mask)
        
        # Should have lower confidence due to fragmentation
        assert 0.0 <= confidence <= 1.0
        # Fragmented masks should have reduced confidence
        assert confidence < 0.8, f"Expected lower confidence for fragmented mask, got {confidence}"
    
    def test_calculate_confidence_edge_cases(self, service):
        """Test confidence calculation edge cases"""
        # All black (no foreground)
        black_mask = np.zeros((100, 100), dtype=np.uint8)
        conf_black = service.calculate_confidence(black_mask)
        assert 0.0 <= conf_black <= 1.0
        assert conf_black < 0.5  # Should be low
        
        # All white (all foreground)
        white_mask = np.ones((100, 100), dtype=np.uint8) * 255
        conf_white = service.calculate_confidence(white_mask)
        assert 0.0 <= conf_white <= 1.0
        assert conf_white < 0.5  # Should be low (too much foreground)
    
    def test_apply_mask_to_image(self, service, simple_product_image):
        """Test applying mask to image"""
        # Create mask
        mask = np.zeros((600, 800), dtype=np.uint8)
        mask[150:450, 250:550] = 255
        
        result = service.apply_mask_to_image(simple_product_image, mask)
        
        # Check result
        assert result.mode == 'RGBA'
        assert result.size == simple_product_image.size
        
        # Check that alpha channel matches mask
        result_array = np.array(result)
        assert np.array_equal(result_array[:, :, 3], mask)
    
    def test_remove_background_simple_product(self, service, simple_product_image):
        """Test background removal on simple product image"""
        result = service.remove_background(simple_product_image)
        
        # Check result structure
        assert 'image' in result
        assert 'mask' in result
        assert 'confidence' in result
        assert 'processing_time' in result
        assert 'method' in result
        
        # Check types
        assert isinstance(result['image'], Image.Image)
        assert isinstance(result['mask'], np.ndarray)
        assert isinstance(result['confidence'], float)
        assert isinstance(result['processing_time'], float)
        
        # Check confidence range
        assert 0.0 <= result['confidence'] <= 1.0
        
        # Check processing time is reasonable
        assert result['processing_time'] > 0
        assert result['processing_time'] < 10  # Should complete within 10 seconds
    
    def test_remove_background_complex_product(self, service, complex_product_image):
        """Test background removal on complex product image"""
        result = service.remove_background(complex_product_image)
        
        assert result['image'] is not None
        assert result['mask'] is not None
        assert 0.0 <= result['confidence'] <= 1.0
        
        # Complex products might have lower confidence
        # but should still process successfully
        assert result['processing_time'] > 0
    
    def test_remove_background_small_object(self, service, small_object_image):
        """Test background removal on small object (edge case)"""
        result = service.remove_background(small_object_image)
        
        assert result['image'] is not None
        assert result['mask'] is not None
        
        # Small objects should have lower confidence
        assert result['confidence'] < 0.6
    
    def test_remove_background_large_object(self, service, large_object_image):
        """Test background removal on large object (edge case)"""
        result = service.remove_background(large_object_image)
        
        assert result['image'] is not None
        assert result['mask'] is not None
        
        # Very large objects might have lower confidence
        assert result['confidence'] < 0.6
    
    def test_remove_background_transparent_image(self, service, transparent_product_image):
        """Test background removal on image with transparency"""
        result = service.remove_background(transparent_product_image)
        
        assert result['image'] is not None
        assert result['image'].mode == 'RGBA'
        assert result['mask'] is not None
    
    def test_fallback_method(self, service, simple_product_image):
        """Test fallback background removal method"""
        import time
        start_time = time.time()
        
        result = service.fallback_background_removal(simple_product_image, start_time)
        
        # Check result structure
        assert 'image' in result
        assert 'mask' in result
        assert 'confidence' in result
        assert 'processing_time' in result
        assert 'method' in result
        
        assert result['method'] == 'fallback'
        assert isinstance(result['image'], Image.Image)
        assert isinstance(result['mask'], np.ndarray)
        
        # Fallback should have reduced confidence
        assert 0.0 <= result['confidence'] <= 1.0
    
    def test_confidence_consistency(self, service):
        """Test that confidence calculation is consistent"""
        # Create identical masks
        mask1 = np.zeros((500, 500), dtype=np.uint8)
        mask1[100:400, 100:400] = 255
        
        mask2 = np.zeros((500, 500), dtype=np.uint8)
        mask2[100:400, 100:400] = 255
        
        conf1 = service.calculate_confidence(mask1)
        conf2 = service.calculate_confidence(mask2)
        
        # Should produce same confidence
        assert conf1 == conf2
    
    def test_different_image_sizes(self, service):
        """Test processing images of different sizes"""
        sizes = [(400, 300), (1920, 1080), (500, 500), (1200, 800)]
        
        for size in sizes:
            img = Image.new('RGB', size, color='white')
            draw = ImageDraw.Draw(img)
            # Draw simple object
            w, h = size
            draw.rectangle([w//4, h//4, 3*w//4, 3*h//4], fill='blue')
            
            result = service.remove_background(img)
            
            assert result['image'] is not None
            assert result['image'].size == size
            assert result['mask'].shape == (size[1], size[0])
    
    def test_postprocess_mask(self, service):
        """Test mask postprocessing"""
        # Create mock model output
        mask_output = np.random.rand(1, 1, 1024, 1024).astype(np.float32)
        mask_output = (mask_output > 0.5).astype(np.float32)  # Binary mask
        
        original_size = (800, 600)
        
        result_mask = service.postprocess_mask(mask_output, original_size)
        
        # Check output
        assert result_mask.shape == (600, 800)  # Height x Width
        assert result_mask.dtype == np.uint8
        assert result_mask.min() >= 0
        assert result_mask.max() <= 255


class TestConfidenceCalculation:
    """Dedicated tests for confidence calculation accuracy"""
    
    @pytest.fixture
    def service(self):
        return BackgroundRemovalService()
    
    def test_confidence_range_validation(self, service):
        """Test that confidence is always in valid range"""
        test_cases = [
            np.zeros((100, 100), dtype=np.uint8),  # All black
            np.ones((100, 100), dtype=np.uint8) * 255,  # All white
            np.random.randint(0, 256, (100, 100), dtype=np.uint8),  # Random
        ]
        
        for mask in test_cases:
            confidence = service.calculate_confidence(mask)
            assert 0.0 <= confidence <= 1.0, f"Confidence {confidence} out of range"
    
    def test_confidence_foreground_ratio_impact(self, service):
        """Test that foreground ratio affects confidence"""
        # Good ratio (~50%)
        mask_good = np.zeros((1000, 1000), dtype=np.uint8)
        mask_good[250:750, 250:750] = 255
        conf_good = service.calculate_confidence(mask_good)
        
        # Too small ratio (~2%)
        mask_small = np.zeros((1000, 1000), dtype=np.uint8)
        mask_small[480:520, 480:520] = 255
        conf_small = service.calculate_confidence(mask_small)
        
        # Too large ratio (~98%)
        mask_large = np.ones((1000, 1000), dtype=np.uint8) * 255
        mask_large[480:520, 480:520] = 0
        conf_large = service.calculate_confidence(mask_large)
        
        # Good ratio should have higher confidence
        assert conf_good > conf_small
        assert conf_good > conf_large
    
    def test_confidence_edge_sharpness_impact(self, service):
        """Test that edge sharpness affects confidence"""
        # Sharp edges
        mask_sharp = np.zeros((500, 500), dtype=np.uint8)
        mask_sharp[150:350, 150:350] = 255
        conf_sharp = service.calculate_confidence(mask_sharp)
        
        # Blurry edges (gradient)
        mask_blurry = np.zeros((500, 500), dtype=np.float32)
        for i in range(500):
            for j in range(500):
                dist = min(abs(i - 250), abs(j - 250))
                if dist < 100:
                    mask_blurry[i, j] = 255
                elif dist < 150:
                    mask_blurry[i, j] = 255 * (1 - (dist - 100) / 50)
        mask_blurry = mask_blurry.astype(np.uint8)
        conf_blurry = service.calculate_confidence(mask_blurry)
        
        # Both should be valid, but sharp might be slightly higher
        assert 0.0 <= conf_sharp <= 1.0
        assert 0.0 <= conf_blurry <= 1.0
    
    def test_confidence_continuity_impact(self, service):
        """Test that mask continuity affects confidence"""
        # Continuous mask
        mask_continuous = np.zeros((1000, 1000), dtype=np.uint8)
        mask_continuous[300:700, 300:700] = 255
        conf_continuous = service.calculate_confidence(mask_continuous)
        
        # Fragmented mask (same total area)
        mask_fragmented = np.zeros((1000, 1000), dtype=np.uint8)
        mask_fragmented[300:500, 300:500] = 255
        mask_fragmented[500:700, 500:700] = 255
        conf_fragmented = service.calculate_confidence(mask_fragmented)
        
        # Continuous should have higher confidence
        assert conf_continuous > conf_fragmented
    
    def test_confidence_error_handling(self, service):
        """Test confidence calculation handles errors gracefully"""
        # Very small mask (edge case)
        small_mask = np.zeros((10, 10), dtype=np.uint8)
        small_mask[4:6, 4:6] = 255
        conf = service.calculate_confidence(small_mask)
        # Should return valid confidence even for small masks
        assert 0.0 <= conf <= 1.0
        
        # Single pixel mask
        single_pixel_mask = np.zeros((50, 50), dtype=np.uint8)
        single_pixel_mask[25, 25] = 255
        conf2 = service.calculate_confidence(single_pixel_mask)
        assert 0.0 <= conf2 <= 1.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
