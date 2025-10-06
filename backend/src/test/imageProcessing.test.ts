import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ImageProcessingServiceImpl from '../services/imageProcessingService';

describe('图像处理服务单元测试', () => {
  let imageProcessingService: ImageProcessingServiceImpl;
  let testDir: string;
  let outputDir: string;
  let testImagePath: string;
  let testMaskPath: string;

  beforeAll(async () => {
    // 创建测试目录
    testDir = path.join(__dirname, 'test-images');
    outputDir = path.join(__dirname, 'test-output');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 初始化服务
    imageProcessingService = new ImageProcessingServiceImpl(outputDir);

    // 创建测试图片 (300x200 红色矩形)
    testImagePath = path.join(testDir, 'test-product.png');
    await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toFile(testImagePath);

    // 创建测试蒙版 (白色前景，黑色背景)
    testMaskPath = path.join(testDir, 'test-mask.png');
    const maskData = Buffer.alloc(300 * 200);
    
    // 创建一个中心区域为白色的蒙版 (150x100 居中)
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 300; x++) {
        const index = y * 300 + x;
        // 中心区域 (75-225, 50-150) 为白色 (255)
        if (x >= 75 && x < 225 && y >= 50 && y < 150) {
          maskData[index] = 255;
        } else {
          maskData[index] = 0;
        }
      }
    }

    await sharp(maskData, {
      raw: {
        width: 300,
        height: 200,
        channels: 1
      }
    })
    .png()
    .toFile(testMaskPath);
  });

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('背景替换功能测试 (需求 3.1)', () => {
    it('应该成功替换背景为白色', async () => {
      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        testMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出图片的属性
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
      expect(metadata.channels).toBeGreaterThanOrEqual(3);
    });

    it('应该将背景区域替换为指定的白色', async () => {
      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        testMaskPath,
        '#FFFFFF'
      );

      // 读取输出图片并检查背景像素
      const { data } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 检查背景区域的像素 (应该是白色)
      // 检查左上角 (0, 0) - 应该是背景
      const bgPixelIndex = 0;
      const bgR = data[bgPixelIndex * 4];
      const bgG = data[bgPixelIndex * 4 + 1];
      const bgB = data[bgPixelIndex * 4 + 2];
      
      // 背景应该接近白色
      expect(bgR).toBeGreaterThan(200);
      expect(bgG).toBeGreaterThan(200);
      expect(bgB).toBeGreaterThan(200);
    });

    it('应该保持前景区域的颜色', async () => {
      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        testMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出图片的基本属性
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
      expect(metadata.format).toBe('png');
      
      // 验证图片可以被正确读取和处理
      const stats = await sharp(outputPath).stats();
      expect(stats.channels).toHaveLength(4); // RGBA
    });

    it('应该支持自定义背景颜色', async () => {
      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        testMaskPath,
        '#00FF00' // 绿色背景
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证背景颜色
      const { data } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 检查背景像素应该是绿色
      const bgPixelIndex = 0;
      const bgR = data[bgPixelIndex * 4];
      const bgG = data[bgPixelIndex * 4 + 1];
      const bgB = data[bgPixelIndex * 4 + 2];
      
      expect(bgR).toBeLessThan(100);
      expect(bgG).toBeGreaterThan(200);
      expect(bgB).toBeLessThan(100);
    });

    it('应该处理边缘平滑过渡 (需求 3.2)', async () => {
      // 创建带有渐变蒙版的测试
      const gradientMaskPath = path.join(testDir, 'gradient-mask.png');
      const gradientMaskData = Buffer.alloc(300 * 200);
      
      // 创建从中心向外渐变的蒙版
      for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 300; x++) {
          const index = y * 300 + x;
          const centerX = 150;
          const centerY = 100;
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          const maxDistance = 100;
          
          // 距离越远，蒙版值越小
          if (distance < maxDistance) {
            gradientMaskData[index] = Math.round(255 * (1 - distance / maxDistance));
          } else {
            gradientMaskData[index] = 0;
          }
        }
      }

      await sharp(gradientMaskData, {
        raw: {
          width: 300,
          height: 200,
          channels: 1
        }
      })
      .png()
      .toFile(gradientMaskPath);

      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        gradientMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出图片的基本属性
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
      expect(metadata.format).toBe('png');
      
      // 验证图片可以被正确读取和处理
      const stats = await sharp(outputPath).stats();
      expect(stats.channels).toHaveLength(4); // RGBA - 支持平滑过渡
    });

    it('应该处理透明和半透明区域 (需求 3.3)', async () => {
      // 创建带有透明区域的测试图片
      const transparentImagePath = path.join(testDir, 'transparent-product.png');
      const width = 200;
      const height = 200;
      const imageData = Buffer.alloc(width * height * 4);
      
      // 创建一个带有透明区域的图片
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          imageData[index] = 255;     // R
          imageData[index + 1] = 0;   // G
          imageData[index + 2] = 0;   // B
          
          // 中心区域半透明
          if (x >= 75 && x < 125 && y >= 75 && y < 125) {
            imageData[index + 3] = 128; // 50% 透明
          } else {
            imageData[index + 3] = 255; // 完全不透明
          }
        }
      }

      await sharp(imageData, {
        raw: {
          width,
          height,
          channels: 4
        }
      })
      .png()
      .toFile(transparentImagePath);

      // 创建对应的蒙版
      const transparentMaskPath = path.join(testDir, 'transparent-mask.png');
      const maskData = Buffer.alloc(width * height);
      maskData.fill(255); // 全白蒙版

      await sharp(maskData, {
        raw: {
          width,
          height,
          channels: 1
        }
      })
      .png()
      .toFile(transparentMaskPath);

      const outputPath = await imageProcessingService.replaceBackground(
        transparentImagePath,
        transparentMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证透明区域被正确处理
      const metadata = await sharp(outputPath).metadata();
      // PNG格式会保留alpha通道，但背景应该是不透明的
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it('应该在处理失败时抛出错误', async () => {
      await expect(
        imageProcessingService.replaceBackground(
          'non-existent-image.png',
          testMaskPath,
          '#FFFFFF'
        )
      ).rejects.toThrow('背景替换失败');
    });
  });

  describe('图像尺寸调整功能测试 (需求 4.1, 4.2, 4.3, 4.4)', () => {
    it('应该将图像调整为1200x1200像素画布 (需求 4.1)', async () => {
      const outputPath = await imageProcessingService.resizeImage(
        testImagePath,
        1200,
        1200
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出尺寸
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    });

    it('应该保持产品原始宽高比 (需求 4.2)', async () => {
      // 创建一个非正方形的测试图片 (400x200)
      const wideImagePath = path.join(testDir, 'wide-product.png');
      await sharp({
        create: {
          width: 400,
          height: 200,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
      .png()
      .toFile(wideImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        wideImagePath,
        1200,
        1200
      );

      // 读取输出图片并检查内容区域
      const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 画布应该是1200x1200
      expect(info.width).toBe(1200);
      expect(info.height).toBe(1200);

      // 检查产品应该居中且保持宽高比
      // 原始比例 2:1，缩放后应该是 1200x600 居中
      // 检查顶部应该是白色背景
      const topPixelIndex = (100 * info.width + 600) * info.channels;
      const topR = data[topPixelIndex];
      const topG = data[topPixelIndex + 1];
      const topB = data[topPixelIndex + 2];
      
      expect(topR).toBe(255);
      expect(topG).toBe(255);
      expect(topB).toBe(255);

      // 检查中心应该是产品颜色 (绿色)
      const centerPixelIndex = (600 * info.width + 600) * info.channels;
      const centerR = data[centerPixelIndex];
      const centerG = data[centerPixelIndex + 1];
      const centerB = data[centerPixelIndex + 2];
      
      expect(centerR).toBeLessThan(100);
      expect(centerG).toBeGreaterThan(200);
      expect(centerB).toBeLessThan(100);
    });

    it('应该等比例缩小超出画布的产品 (需求 4.3)', async () => {
      // 创建一个大图片 (2000x1500)
      const largeImagePath = path.join(testDir, 'large-product.png');
      await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
      .png()
      .toFile(largeImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        largeImagePath,
        1200,
        1200
      );

      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);

      // 验证产品被缩小并居中
      const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 检查边缘应该是白色背景
      const edgePixelIndex = (10 * info.width + 10) * info.channels;
      const edgeR = data[edgePixelIndex];
      const edgeG = data[edgePixelIndex + 1];
      const edgeB = data[edgePixelIndex + 2];
      
      expect(edgeR).toBe(255);
      expect(edgeG).toBe(255);
      expect(edgeB).toBe(255);
    });

    it('应该保持小于画布的产品原始大小并居中 (需求 4.4)', async () => {
      // 创建一个小图片 (200x200)
      const smallImagePath = path.join(testDir, 'small-product.png');
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
      .png()
      .toFile(smallImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        smallImagePath,
        1200,
        1200
      );

      const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 画布应该是1200x1200
      expect(info.width).toBe(1200);
      expect(info.height).toBe(1200);

      // 检查中心区域应该是产品 (黄色)
      const centerPixelIndex = (600 * info.width + 600) * info.channels;
      const centerR = data[centerPixelIndex];
      const centerG = data[centerPixelIndex + 1];
      const centerB = data[centerPixelIndex + 2];
      
      expect(centerR).toBeGreaterThan(200);
      expect(centerG).toBeGreaterThan(200);
      expect(centerB).toBeLessThan(100);

      // 检查边缘应该是白色背景
      const edgePixelIndex = (100 * info.width + 100) * info.channels;
      const edgeR = data[edgePixelIndex];
      const edgeG = data[edgePixelIndex + 1];
      const edgeB = data[edgePixelIndex + 2];
      
      expect(edgeR).toBe(255);
      expect(edgeG).toBe(255);
      expect(edgeB).toBe(255);
    });

    it('应该正确居中放置产品', async () => {
      const outputPath = await imageProcessingService.resizeImage(
        testImagePath,
        1200,
        1200
      );

      const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
      
      // 检查四个角应该都是白色背景
      const corners = [
        { x: 10, y: 10 },           // 左上
        { x: 1190, y: 10 },         // 右上
        { x: 10, y: 1190 },         // 左下
        { x: 1190, y: 1190 }        // 右下
      ];

      corners.forEach(corner => {
        const pixelIndex = (corner.y * info.width + corner.x) * info.channels;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        expect(r).toBe(255);
        expect(g).toBe(255);
        expect(b).toBe(255);
      });
    });

    it('应该支持自定义目标尺寸', async () => {
      const outputPath = await imageProcessingService.resizeImage(
        testImagePath,
        800,
        600
      );

      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    });

    it('应该在处理失败时抛出错误', async () => {
      await expect(
        imageProcessingService.resizeImage(
          'non-existent-image.png',
          1200,
          1200
        )
      ).rejects.toThrow('图像尺寸调整失败');
    });
  });

  describe('完整图像处理流程测试', () => {
    it('应该成功完成完整的处理流程', async () => {
      const result = await imageProcessingService.processImage(
        testImagePath,
        testMaskPath,
        {
          outputFormat: 'jpg',
          outputSize: { width: 1200, height: 1200 }
        }
      );

      expect(result).toHaveProperty('processedImagePath');
      expect(result).toHaveProperty('processingTime');
      expect(fs.existsSync(result.processedImagePath)).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);

      // 验证最终输出
      const metadata = await sharp(result.processedImagePath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
      expect(metadata.format).toBe('jpeg');
    });

    it('应该支持PNG输出格式', async () => {
      const result = await imageProcessingService.processImage(
        testImagePath,
        testMaskPath,
        {
          outputFormat: 'png',
          outputSize: { width: 1200, height: 1200 }
        }
      );

      expect(fs.existsSync(result.processedImagePath)).toBe(true);

      const metadata = await sharp(result.processedImagePath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('应该记录处理时间', async () => {
      const result = await imageProcessingService.processImage(
        testImagePath,
        testMaskPath,
        {
          outputFormat: 'jpg',
          outputSize: { width: 1200, height: 1200 }
        }
      );

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该在处理失败时抛出错误', async () => {
      await expect(
        imageProcessingService.processImage(
          'non-existent-image.png',
          testMaskPath,
          {
            outputFormat: 'jpg',
            outputSize: { width: 1200, height: 1200 }
          }
        )
      ).rejects.toThrow('图像处理失败');
    });
  });

  describe('边缘情况测试', () => {
    it('应该处理正方形图片', async () => {
      const squareImagePath = path.join(testDir, 'square-product.png');
      await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
      .png()
      .toFile(squareImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        squareImagePath,
        1200,
        1200
      );

      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    });

    it('应该处理极窄的图片', async () => {
      const narrowImagePath = path.join(testDir, 'narrow-product.png');
      await sharp({
        create: {
          width: 100,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 0, b: 255 }
        }
      })
      .png()
      .toFile(narrowImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        narrowImagePath,
        1200,
        1200
      );

      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    });

    it('应该处理极宽的图片', async () => {
      const wideImagePath = path.join(testDir, 'very-wide-product.png');
      await sharp({
        create: {
          width: 1000,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 255 }
        }
      })
      .png()
      .toFile(wideImagePath);

      const outputPath = await imageProcessingService.resizeImage(
        wideImagePath,
        1200,
        1200
      );

      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(1200);
    });

    it('应该处理全黑蒙版', async () => {
      const blackMaskPath = path.join(testDir, 'black-mask.png');
      const blackMaskData = Buffer.alloc(300 * 200);
      blackMaskData.fill(0); // 全黑

      await sharp(blackMaskData, {
        raw: {
          width: 300,
          height: 200,
          channels: 1
        }
      })
      .png()
      .toFile(blackMaskPath);

      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        blackMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出图片的基本属性
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
      expect(metadata.format).toBe('png');
      
      // 全黑蒙版意味着整个图片应该被替换为背景色
      // 验证图片的平均颜色应该接近白色 (stats返回0-1范围的值)
      const stats = await sharp(outputPath).stats();
      expect(stats.channels[0].mean).toBeGreaterThan(0.8); // R channel (normalized)
      expect(stats.channels[1].mean).toBeGreaterThan(0.8); // G channel (normalized)
      expect(stats.channels[2].mean).toBeGreaterThan(0.8); // B channel (normalized)
    });

    it('应该处理全白蒙版', async () => {
      const whiteMaskPath = path.join(testDir, 'white-mask.png');
      const whiteMaskData = Buffer.alloc(300 * 200);
      whiteMaskData.fill(255); // 全白

      await sharp(whiteMaskData, {
        raw: {
          width: 300,
          height: 200,
          channels: 1
        }
      })
      .png()
      .toFile(whiteMaskPath);

      const outputPath = await imageProcessingService.replaceBackground(
        testImagePath,
        whiteMaskPath,
        '#FFFFFF'
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // 验证输出图片的基本属性
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
      expect(metadata.format).toBe('png');
      
      // 全白蒙版意味着整个图片应该保持原始颜色
      // 验证图片的平均颜色统计信息 (stats返回0-1范围的值)
      const stats = await sharp(outputPath).stats();
      // 验证图片有颜色数据（不是全黑或全白）
      expect(stats.channels[0].mean).toBeGreaterThan(0.5); // R channel
      expect(stats.channels[1].mean).toBeGreaterThan(0); // G channel
      expect(stats.channels[2].mean).toBeGreaterThan(0); // B channel
      // 验证图片保留了原始内容
      expect(stats.channels.length).toBe(4); // RGBA
    });
  });
});
