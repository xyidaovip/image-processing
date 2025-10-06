import { ProcessingTask, QueueService } from '../types/services';
import { taskManagerService } from './taskManagerService';
import ImageProcessingServiceImpl from './imageProcessingService';
import { performanceMonitor } from './performanceMonitorService';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';

/**
 * 处理管道服务 - 集成AI推理和图像处理的完整工作流
 * 需求: 6.1, 6.2
 */
class ProcessingPipelineService {
  private imageProcessingService: ImageProcessingServiceImpl;
  private aiServiceUrl: string;
  private processingQueue: string[] = [];
  private isProcessing: boolean = false;
  private readonly maxConcurrent: number = 3;
  private readonly maxQueueSize: number = 50; // 最大队列长度
  private activeProcessing: Set<string> = new Set();
  private processingTimes: number[] = []; // 记录最近的处理时间
  private readonly maxProcessingTimeRecords: number = 10;

  constructor() {
    this.imageProcessingService = new ImageProcessingServiceImpl('uploads/processed');
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * 启动处理任务
   * 集成AI推理和图像处理步骤
   */
  async startProcessing(taskId: string, imagePath: string): Promise<void> {
    const startTime = Date.now();

    // 获取文件信息用于性能监控
    let fileSize = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    
    try {
      const stats = await fs.stat(imagePath);
      fileSize = stats.size;
      
      // 获取图像尺寸（从任务管理器）
      const task = await taskManagerService.getTask(taskId);
      if (task) {
        imageWidth = task.originalImage.width;
        imageHeight = task.originalImage.height;
      }
    } catch (error) {
      console.warn('Failed to get file info for performance monitoring:', error);
    }

    // 开始性能监控
    performanceMonitor.startTracking(taskId, fileSize, imageWidth, imageHeight);

    try {
      // 更新任务状态为处理中
      await taskManagerService.updateTaskStatus(taskId, 'processing', 10);

      // 步骤1: 调用AI服务进行背景移除 (进度: 10-50%)
      const aiResult = await this.callAIService(imagePath, taskId);
      await taskManagerService.updateTaskStatus(taskId, 'processing', 50);

      // 步骤2: 图像处理 - 背景替换和尺寸调整 (进度: 50-90%)
      const processedResult = await this.imageProcessingService.processImage(
        imagePath,
        aiResult.maskPath,
        {
          outputFormat: 'jpg',
          outputSize: { width: 1200, height: 1200 }
        }
      );
      await taskManagerService.updateTaskStatus(taskId, 'processing', 90);

      // 步骤3: 生成最终URL并完成任务 (进度: 90-100%)
      const processedUrl = `/uploads/processed/${path.basename(processedResult.processedImagePath)}`;
      const totalProcessingTime = Date.now() - startTime;

      await taskManagerService.completeTask(taskId, {
        processedUrl,
        processingTime: totalProcessingTime,
        confidence: aiResult.confidence
      });

      // 记录处理时间用于预估
      this.recordProcessingTime(totalProcessingTime);

      // 结束性能监控（成功）
      performanceMonitor.endTracking(taskId);

      console.log(`Task ${taskId} completed in ${totalProcessingTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 确定错误类型
      let errorType = 'UNKNOWN_ERROR';
      if (errorMessage.includes('AI服务')) {
        errorType = 'AI_SERVICE_ERROR';
      } else if (errorMessage.includes('图像处理')) {
        errorType = 'IMAGE_PROCESSING_ERROR';
      } else if (errorMessage.includes('超时')) {
        errorType = 'TIMEOUT_ERROR';
      } else if (errorMessage.includes('内存')) {
        errorType = 'MEMORY_ERROR';
      }
      
      // 结束性能监控（失败）
      performanceMonitor.endTrackingWithError(taskId, errorType);
      
      await taskManagerService.failTask(taskId, errorMessage);
      console.error(`Task ${taskId} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * 调用AI服务进行背景移除
   */
  private async callAIService(
    imagePath: string,
    taskId: string
  ): Promise<{ maskPath: string; confidence: number }> {
    try {
      // 读取图像文件
      const imageBuffer = await fs.readFile(imagePath);
      const formData = new FormData();
      const blob = new Blob([imageBuffer]);
      formData.append('file', blob, path.basename(imagePath));

      // 调用AI服务
      const response = await axios.post(
        `${this.aiServiceUrl}/api/remove-background`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30秒超时
        }
      );

      if (!response.data || !response.data.mask_path) {
        throw new Error('AI服务返回无效响应');
      }

      return {
        maskPath: response.data.mask_path,
        confidence: response.data.confidence || 0.8
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('AI服务不可用，请确保服务正在运行');
        }
        if (error.response) {
          throw new Error(`AI服务错误: ${error.response.data?.error || error.message}`);
        }
      }
      throw new Error(`调用AI服务失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 添加任务到队列
   */
  async addToQueue(taskId: string): Promise<void> {
    // 检查队列是否已满
    if (this.processingQueue.length >= this.maxQueueSize) {
      const estimatedWaitTime = await this.getEstimatedWaitTime();
      throw new Error(`处理队列已满（${this.maxQueueSize}），预计等待时间${estimatedWaitTime}秒，请稍后重试`);
    }

    this.processingQueue.push(taskId);
    console.log(`Task ${taskId} added to queue. Queue length: ${this.processingQueue.length}`);
    
    // 尝试处理队列
    this.processQueue();
  }

  /**
   * 处理队列中的任务
   * 实现异步处理队列
   */
  private async processQueue(): Promise<void> {
    // 如果已经在处理或队列为空，直接返回
    if (this.processingQueue.length === 0) {
      return;
    }

    // 检查是否达到并发限制
    if (this.activeProcessing.size >= this.maxConcurrent) {
      return;
    }

    // 从队列中取出任务
    const taskId = this.processingQueue.shift();
    if (!taskId) {
      return;
    }

    // 标记为正在处理
    this.activeProcessing.add(taskId);

    try {
      // 获取任务信息
      const task = await taskManagerService.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // 获取原始图像路径
      const imagePath = task.originalImage.url.replace('/uploads/', 'uploads/');

      // 开始处理
      await this.startProcessing(taskId, imagePath);
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);
    } finally {
      // 移除活跃标记
      this.activeProcessing.delete(taskId);
      
      // 继续处理队列中的下一个任务
      this.processQueue();
    }
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.processingQueue.length;
  }

  /**
   * 记录处理时间
   */
  private recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    
    // 只保留最近的N条记录
    if (this.processingTimes.length > this.maxProcessingTimeRecords) {
      this.processingTimes.shift();
    }
  }

  /**
   * 获取平均处理时间（毫秒）
   */
  private getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 20000; // 默认20秒
    }
    
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return sum / this.processingTimes.length;
  }

  /**
   * 获取预估等待时间（秒）
   * 基于实际平均处理时间估算
   */
  async getEstimatedWaitTime(): Promise<number> {
    const queueLength = this.processingQueue.length;
    const activeCount = this.activeProcessing.size;
    
    // 使用实际平均处理时间
    const avgProcessingTimeMs = this.getAverageProcessingTime();
    const avgProcessingTimeSec = avgProcessingTimeMs / 1000;
    
    // 计算预估时间：队列中的任务数 / 并发数 * 平均处理时间
    const estimatedTime = Math.ceil(
      (queueLength + activeCount) / this.maxConcurrent * avgProcessingTimeSec
    );
    
    return estimatedTime;
  }

  /**
   * 检查AI服务是否可用
   */
  async isAIServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(): {
    queueLength: number;
    activeProcessing: number;
    maxConcurrent: number;
    maxQueueSize: number;
    queueUtilization: number;
    averageProcessingTime: number;
  } {
    return {
      queueLength: this.processingQueue.length,
      activeProcessing: this.activeProcessing.size,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      queueUtilization: (this.processingQueue.length / this.maxQueueSize) * 100,
      averageProcessingTime: Math.round(this.getAverageProcessingTime() / 1000) // 转换为秒
    };
  }

  /**
   * 检查系统是否过载
   */
  isSystemOverloaded(): boolean {
    const utilization = (this.processingQueue.length / this.maxQueueSize) * 100;
    return utilization > 80; // 队列使用率超过80%视为过载
  }
}

// 导出单例实例
export const processingPipelineService = new ProcessingPipelineService();
