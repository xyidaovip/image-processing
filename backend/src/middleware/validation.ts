import { Request, Response, NextFunction } from 'express';

/**
 * 验证上传ID格式
 */
export const validateUploadId = (req: Request, res: Response, next: NextFunction) => {
  const { uploadId } = req.params;
  
  if (!uploadId) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: '缺少上传ID参数',
        code: 400
      }
    });
  }

  // 简单的UUID格式验证
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uploadId)) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: '无效的上传ID格式',
        code: 400
      }
    });
  }

  next();
};

/**
 * 请求频率限制中间件（简单实现）
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 10, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientIp);
    
    if (!clientData || now > clientData.resetTime) {
      // 重置或初始化计数
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          type: 'RATE_LIMIT_ERROR',
          message: '请求过于频繁，请稍后再试',
          code: 429,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        }
      });
    }
    
    clientData.count++;
    next();
  };
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`);
  });
  
  next();
};