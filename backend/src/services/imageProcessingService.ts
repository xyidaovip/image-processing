import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageProcessingService } from '../types/services';

/**
 * 图像处理服务
 * 实现背景替换和图像尺寸标准化功能
 */
class ImageProcessingServiceImpl implements ImageProcessingService {
  private readonly outputDir: string;
  private readonly maxImageDimension: number = 4096; // Maximum dimension for optimization

  constructor(outputDir: string = 'uploads/processed') {
    this.outputDir = outputDir;
  }

  /**
   * 替换图像背景为白色
   * 需求: 3.1, 3.2, 3.3
   * 
   * @param imagePath - 原始图像路径
   * @param maskPath - 蒙版图像路径
   * @param backgroundColor - 背景颜色 (默认白色 #FFFFFF)
   * @returns 处理后的图像路径
   */
  async replaceBackground(
    imagePath: string,
    maskPath: string,
    backgroundColor: string = '#FFFFFF'
  ): Promise<string> {
    try {
      // 优化: 先检查图像尺寸，如果太大则先压缩
      const metadata = await sharp(imagePath).metadata();
      const needsDownsampling = metadata.width && metadata.height && 
        (metadata.width > this.maxImageDimension || metadata.height > this.maxImageDimension);

      let imageProcessor = sharp(imagePath);
      if (needsDownsampling) {
        const scale = this.maxImageDimension / Math.max(metadata.width!, metadata.height!);
        imageProcessor = imageProcessor.resize(
          Math.round(metadata.width! * scale),
          Math.round(metadata.height! * scale),
          { fit: 'inside' }
        );
      }

      // 读取原始图像和蒙版
      const [originalImage, maskImage] = await Promise.all([
        imageProcessor.ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(maskPath).greyscale().toBuffer()
      ]);

      const { data: imageData, info: imageInfo } = originalImage;
      const { width, height, channels } = imageInfo;

      // 确保蒙版尺寸与原图一致
      const resizedMask = await sharp(maskImage)
        .resize(width, height, { fit: 'fill', kernel: 'nearest' })
        .raw()
        .toBuffer();

      // 解析背景颜色
      const bgColor = this.parseColor(backgroundColor);

      // 优化: 使用 Sharp 的 composite 功能而不是手动像素操作
      // 创建白色背景
      const whiteBackground = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: bgColor.r, g: bgColor.g, b: bgColor.b, alpha: 1 }
        }
      }).raw().toBuffer();

      // 应用蒙版到原图的 alpha 通道
      const maskedImageData = Buffer.alloc(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const maskValue = resizedMask[i] / 255;
        const pixelOffset = i * channels;
        const outputOffset = i * 4;

        maskedImageData[outputOffset] = imageData[pixelOffset];
        maskedImageData[outputOffset + 1] = imageData[pixelOffset + 1];
        maskedImageData[outputOffset + 2] = imageData[pixelOffset + 2];
        maskedImageData[outputOffset + 3] = Math.round(maskValue * (channels === 4 ? imageData[pixelOffset + 3] : 255));
      }

      // 保存处理后的图像
      const outputFilename = `bg-replaced-${uuidv4()}.png`;
      const outputPath = path.join(this.outputDir, outputFilename);

      // 使用 composite 合成背景和前景
      await sharp(whiteBackground, {
        raw: { width, height, channels: 4 }
      })
        .composite([{
          input: maskedImageData,
          raw: { width, height, channels: 4 },
          blend: 'over'
        }])
        .png({ compressionLevel: 6 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`背景替换失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 调整图像尺寸为标准尺寸
   * 需求: 4.1, 4.2, 4.3, 4.4
   * 
   * @param imagePath - 图像路径
   * @param targetWidth - 目标宽度
   * @param targetHeight - 目标高度
   * @returns 调整后的图像路径
   */
  async resizeImage(
    imagePath: string,
    targetWidth: number = 1200,
    targetHeight: number = 1200
  ): Promise<string> {
    try {
      // 获取原始图像信息
      const metadata = await sharp(imagePath).metadata();
      const { width = 0, height = 0 } = metadata;

      // 计算缩放比例，保持宽高比 (需求 4.2)
      const scale = Math.min(
        targetWidth / width,
        targetHeight / height,
        1 // 不放大，只缩小 (需求 4.4)
      );

      const scaledWidth = Math.round(width * scale);
      const scaledHeight = Math.round(height * scale);

      // 如果需要缩放 (需求 4.3)
      let processedImage = sharp(imagePath);
      if (scale < 1) {
        processedImage = processedImage.resize(scaledWidth, scaledHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // 创建白色画布并居中放置产品 (需求 4.1, 4.2)
      const left = Math.round((targetWidth - scaledWidth) / 2);
      const top = Math.round((targetHeight - scaledHeight) / 2);

      const outputFilename = `resized-${uuidv4()}.png`;
      const outputPath = path.join(this.outputDir, outputFilename);

      await processedImage
        .extend({
          top,
          bottom: targetHeight - scaledHeight - top,
          left,
          right: targetWidth - scaledWidth - left,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`图像尺寸调整失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 完整的图像处理流程
   * 
   * @param originalPath - 原始图像路径
   * @param maskPath - 蒙版路径
   * @param options - 处理选项
   * @returns 处理结果
   */
  async processImage(
    originalPath: string,
    maskPath: string,
    options: {
      outputFormat: 'jpg' | 'png';
      outputSize: { width: number; height: number };
    }
  ): Promise<{ processedImagePath: string; processingTime: number }> {
    const startTime = Date.now();

    try {
      // 步骤1: 替换背景为白色
      const bgReplacedPath = await this.replaceBackground(originalPath, maskPath);

      // 步骤2: 调整尺寸为标准尺寸
      const resizedPath = await this.resizeImage(
        bgReplacedPath,
        options.outputSize.width,
        options.outputSize.height
      );

      // 步骤3: 转换为最终输出格式（优化压缩设置）
      const outputFilename = `final-${uuidv4()}.${options.outputFormat}`;
      const outputPath = path.join(this.outputDir, outputFilename);

      const sharpInstance = sharp(resizedPath);
      
      if (options.outputFormat === 'jpg') {
        await sharpInstance
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ 
            quality: 90,
            mozjpeg: true // 使用 mozjpeg 获得更好的压缩
          })
          .toFile(outputPath);
      } else {
        await sharpInstance
          .png({ 
            compressionLevel: 6, // 平衡压缩速度和文件大小
            adaptiveFiltering: true
          })
          .toFile(outputPath);
      }

      const processingTime = Date.now() - startTime;

      // 优化: 显式触发垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      return {
        processedImagePath: outputPath,
        processingTime
      };
    } catch (error) {
      throw new Error(`图像处理失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析颜色字符串为RGB值
   * 
   * @param color - 颜色字符串 (如 #FFFFFF)
   * @returns RGB对象
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // 移除 # 符号
    const hex = color.replace('#', '');
    
    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
  }
}

export default ImageProcessingServiceImpl;
