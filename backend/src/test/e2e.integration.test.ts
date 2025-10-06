import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import app from '../server';

describe('端到端集成测试 - 完整图片处理流程', () => {
  let testImagePath: string;
  let complexImagePath: string;

  beforeAll(async () => {
    // 创建测试图片
    testImagePath = path.join(__dirname, 'e2e-test-image.jpg');
    complexImagePath = path.join(__dirname, 'e2e-complex-image.png');

    // 创建简单测试图片
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 100, b: 50 }
      }
    })
    .jpeg()
    .toFile(testImagePath);

    // 创建复杂测试图片（带透明度）
    await sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 0.8 }
      }
    })
    .png()
    .toFile(complexImagePath);
  });

  afterAll(() => {
    // 清理测试文件
    [testImagePath, complexImagePath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('完整处理流程测试', () => {
    it('应该完成从上传到处理的完整流程', async () => {
      // 步骤1: 上传图片
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      expect(uploadResponse.body.success).toBe(true);
      const uploadId = uploadResponse.body.data.uploadId;
      expect(uploadId).toBeDefined();

      // 步骤2: 开始处理
      const processResponse = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(200);

      expect(processResponse.body.success).toBe(true);
      const processId = processResponse.body.data.processId;
      expect(processId).toBeDefined();

      // 步骤3: 轮询处理状态
      let statusResponse;
      let attempts = 0;
      const maxAttempts = 30;

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await request(app)
          .get(`/api/process/status/${processId}`)
          .expect(200);

        attempts++;
      } while (
        statusResponse.body.data.status === 'processing' && 
        attempts < maxAttempts
      );

      // 步骤4: 验证处理完成
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.status).toBe('completed');
      expect(statusResponse.body.data).toHaveProperty('processedUrl');
      expect(statusResponse.body.data).toHaveProperty('processingTime');
      expect(statusResponse.body.data.processingTime).toBeGreaterThan(0);

      // 步骤5: 验证处理后的图片
      const processedUrl = statusResponse.body.data.processedUrl;
      expect(processedUrl).toContain('_processed');

      // 验证文件存在
      const processedPath = path.join(__dirname, '../../', processedUrl);
      expect(fs.existsSync(processedPath)).toBe(true);

      // 验证图片尺寸
      const metadata = await sharp(processedPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    }, 60000);

    it('应该正确处理PNG格式图片', async () => {
      // 上传PNG图片
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', complexImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      // 处理图片
      const processResponse = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(200);

      const processId = processResponse.body.data.processId;

      // 等待处理完成
      let statusResponse;
      let attempts = 0;

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await request(app)
          .get(`/api/process/status/${processId}`)
          .expect(200);
        attempts++;
      } while (
        statusResponse.body.data.status === 'processing' && 
        attempts < 30
      );

      expect(statusResponse.body.data.status).toBe('completed');
    }, 60000);
  });

  describe('错误恢复机制测试', () => {
    it('应该处理无效的uploadId', async () => {
      const response = await request(app)
        .post('/api/process')
        .send({
          uploadId: '12345678-1234-1234-1234-123456789012',
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type');
    });

    it('应该处理无效的处理选项', async () => {
      // 先上传图片
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      // 使用无效的输出尺寸
      const response = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: -100,
              height: 1200
            }
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
    });

    it('应该处理不存在的processId查询', async () => {
      const fakeProcessId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/process/status/${fakeProcessId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });
  });

  describe('并发处理测试', () => {
    it('应该能够处理多个并发请求', async () => {
      // 上传多个图片
      const uploadPromises = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/upload')
          .attach('file', testImagePath)
      );

      const uploadResponses = await Promise.all(uploadPromises);
      const uploadIds = uploadResponses.map(res => res.body.data.uploadId);

      // 同时开始处理
      const processPromises = uploadIds.map(uploadId =>
        request(app)
          .post('/api/process')
          .send({
            uploadId,
            options: {
              outputFormat: 'jpg',
              outputSize: {
                width: 1200,
                height: 1200
              }
            }
          })
      );

      const processResponses = await Promise.all(processPromises);

      // 验证所有请求都成功
      processResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('processId');
      });
    }, 60000);
  });

  describe('系统行为验证', () => {
    it('应该保持原始图片宽高比', async () => {
      // 上传非正方形图片
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      // 处理图片
      const processResponse = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(200);

      const processId = processResponse.body.data.processId;

      // 等待处理完成
      let statusResponse;
      let attempts = 0;

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await request(app)
          .get(`/api/process/status/${processId}`)
          .expect(200);
        attempts++;
      } while (
        statusResponse.body.data.status === 'processing' && 
        attempts < 30
      );

      // 验证输出是1200x1200的画布
      const processedUrl = statusResponse.body.data.processedUrl;
      const processedPath = path.join(__dirname, '../../', processedUrl);
      const metadata = await sharp(processedPath).metadata();

      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    }, 60000);

    it('应该生成白色背景', async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      const processResponse = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(200);

      const processId = processResponse.body.data.processId;

      // 等待处理完成
      let statusResponse;
      let attempts = 0;

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await request(app)
          .get(`/api/process/status/${processId}`)
          .expect(200);
        attempts++;
      } while (
        statusResponse.body.data.status === 'processing' && 
        attempts < 30
      );

      // 验证处理完成
      expect(statusResponse.body.data.status).toBe('completed');
      
      // 验证文件存在且可读取
      const processedUrl = statusResponse.body.data.processedUrl;
      const processedPath = path.join(__dirname, '../../', processedUrl);
      expect(fs.existsSync(processedPath)).toBe(true);
    }, 60000);
  });

  describe('性能监控测试', () => {
    it('应该记录处理时间', async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      const processResponse = await request(app)
        .post('/api/process')
        .send({
          uploadId,
          options: {
            outputFormat: 'jpg',
            outputSize: {
              width: 1200,
              height: 1200
            }
          }
        })
        .expect(200);

      const processId = processResponse.body.data.processId;

      // 等待处理完成
      let statusResponse;
      let attempts = 0;

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await request(app)
          .get(`/api/process/status/${processId}`)
          .expect(200);
        attempts++;
      } while (
        statusResponse.body.data.status === 'processing' && 
        attempts < 30
      );

      // 验证性能指标
      expect(statusResponse.body.data).toHaveProperty('processingTime');
      expect(statusResponse.body.data.processingTime).toBeGreaterThan(0);
      expect(statusResponse.body.data.processingTime).toBeLessThan(30000); // 应该在30秒内完成
    }, 60000);

    it('应该提供性能统计信息', async () => {
      const response = await request(app)
        .get('/api/performance/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProcessed');
      expect(response.body.data).toHaveProperty('averageProcessingTime');
      expect(response.body.data).toHaveProperty('successRate');
    });
  });

  describe('清理和资源管理测试', () => {
    it('应该能够删除处理后的文件', async () => {
      // 上传并处理图片
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect(200);

      const uploadId = uploadResponse.body.data.uploadId;

      // 删除上传的文件
      const deleteResponse = await request(app)
        .delete(`/api/upload/${uploadId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 验证文件已被删除
      const getResponse = await request(app)
        .get(`/api/upload/${uploadId}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });
  });
});
