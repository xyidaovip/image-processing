import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { extractImageMetadata, validateImageFile, generateFileUrl, cleanupFile } from '../utils/fileUtils';
import { createError } from '../utils/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';

// 存储上传文件信息的内存映射（生产环境应使用数据库）
const uploadedFiles = new Map<string, {
  uploadId: string;
  originalName: string;
  filename: string;
  filePath: string;
  metadata: any;
  uploadedAt: Date;
}>();

/**
 * 处理文件上传
 */
export const uploadFile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // 检查是否有文件上传
  if (!req.file) {
    throw createError.uploadError('没有检测到上传的文件');
  }

  const file = req.file;
  const filePath = file.path;

  // 验证图片文件
  const isValid = await validateImageFile(filePath);
  if (!isValid) {
    // 清理无效文件
    cleanupFile(filePath);
    throw createError.formatError(['JPG', 'PNG', 'WEBP']);
  }

    // 提取图片元数据
    const metadata = await extractImageMetadata(filePath);

    // 生成唯一的上传ID
    const uploadId = uuidv4();

    // 生成文件访问URL
    const originalUrl = generateFileUrl(file.filename);

    // 存储文件信息
    uploadedFiles.set(uploadId, {
      uploadId,
      originalName: file.originalname,
      filename: file.filename,
      filePath: filePath,
      metadata,
      uploadedAt: new Date()
    });

  // 返回成功响应
  res.json({
    success: true,
    data: {
      uploadId,
      originalUrl,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size
      }
    }
  });
});

/**
 * 获取上传文件信息
 */
export const getUploadInfo = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { uploadId } = req.params;

  if (!uploadId) {
    throw createError.validationError('缺少上传ID参数');
  }

  const fileInfo = uploadedFiles.get(uploadId);
  if (!fileInfo) {
    throw createError.fileNotFoundError(uploadId);
  }

  const originalUrl = generateFileUrl(fileInfo.filename);

  res.json({
    success: true,
    data: {
      uploadId: fileInfo.uploadId,
      originalName: fileInfo.originalName,
      originalUrl,
      metadata: fileInfo.metadata,
      uploadedAt: fileInfo.uploadedAt
    }
  });
});

/**
 * 删除上传文件
 */
export const deleteUpload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { uploadId } = req.params;

  if (!uploadId) {
    throw createError.validationError('缺少上传ID参数');
  }

  const fileInfo = uploadedFiles.get(uploadId);
  if (!fileInfo) {
    throw createError.fileNotFoundError(uploadId);
  }

  // 清理文件
  cleanupFile(fileInfo.filePath);

  // 从内存中移除记录
  uploadedFiles.delete(uploadId);

  res.json({
    success: true,
    data: {
      message: '文件已成功删除',
      uploadId
    }
  });
});

/**
 * 获取所有上传文件列表（用于调试）
 */
export const listUploads = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const uploads = Array.from(uploadedFiles.values()).map(fileInfo => ({
    uploadId: fileInfo.uploadId,
    originalName: fileInfo.originalName,
    originalUrl: generateFileUrl(fileInfo.filename),
    metadata: fileInfo.metadata,
    uploadedAt: fileInfo.uploadedAt
  }));

  res.json({
    success: true,
    data: {
      uploads,
      total: uploads.length
    }
  });
});

/**
 * 获取上传文件的实际路径（内部使用）
 */
export const getUploadFilePath = (uploadId: string): string | null => {
  const fileInfo = uploadedFiles.get(uploadId);
  return fileInfo ? fileInfo.filePath : null;
};

/**
 * 清理过期的上传文件（定期任务）
 */
export const cleanupExpiredUploads = () => {
  const now = new Date();
  const expirationTime = 24 * 60 * 60 * 1000; // 24小时

  for (const [uploadId, fileInfo] of uploadedFiles.entries()) {
    const timeDiff = now.getTime() - fileInfo.uploadedAt.getTime();
    
    if (timeDiff > expirationTime) {
      console.log(`清理过期文件: ${fileInfo.filename}`);
      cleanupFile(fileInfo.filePath);
      uploadedFiles.delete(uploadId);
    }
  }
};

// 设置定期清理任务（每小时执行一次）
setInterval(cleanupExpiredUploads, 60 * 60 * 1000);