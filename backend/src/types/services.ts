// Import types from shared directory (will be copied during build)
export interface ProcessingTask {
  id: string;
  uploadId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  originalImage: {
    url: string;
    width: number;
    height: number;
    format: string;
    size: number;
  };
  processedImage?: {
    url: string;
    processingTime: number;
    confidence: number;
  };
  error?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

// 文件上传服务接口
export interface FileUploadService {
  uploadFile(file: any): Promise<{
    uploadId: string;
    originalUrl: string;
    metadata: ImageMetadata;
  }>;
  validateFile(file: any): Promise<boolean>;
  deleteFile(uploadId: string): Promise<void>;
}

// AI推理服务接口
export interface AIInferenceService {
  removeBackground(imagePath: string): Promise<{
    processedImagePath: string;
    maskPath: string;
    confidence: number;
  }>;
  isServiceAvailable(): Promise<boolean>;
}

// 图像处理服务接口
export interface ImageProcessingService {
  processImage(
    originalPath: string,
    maskPath: string,
    options: {
      outputFormat: 'jpg' | 'png';
      outputSize: { width: number; height: number };
    }
  ): Promise<{
    processedImagePath: string;
    processingTime: number;
  }>;
  resizeImage(imagePath: string, width: number, height: number): Promise<string>;
  replaceBackground(imagePath: string, maskPath: string, backgroundColor: string): Promise<string>;
}

// 任务管理服务接口
export interface TaskManagerService {
  createTask(uploadId: string): Promise<ProcessingTask>;
  updateTaskStatus(taskId: string, status: ProcessingTask['status'], progress?: number): Promise<void>;
  getTask(taskId: string): Promise<ProcessingTask | null>;
  completeTask(taskId: string, result: {
    processedUrl: string;
    processingTime: number;
    confidence: number;
  }): Promise<void>;
  failTask(taskId: string, error: string): Promise<void>;
}

// 队列管理服务接口
export interface QueueService {
  addToQueue(taskId: string): Promise<void>;
  processNext(): Promise<ProcessingTask | null>;
  getQueueLength(): Promise<number>;
  getEstimatedWaitTime(): Promise<number>;
}