import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApplicationError, normalizeError, createError } from '../utils/errorHandler';
import { ApiResponse } from '../shared/types';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 记录错误日志
  console.error('Error occurred:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    type: err.type || 'Unknown'
  });

  let appError: ApplicationError;

  // 处理Multer文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      appError = createError.fileSizeError(10);
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      appError = createError.uploadError('一次只能上传一个文件');
    } else {
      appError = createError.uploadError(err.message);
    }
  }
  // 处理应用自定义错误
  else if (err instanceof ApplicationError) {
    appError = err;
  }
  // 处理其他错误
  else {
    appError = normalizeError(err);
  }

  // 构建错误响应
  const response: ApiResponse = {
    success: false,
    error: appError.toJSON()
  };

  // 发送响应
  res.status(appError.code).json(response);
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = createError.validationError(`路由不存在: ${req.path}`);
  const response: ApiResponse = {
    success: false,
    error: {
      ...error.toJSON(),
      userMessage: '请求的资源不存在'
    }
  };
  
  res.status(404).json(response);
};

/**
 * 异步路由处理器包装函数
 * 自动捕获异步错误并传递给错误处理中间件
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
