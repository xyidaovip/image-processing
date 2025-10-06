# AI Service Tests

## Overview

This directory contains comprehensive tests for the AI background removal service.

## Test Coverage

### test_background_removal.py

Tests for the BackgroundRemovalService covering:

1. **Service Initialization Tests**
   - Service initialization and configuration
   - Model loading status

2. **Image Preprocessing Tests**
   - Image preprocessing with different formats (RGB, grayscale, RGBA)
   - Image resizing and normalization
   - Different image sizes (400x300, 1920x1080, 500x500, 1200x800)

3. **Mask Processing Tests**
   - Mask refinement using morphological operations
   - Mask postprocessing and resizing
   - Applying masks to images

4. **Confidence Calculation Tests** (Requirements 2.1, 2.2)
   - Good quality masks (high confidence expected)
   - Poor quality masks (low confidence expected)
   - Fragmented masks (reduced confidence)
   - Edge cases (all black, all white)
   - Foreground ratio impact
   - Edge sharpness impact
   - Mask continuity impact
   - Confidence range validation (always 0.0-1.0)
   - Consistency across identical masks

5. **Background Removal Tests** (Requirements 2.1, 2.2)
   - Simple product images (clear edges)
   - Complex product images (irregular shapes)
   - Small objects (edge case)
   - Large objects filling frame (edge case)
   - Transparent images (RGBA)
   - Fallback method when AI model unavailable

## Running Tests

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
# From project root
python3 -m pytest ai-service/src/tests/test_background_removal.py -v

# Or from ai-service directory
python3 -m pytest src/tests/test_background_removal.py -v
```

### Run Specific Test Class

```bash
python3 -m pytest ai-service/src/tests/test_background_removal.py::TestBackgroundRemovalService -v
python3 -m pytest ai-service/src/tests/test_background_removal.py::TestConfidenceCalculation -v
```

### Run Specific Test

```bash
python3 -m pytest ai-service/src/tests/test_background_removal.py::TestBackgroundRemovalService::test_calculate_confidence_good_mask -v
```

### Run with Coverage

```bash
pip install pytest-cov
python3 -m pytest ai-service/src/tests/test_background_removal.py --cov=src/services --cov-report=html
```

## Test Results

All 23 tests pass successfully:
- ✅ Service initialization and configuration
- ✅ Image preprocessing for different formats
- ✅ Mask refinement and processing
- ✅ Confidence calculation accuracy
- ✅ Background removal for different product types
- ✅ Edge case handling
- ✅ Fallback method functionality

## Test Data

Tests use programmatically generated images to simulate:
- Simple products with clear edges
- Complex products with irregular shapes
- Small objects (< 5% of frame)
- Large objects (> 95% of frame)
- Transparent images
- Various image sizes

This ensures consistent and reproducible test results without requiring external image files.
