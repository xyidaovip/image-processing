import { Request, Response, NextFunction } from 'express';
import { createError } from '../utils/errorHandler';

/**
 * 简单的内存速率限制器
 * 生产环境应使用Redis等分布式存储
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // 定期清理过期记录
    setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * 检查是否超过速率限制
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // 过滤掉窗口外的请求
    const recentRequests = requests.filter(time => now - time < this.windowMs);

    // 更新记录
    this.requests.set(identifier, recentRequests);

    return recentRequests.length >= this.maxRequests;
  }

  /**
   * 记录请求
   */
  recordRequest(identifier: string): void {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    requests.push(now);
    this.requests.set(identifier, requests);
  }

  /**
   * 获取剩余请求次数
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * 获取重置时间（毫秒）
   */
  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) {
      return 0;
    }
    const oldestRequest = Math.min(...requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// 创建不同的限制器实例
const uploadLimiter = new RateLimiter(60000, 5); // 每分钟5次上传
const processLimiter = new RateLimiter(60000, 10); // 每分钟10次处理请求
const generalLimiter = new RateLimiter(60000, 30); // 每分钟30次一般请求

/**
 * 速率限制中间件工厂
 */
export const createRateLimitMiddleware = (limiter: RateLimiter, errorMessage?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 使用IP地址作为标识符
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';

    // 检查是否超过限制
    if (limiter.isRateLimited(identifier)) {
      const resetTime = Math.ceil(limiter.getResetTime(identifier) / 1000);
      const error = createError.queueFullError(0, resetTime);
      
      res.status(429).json({
        success: false,
        error: {
          ...error.toJSON(),
          userMessage: errorMessage || `请求过于频繁，请${resetTime}秒后重试`
        }
      });
      return;
    }

    // 记录请求
    limiter.recordRequest(identifier);

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', limiter['maxRequests']);
    res.setHeader('X-RateLimit-Remaining', limiter.getRemainingRequests(identifier));
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + limiter['windowMs']) / 1000));

    next();
  };
};

// 导出预配置的中间件
export const uploadRateLimiter = createRateLimitMiddleware(
  uploadLimiter,
  '上传请求过于频繁，请稍后重试'
);

export const processRateLimiter = createRateLimitMiddleware(
  processLimiter,
  '处理请求过于频繁，请稍后重试'
);

export const generalRateLimiter = createRateLimitMiddleware(
  generalLimiter,
  '请求过于频繁，请稍后重试'
);
