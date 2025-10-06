import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ImageMetadata } from '../types/services';

/**
 * 提取图片元数据
 */
export async function extractImageMetadata(filePath: string): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(filePath).metadata();
    const stats = fs.statSync(filePath);
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size
    };
  } catch (error) {
    throw new Error(`无法提取图片元数据: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证图片文件
 */
export async function validateImageFile(filePath: string): Promise<boolean> {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // 检查是否为有效图片
    if (!metadata.width || !metadata.height) {
      return false;
    }
    
    // 检查格式
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!metadata.format || !supportedFormats.includes(metadata.format.toLowerCase())) {
      return false;
    }
    
    // 检查尺寸限制（最小和最大）
    const minSize = 50; // 最小50像素
    const maxSize = 8000; // 最大8000像素
    
    if (metadata.width < minSize || metadata.height < minSize ||
        metadata.width > maxSize || metadata.height > maxSize) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('图片验证失败:', error);
    return false;
  }
}

/**
 * 清理临时文件
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`已清理文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`清理文件失败 ${filePath}:`, error);
  }
}

/**
 * 生成文件URL
 */
export function generateFileUrl(filename: string, baseUrl?: string): string {
  const base = baseUrl || process.env.BASE_URL || 'http://localhost:8000';
  return `${base}/uploads/${filename}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * 生成处理后的文件名
 */
export function generateProcessedFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const name = path.basename(originalFilename, ext);
  return `${name}_processed${ext}`;
}

/**
 * 检查磁盘空间
 */
export function checkDiskSpace(uploadDir: string): { available: boolean; freeSpace: number } {
  try {
    const stats = fs.statSync(uploadDir);
    // 简单检查，实际生产环境可能需要更复杂的磁盘空间检查
    return {
      available: true,
      freeSpace: 1024 * 1024 * 1024 // 假设有1GB可用空间
    };
  } catch (error) {
    return {
      available: false,
      freeSpace: 0
    };
  }
}