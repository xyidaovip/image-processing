import { Request, Response } from 'express';
import { taskManagerService } from '../services/taskManagerService';
import { processingPipelineService } from '../services/processingPipelineService';
import fs from 'fs/promises';
import path from 'path';
import { createError } from '../utils/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * 处理控制器 - 处理图片处理相关的API请求
 * 需求: 6.1, 6.2, 6.4
 */

/**
 * POST /api/process
 * 启动图片处理任务
 */
export const startProcessing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { uploadId, options } = req.body;

  // 验证必需参数
  if (!uploadId) {
    throw createError.validationError('缺少必需参数: uploadId');
  }

  // 检查上传的文件是否存在
  const uploadPath = path.join('uploads', uploadId);
  try {
    await fs.access(uploadPath);
  } catch (error) {
    throw createError.fileNotFoundError(uploadId);
  }

  // 获取文件信息
  const stats = await fs.stat(uploadPath);
  const files = await fs.readdir(uploadPath);
  const imageFile = files.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  if (!imageFile) {
    throw createError.fileNotFoundError('图片文件');
  }

  const imagePath = path.join(uploadPath, imageFile);
  const imageStats = await fs.stat(imagePath);

  // 创建处理任务
  const task = await taskManagerService.createTask(uploadId);

  // 更新任务的原始图片信息
  await taskManagerService.updateOriginalImage(task.id, {
    url: `/uploads/${uploadId}/${imageFile}`,
    width: 0, // 将在处理时获取
    height: 0,
    format: path.extname(imageFile).substring(1),
    size: imageStats.size
  });

  // 检查系统是否过载
  if (processingPipelineService.isSystemOverloaded()) {
    const estimatedWaitTime = await processingPipelineService.getEstimatedWaitTime();
    throw createError.queueFullError(
      processingPipelineService.getQueueLength(),
      estimatedWaitTime
    );
  }

  // 添加到处理队列
  try {
    await processingPipelineService.addToQueue(task.id);
  } catch (error) {
    // 如果队列已满，抛出队列满错误
    if (error instanceof Error && error.message.includes('队列已满')) {
      const estimatedWaitTime = await processingPipelineService.getEstimatedWaitTime();
      throw createError.queueFullError(
        processingPipelineService.getQueueLength(),
        estimatedWaitTime
      );
    }
    throw error;
  }

  // 获取队列信息
  const queueLength = processingPipelineService.getQueueLength();
  const estimatedWaitTime = await processingPipelineService.getEstimatedWaitTime();

  // 返回任务信息
  res.status(202).json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      queuePosition: queueLength,
      estimatedWaitTime
    }
  });
});

/**
 * GET /api/process/status/:taskId
 * 查询处理任务状态
 */
export const getProcessingStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;

  if (!taskId) {
    throw createError.validationError('缺少必需参数: taskId');
  }

  // 获取任务信息
  const task = await taskManagerService.getTask(taskId);

  if (!task) {
    throw createError.fileNotFoundError('任务');
  }

  // 计算预估剩余时间
  let estimatedTime = 0;
  if (task.status === 'pending' || task.status === 'processing') {
    estimatedTime = await processingPipelineService.getEstimatedWaitTime();
  }

  // 返回任务状态
  res.status(200).json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      estimatedTime,
      result: task.status === 'completed' ? {
        processedUrl: task.processedImage?.url,
        processingTime: task.processedImage?.processingTime,
        confidence: task.processedImage?.confidence
      } : undefined,
      error: task.error
    }
  });
});

/**
 * GET /api/process/queue
 * 获取队列统计信息
 */
export const getQueueStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const stats = processingPipelineService.getProcessingStats();
  const estimatedWaitTime = await processingPipelineService.getEstimatedWaitTime();

  res.status(200).json({
    success: true,
    data: {
      ...stats,
      estimatedWaitTime
    }
  });
});

/**
 * GET /api/process/health
 * 检查处理服务健康状态
 */
export const checkHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const aiServiceAvailable = await processingPipelineService.isAIServiceAvailable();
  
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      aiService: aiServiceAvailable ? 'available' : 'unavailable',
      timestamp: new Date().toISOString()
    }
  });
});
