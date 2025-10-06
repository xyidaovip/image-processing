import { ErrorType, ErrorCodes, ErrorMessages, AppError } from '../shared/types';

/**
 * 创建标准化的应用错误
 */
export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly code: number;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    details?: any,
    userMessage?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.type = type;
    this.code = ErrorCodes[type];
    this.userMessage = userMessage || ErrorMessages[type];
    this.retryable = retryable;
    this.details = details;

    // 维护正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为API响应格式
   */
  toJSON(): AppError {
    return {
      type: this.type,
      message: this.userMessage,
      code: this.code,
      details: this.details,
      userMessage: this.userMessage,
      retryable: this.retryable
    };
  }
}

/**
 * 错误工厂函数
 */
export const createError = {
  uploadError: (message: string, details?: any) =>
    new ApplicationError(ErrorType.UPLOAD_ERROR, message, details, undefined, true),

  fileSizeError: (maxSize: number) =>
    new ApplicationError(
      ErrorType.FILE_SIZE_ERROR,
      `文件大小超过限制`,
      { maxSize },
      `文件大小超过限制（最大${maxSize}MB）`,
      false
    ),

  formatError: (supportedFormats: string[]) =>
    new ApplicationError(
      ErrorType.FORMAT_ERROR,
      '不支持的文件格式',
      { supportedFormats },
      `不支持的文件格式，请上传${supportedFormats.join('、')}格式的图片`,
      false
    ),

  processingError: (message: string, details?: any) =>
    new ApplicationError(ErrorType.PROCESSING_ERROR, message, details, undefined, true),

  aiModelError: (message: string, details?: any) =>
    new ApplicationError(
      ErrorType.AI_MODEL_ERROR,
      message,
      details,
      '图片识别失败，请尝试使用清晰度更高或背景更简单的图片',
      true
    ),

  networkError: (message: string) =>
    new ApplicationError(ErrorType.NETWORK_ERROR, message, undefined, undefined, true),

  validationError: (message: string, details?: any) =>
    new ApplicationError(ErrorType.VALIDATION_ERROR, message, details, undefined, false),

  fileNotFoundError: (filename: string) =>
    new ApplicationError(
      ErrorType.FILE_NOT_FOUND,
      `文件不存在: ${filename}`,
      { filename },
      '文件不存在或已被删除',
      false
    ),

  serverError: (message: string, details?: any) =>
    new ApplicationError(ErrorType.SERVER_ERROR, message, details, undefined, true),

  timeoutError: (operation: string, timeout: number) =>
    new ApplicationError(
      ErrorType.TIMEOUT_ERROR,
      `操作超时: ${operation}`,
      { operation, timeout },
      '请求超时，请重试',
      true
    ),

  queueFullError: (queueSize: number, estimatedWaitTime: number) =>
    new ApplicationError(
      ErrorType.QUEUE_FULL_ERROR,
      '处理队列已满',
      { queueSize, estimatedWaitTime },
      `系统繁忙，预计等待时间${estimatedWaitTime}秒`,
      true
    )
};

/**
 * 判断错误是否可重试
 */
export const isRetryableError = (error: any): boolean => {
  if (error instanceof ApplicationError) {
    return error.retryable;
  }
  
  // 网络相关错误通常可重试
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  
  return false;
};

/**
 * 从任意错误对象创建ApplicationError
 */
export const normalizeError = (error: any): ApplicationError => {
  if (error instanceof ApplicationError) {
    return error;
  }

  // 处理网络错误
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return createError.networkError(error.message);
  }

  // 处理超时错误
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return createError.timeoutError('操作', 30);
  }

  // 默认服务器错误
  return createError.serverError(
    error.message || '未知错误',
    { originalError: error.toString() }
  );
};
