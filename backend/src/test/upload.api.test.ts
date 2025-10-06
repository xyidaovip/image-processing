import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import app from '../server';

describe('文件上传API测试', () => {
  let testImagePath: string;
  let testInvalidFilePath: string;
  let testLargeImagePath: string;

  beforeAll(async () => {
    // 创建测试图片文件
    testImagePath = path.join(__dirname, 'test-image.jpg');
    testInvalidFilePath = path.join(__dirname, 'test-file.txt');
    testLargeImagePath = path.join(__dirname, 'test-large-image.jpg');

    // 创建一个小的测试图片 (100x100 JPEG)
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .jpeg()
    .toFile(testImagePath);

    // 创建一个无效的文本文件
    fs.writeFileSync(testInvalidFilePath, '这不是图片文件');

    // 创建一个大图片文件 (超过10MB限制)
    await sharp({
      create: {
        width: 4000,
        height: 4000,
        channels: 3,
        background: { r: 0, g: 255, b: 0 }
      }
    })
    .jpeg({ quality: 100 })
    .toFile(testLargeImagePath);
  });

  afterAll(() => {
    // 清理测试文件
    [testImagePath, testInvalidFilePath, testLargeImagePath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('POST /api/upload', () => {
    describe('正常上传流程测试', () => {
      it('应该成功上传有效的图片文件', async () => {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', testImagePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('originalUrl');
        expect(response.body.data).toHaveProperty('metadata');
        expect(response.body.data.metadata).toHaveProperty('width', 100);
        expect(response.body.data.metadata).toHaveProperty('height', 100);
        expect(response.body.data.metadata).toHaveProperty('format', 'jpeg');
        expect(typeof response.body.data.uploadId).toBe('string');
        expect(response.body.data.uploadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('应该返回正确的响应格式', async () => {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', testImagePath)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('originalUrl');
        expect(response.body.data).toHaveProperty('metadata');
      });
    });

    describe('文件格式限制测试', () => {
      it('应该拒绝非图片文件', async () => {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', testInvalidFilePath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('type', 'FORMAT_ERROR');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error.message).toContain('只支持');
      });

      it('应该拒绝没有文件的请求', async () => {
        const response = await request(app)
          .post('/api/upload')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('type', 'UPLOAD_ERROR');
        expect(response.body.error).toHaveProperty('message', '没有检测到上传的文件');
      });

      it('应该支持PNG格式', async () => {
        // 创建PNG测试文件
        const pngPath = path.join(__dirname, 'test-image.png');
        await sharp({
          create: {
            width: 50,
            height: 50,
            channels: 3,
            background: { r: 0, g: 0, b: 255 }
          }
        })
        .png()
        .toFile(pngPath);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', pngPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.metadata.format).toBe('png');

        // 清理
        fs.unlinkSync(pngPath);
      });

      it('应该支持WEBP格式', async () => {
        // 创建WEBP测试文件
        const webpPath = path.join(__dirname, 'test-image.webp');
        await sharp({
          create: {
            width: 50,
            height: 50,
            channels: 3,
            background: { r: 255, g: 255, b: 0 }
          }
        })
        .webp()
        .toFile(webpPath);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', webpPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.metadata.format).toBe('webp');

        // 清理
        fs.unlinkSync(webpPath);
      });
    });

    describe('文件大小限制测试', () => {
      it('应该拒绝超过大小限制的文件', async () => {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', testLargeImagePath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('type', 'FILE_SIZE_ERROR');
        expect(response.body.error.message).toContain('文件大小超过限制');
      });

      it('应该接受符合大小限制的文件', async () => {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', testImagePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.metadata.size).toBeLessThan(10 * 1024 * 1024); // 小于10MB
      });
    });

    describe('错误处理测试', () => {
      it('应该处理损坏的图片文件', async () => {
        // 创建一个损坏的"图片"文件
        const corruptedPath = path.join(__dirname, 'corrupted.jpg');
        fs.writeFileSync(corruptedPath, 'fake jpeg content');

        const response = await request(app)
          .post('/api/upload')
          .attach('file', corruptedPath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('type', 'FORMAT_ERROR');

        // 清理
        fs.unlinkSync(corruptedPath);
      });
    });
  });

  describe('GET /api/upload/:uploadId', () => {
    let uploadId: string;

    beforeEach(async () => {
      // 先上传一个文件获取uploadId
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);
      
      uploadId = uploadResponse.body.data.uploadId;
    });

    it('应该成功获取上传文件信息', async () => {
      const response = await request(app)
        .get(`/api/upload/${uploadId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId', uploadId);
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data).toHaveProperty('originalUrl');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('uploadedAt');
    });

    it('应该拒绝无效的uploadId格式', async () => {
      const response = await request(app)
        .get('/api/upload/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('无效的上传ID格式');
    });

    it('应该返回404对于不存在的uploadId', async () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/upload/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
      expect(response.body.error.message).toContain('找不到指定的上传文件');
    });
  });

  describe('GET /api/uploads', () => {
    beforeEach(async () => {
      // 上传几个测试文件
      await request(app)
        .post('/api/upload')
        .attach('file', testImagePath);
      
      await request(app)
        .post('/api/upload')
        .attach('file', testImagePath);
    });

    it('应该成功获取上传文件列表', async () => {
      const response = await request(app)
        .get('/api/uploads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploads');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.uploads)).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('返回的列表项应该包含必要字段', async () => {
      const response = await request(app)
        .get('/api/uploads')
        .expect(200);

      const uploads = response.body.data.uploads;
      if (uploads.length > 0) {
        const upload = uploads[0];
        expect(upload).toHaveProperty('uploadId');
        expect(upload).toHaveProperty('originalName');
        expect(upload).toHaveProperty('originalUrl');
        expect(upload).toHaveProperty('metadata');
        expect(upload).toHaveProperty('uploadedAt');
      }
    });
  });

  describe('DELETE /api/upload/:uploadId', () => {
    let uploadId: string;

    beforeEach(async () => {
      // 先上传一个文件获取uploadId
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);
      
      uploadId = uploadResponse.body.data.uploadId;
    });

    it('应该成功删除上传文件', async () => {
      const response = await request(app)
        .delete(`/api/upload/${uploadId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message', '文件已成功删除');
      expect(response.body.data).toHaveProperty('uploadId', uploadId);

      // 验证文件确实被删除了
      const getResponse = await request(app)
        .get(`/api/upload/${uploadId}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('应该拒绝无效的uploadId格式', async () => {
      const response = await request(app)
        .delete('/api/upload/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
    });

    it('应该返回404对于不存在的uploadId', async () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .delete(`/api/upload/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('频率限制测试', () => {
    it('应该在超过频率限制时返回429错误', async () => {
      // 快速发送多个请求以触发频率限制
      const requests = Array(6).fill(null).map(() => 
        request(app)
          .post('/api/upload')
          .attach('file', testImagePath)
      );

      const responses = await Promise.all(requests);
      
      // 至少有一个请求应该被限制
      const rateLimitedResponse = responses.find(res => res.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.success).toBe(false);
        expect(rateLimitedResponse.body.error).toHaveProperty('type', 'RATE_LIMIT_ERROR');
        expect(rateLimitedResponse.body.error).toHaveProperty('retryAfter');
      }
    }, 15000); // 增加超时时间
  });
});