// 错误类型定义
export enum ErrorType {
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  FILE_SIZE_ERROR = 'FILE_SIZE_ERROR',
  FORMAT_ERROR = 'FORMAT_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  QUEUE_FULL_ERROR = 'QUEUE_FULL_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code: number;
  details?: any;
  userMessage?: string; // 用户友好的错误提示
  retryable?: boolean; // 是否可以重试
}

// 错误码映射
export const ErrorCodes = {
  [ErrorType.UPLOAD_ERROR]: 400,
  [ErrorType.FILE_SIZE_ERROR]: 413,
  [ErrorType.FORMAT_ERROR]: 415,
  [ErrorType.PROCESSING_ERROR]: 500,
  [ErrorType.AI_MODEL_ERROR]: 500,
  [ErrorType.NETWORK_ERROR]: 503,
  [ErrorType.VALIDATION_ERROR]: 400,
  [ErrorType.FILE_NOT_FOUND]: 404,
  [ErrorType.SERVER_ERROR]: 500,
  [ErrorType.TIMEOUT_ERROR]: 408,
  [ErrorType.QUEUE_FULL_ERROR]: 503
} as const;

// 用户友好的错误消息
export const ErrorMessages = {
  [ErrorType.UPLOAD_ERROR]: '文件上传失败，请重试',
  [ErrorType.FILE_SIZE_ERROR]: '文件大小超过限制（最大10MB）',
  [ErrorType.FORMAT_ERROR]: '不支持的文件格式，请上传JPG、PNG或WEBP格式的图片',
  [ErrorType.PROCESSING_ERROR]: '图片处理失败，请重试',
  [ErrorType.AI_MODEL_ERROR]: '图片识别失败，请尝试使用其他图片',
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络后重试',
  [ErrorType.VALIDATION_ERROR]: '请求参数错误',
  [ErrorType.FILE_NOT_FOUND]: '文件不存在',
  [ErrorType.SERVER_ERROR]: '服务器错误，请稍后重试',
  [ErrorType.TIMEOUT_ERROR]: '请求超时，请重试',
  [ErrorType.QUEUE_FULL_ERROR]: '系统繁忙，请稍后重试'
} as const;

// 图片元数据接口
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

// 图片上传响应接口
export interface UploadResponse {
  success: boolean;
  data: {
    uploadId: string;
    originalUrl: string;
    metadata: ImageMetadata;
  };
  error?: AppError;
}

// 图片处理选项接口
export interface ProcessingOptions {
  outputFormat: 'jpg' | 'png';
  outputSize: {
    width: number;
    height: number;
  };
}

// 图片处理请求接口
export interface ProcessingRequest {
  uploadId: string;
  options: ProcessingOptions;
}

// 图片处理响应接口
export interface ProcessingResponse {
  success: boolean;
  data: {
    processedUrl: string;
    processingTime: number;
    confidence: number;
  };
  error?: AppError;
}

// 处理状态类型
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 处理状态响应接口
export interface ProcessingStatusResponse {
  status: ProcessingStatus;
  progress: number;
  estimatedTime: number;
  error: string | null;
}

// 图片处理任务模型
export interface ProcessingTask {
  id: string;
  uploadId: string;
  status: ProcessingStatus;
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

// 用户会话模型
export interface UserSession {
  sessionId: string;
  tasks: ProcessingTask[];
  createdAt: Date;
  lastActivity: Date;
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
}