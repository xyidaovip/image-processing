import { AppError, ErrorType, ErrorMessages } from '../shared/types';

/**
 * 从API响应中提取错误信息
 */
export const extractError = (error: any): AppError => {
  // 如果已经是AppError格式
  if (error.type && error.message && error.code) {
    return error as AppError;
  }

  // 处理axios错误
  if (error.response) {
    const { data, status } = error.response;
    
    // 如果后端返回了标准错误格式
    if (data?.error) {
      return data.error as AppError;
    }

    // 根据HTTP状态码创建错误
    return createFrontendError(status, data?.message || error.message);
  }

  // 处理网络错误
  if (error.request) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: ErrorMessages[ErrorType.NETWORK_ERROR],
      code: 503,
      userMessage: ErrorMessages[ErrorType.NETWORK_ERROR],
      retryable: true
    };
  }

  // 默认错误
  return {
    type: ErrorType.SERVER_ERROR,
    message: error.message || '未知错误',
    code: 500,
    userMessage: ErrorMessages[ErrorType.SERVER_ERROR],
    retryable: true
  };
};

/**
 * 根据HTTP状态码创建错误
 */
const createFrontendError = (status: number, message?: string): AppError => {
  let type: ErrorType;
  
  switch (status) {
    case 400:
      type = ErrorType.VALIDATION_ERROR;
      break;
    case 404:
      type = ErrorType.FILE_NOT_FOUND;
      break;
    case 408:
      type = ErrorType.TIMEOUT_ERROR;
      break;
    case 413:
      type = ErrorType.FILE_SIZE_ERROR;
      break;
    case 415:
      type = ErrorType.FORMAT_ERROR;
      break;
    case 503:
      type = ErrorType.NETWORK_ERROR;
      break;
    default:
      type = ErrorType.SERVER_ERROR;
  }

  return {
    type,
    message: message || ErrorMessages[type],
    code: status,
    userMessage: ErrorMessages[type],
    retryable: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.SERVER_ERROR].includes(type)
  };
};

/**
 * 获取用户友好的错误消息
 */
export const getUserFriendlyMessage = (error: AppError): string => {
  return error.userMessage || error.message || ErrorMessages[error.type] || '发生未知错误';
};

/**
 * 判断错误是否可重试
 */
export const isRetryable = (error: AppError): boolean => {
  return error.retryable ?? false;
};

/**
 * 格式化错误详情用于显示
 */
export const formatErrorDetails = (error: AppError): string | null => {
  if (!error.details) return null;

  const details = error.details;
  
  // 文件大小错误
  if (error.type === ErrorType.FILE_SIZE_ERROR && details.maxSize) {
    return `最大允许文件大小: ${details.maxSize}MB`;
  }

  // 格式错误
  if (error.type === ErrorType.FORMAT_ERROR && details.supportedFormats) {
    return `支持的格式: ${details.supportedFormats.join(', ')}`;
  }

  // 队列满错误
  if (error.type === ErrorType.QUEUE_FULL_ERROR && details.estimatedWaitTime) {
    return `预计等待时间: ${details.estimatedWaitTime}秒`;
  }

  return null;
};

/**
 * 错误日志记录
 */
export const logError = (error: AppError, context?: string): void => {
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, {
    type: error.type,
    message: error.message,
    code: error.code,
    details: error.details,
    timestamp: new Date().toISOString()
  });
};
