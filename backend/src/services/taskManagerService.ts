import { ProcessingTask, TaskManagerService } from '../types/services';
import { v4 as uuidv4 } from 'uuid';

/**
 * 任务管理服务 - 负责处理任务的状态跟踪和更新
 */
class TaskManager implements TaskManagerService {
  private tasks: Map<string, ProcessingTask> = new Map();
  private uploadIdToTaskId: Map<string, string> = new Map();

  /**
   * 创建新的处理任务
   */
  async createTask(uploadId: string): Promise<ProcessingTask> {
    const taskId = uuidv4();
    
    const task: ProcessingTask = {
      id: taskId,
      uploadId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      originalImage: {
        url: '',
        width: 0,
        height: 0,
        format: '',
        size: 0
      }
    };

    this.tasks.set(taskId, task);
    this.uploadIdToTaskId.set(uploadId, taskId);

    return task;
  }

  /**
   * 更新任务状态和进度
   */
  async updateTaskStatus(
    taskId: string,
    status: ProcessingTask['status'],
    progress?: number
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    
    if (progress !== undefined) {
      task.progress = Math.min(100, Math.max(0, progress));
    }

    this.tasks.set(taskId, task);
  }

  /**
   * 获取任务信息
   */
  async getTask(taskId: string): Promise<ProcessingTask | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 通过uploadId获取任务
   */
  async getTaskByUploadId(uploadId: string): Promise<ProcessingTask | null> {
    const taskId = this.uploadIdToTaskId.get(uploadId);
    if (!taskId) {
      return null;
    }
    return this.getTask(taskId);
  }

  /**
   * 完成任务并设置结果
   */
  async completeTask(
    taskId: string,
    result: {
      processedUrl: string;
      processingTime: number;
      confidence: number;
    }
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date();
    task.processedImage = {
      url: result.processedUrl,
      processingTime: result.processingTime,
      confidence: result.confidence
    };

    this.tasks.set(taskId, task);
  }

  /**
   * 标记任务失败并记录错误
   */
  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'failed';
    task.completedAt = new Date();
    task.error = error;

    this.tasks.set(taskId, task);
  }

  /**
   * 更新任务的原始图片信息
   */
  async updateOriginalImage(
    taskId: string,
    imageInfo: {
      url: string;
      width: number;
      height: number;
      format: string;
      size: number;
    }
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.originalImage = imageInfo;
    this.tasks.set(taskId, task);
  }

  /**
   * 清理过期任务（超过24小时）
   */
  async cleanupOldTasks(): Promise<number> {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      const age = now.getTime() - task.createdAt.getTime();
      
      if (age > maxAge) {
        this.tasks.delete(taskId);
        this.uploadIdToTaskId.delete(task.uploadId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取所有任务（用于调试）
   */
  async getAllTasks(): Promise<ProcessingTask[]> {
    return Array.from(this.tasks.values());
  }
}

// 导出单例实例
export const taskManagerService = new TaskManager();
