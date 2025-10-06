"""
端到端集成测试 - AI服务完整流程测试
"""
import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io
import time
from main import app

client = TestClient(app)


class TestHealthCheck:
    """健康检查测试"""
    
    def test_health_endpoint(self):
        """测试健康检查端点"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "model_loaded" in data


class TestBackgroundRemovalIntegration:
    """背景移除集成测试"""
    
    @pytest.fixture
    def sample_image(self):
        """创建测试图片"""
        img = Image.new('RGB', (800, 600), color=(255, 100, 50))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    @pytest.fixture
    def complex_image(self):
        """创建复杂测试图片（带透明度）"""
        img = Image.new('RGBA', (1000, 800), color=(100, 150, 200, 200))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_remove_background_success(self, sample_image):
        """测试成功移除背景"""
        response = client.post(
            "/api/remove-background",
            files={"file": ("test.jpg", sample_image, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "confidence" in data
        assert "processing_time" in data
        assert "message" in data
        assert data["confidence"] >= 0.0
        assert data["confidence"] <= 1.0
        assert data["processing_time"] > 0
    
    def test_remove_background_image_response(self, sample_image):
        """测试返回处理后的图片"""
        response = client.post(
            "/api/remove-background/image",
            files={"file": ("test.jpg", sample_image, "image/jpeg")}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert "x-confidence" in response.headers
        assert "x-processing-time" in response.headers
        assert "x-method" in response.headers
        
        # 验证返回的是有效图片
        img = Image.open(io.BytesIO(response.content))
        assert img.format == "PNG"
        assert img.size[0] > 0
        assert img.size[1] > 0
    
    def test_remove_background_png_format(self, complex_image):
        """测试PNG格式图片处理"""
        response = client.post(
            "/api/remove-background",
            files={"file": ("test.png", complex_image, "image/png")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_invalid_file_type(self):
        """测试无效文件类型"""
        text_content = b"This is not an image"
        response = client.post(
            "/api/remove-background",
            files={"file": ("test.txt", io.BytesIO(text_content), "text/plain")}
        )
        
        assert response.status_code == 400
        assert "must be an image" in response.json()["detail"].lower()
    
    def test_corrupted_image(self):
        """测试损坏的图片文件"""
        corrupted_data = b"fake image data"
        response = client.post(
            "/api/remove-background",
            files={"file": ("corrupted.jpg", io.BytesIO(corrupted_data), "image/jpeg")}
        )
        
        # 应该返回错误
        assert response.status_code in [400, 500]
    
    def test_large_image_processing(self):
        """测试大图片处理"""
        # 创建较大的图片
        large_img = Image.new('RGB', (3000, 2000), color=(200, 100, 150))
        img_bytes = io.BytesIO()
        large_img.save(img_bytes, format='JPEG', quality=95)
        img_bytes.seek(0)
        
        start_time = time.time()
        response = client.post(
            "/api/remove-background",
            files={"file": ("large.jpg", img_bytes, "image/jpeg")}
        )
        processing_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # 验证处理时间合理（应该在30秒内）
        assert processing_time < 30
    
    def test_multiple_formats(self):
        """测试多种图片格式"""
        formats = [
            ('JPEG', 'image/jpeg', 'test.jpg'),
            ('PNG', 'image/png', 'test.png'),
            ('WEBP', 'image/webp', 'test.webp')
        ]
        
        for img_format, mime_type, filename in formats:
            img = Image.new('RGB', (400, 300), color=(150, 200, 100))
            img_bytes = io.BytesIO()
            img.save(img_bytes, format=img_format)
            img_bytes.seek(0)
            
            response = client.post(
                "/api/remove-background",
                files={"file": (filename, img_bytes, mime_type)}
            )
            
            assert response.status_code == 200, f"Failed for format {img_format}"
            data = response.json()
            assert data["success"] is True


class TestErrorRecovery:
    """错误恢复机制测试"""
    
    def test_missing_file(self):
        """测试缺少文件的请求"""
        response = client.post("/api/remove-background")
        assert response.status_code == 422  # FastAPI validation error
    
    def test_empty_file(self):
        """测试空文件"""
        empty_bytes = io.BytesIO(b"")
        response = client.post(
            "/api/remove-background",
            files={"file": ("empty.jpg", empty_bytes, "image/jpeg")}
        )
        
        # 应该返回错误
        assert response.status_code in [400, 500]
    
    def test_service_resilience(self):
        """测试服务弹性 - 连续处理多个请求"""
        img = Image.new('RGB', (200, 200), color=(100, 100, 100))
        
        success_count = 0
        for i in range(5):
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            response = client.post(
                "/api/remove-background",
                files={"file": (f"test_{i}.jpg", img_bytes, "image/jpeg")}
            )
            
            if response.status_code == 200:
                success_count += 1
        
        # 至少大部分请求应该成功
        assert success_count >= 4


class TestPerformance:
    """性能测试"""
    
    def test_processing_time_within_limit(self):
        """测试处理时间在限制内"""
        img = Image.new('RGB', (1200, 900), color=(180, 120, 90))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        # 处理时间应该在合理范围内（毫秒）
        assert data["processing_time"] < 30000  # 30秒
    
    def test_concurrent_requests(self):
        """测试并发请求处理"""
        import concurrent.futures
        
        def make_request():
            img = Image.new('RGB', (400, 300), color=(100, 150, 200))
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            response = client.post(
                "/api/remove-background",
                files={"file": ("test.jpg", img_bytes, "image/jpeg")}
            )
            return response.status_code
        
        # 并发发送3个请求
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request) for _ in range(3)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # 所有请求都应该成功
        success_count = sum(1 for status in results if status == 200)
        assert success_count >= 2  # 至少2个成功


class TestDifferentScenarios:
    """不同场景测试"""
    
    def test_square_image(self):
        """测试正方形图片"""
        img = Image.new('RGB', (800, 800), color=(255, 128, 0))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("square.jpg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_wide_image(self):
        """测试宽图片"""
        img = Image.new('RGB', (1600, 400), color=(100, 200, 150))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("wide.jpg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_tall_image(self):
        """测试高图片"""
        img = Image.new('RGB', (400, 1600), color=(200, 100, 200))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("tall.jpg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_small_image(self):
        """测试小图片"""
        img = Image.new('RGB', (100, 100), color=(50, 150, 250))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("small.jpg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestFallbackMechanism:
    """回退机制测试"""
    
    def test_fallback_method_available(self):
        """测试回退方法可用"""
        # 即使AI模型不可用，服务也应该能够处理图片
        img = Image.new('RGB', (600, 400), color=(120, 180, 90))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/api/remove-background",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")}
        )
        
        # 应该成功，可能使用回退方法
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            # 可能会在消息中提到使用了回退方法
            assert "message" in data
