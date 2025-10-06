import { AppError, ErrorType } from '../shared/types';
import { extractError } from './errorHandler';

/**
 * 网络连接状态检测
 */
export const checkNetworkConnection = (): boolean => {
  return navigator.onLine;
};

/**
 * 监听网络状态变化
 */
export const addNetworkListener = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // 返回清理函数
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // 毫秒
  backoffMultiplier: number; // 指数退避倍数
  shouldRetry?: (error: AppError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: AppError) => {
    // 只重试网络错误、超时错误和服务器错误
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.SERVER_ERROR
    ].includes(error.type);
  }
};

/**
 * 带重试的请求包装器
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: AppError | null = null;
  let delay = finalConfig.retryDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // 检查网络连接
      if (!checkNetworkConnection()) {
        throw {
          type: ErrorType.NETWORK_ERROR,
          message: '网络连接已断开',
          code: 503,
          userMessage: '网络连接已断开，请检查网络后重试',
          retryable: true
        } as AppError;
      }

      // 执行请求
      return await fn();
    } catch (error: any) {
      lastError = extractError(error);

      // 检查是否应该重试
      const shouldRetry = finalConfig.shouldRetry
        ? finalConfig.shouldRetry(lastError)
        : lastError.retryable;

      // 如果是最后一次尝试或不应该重试，抛出错误
      if (attempt === finalConfig.maxRetries || !shouldRetry) {
        throw lastError;
      }

      // 等待后重试（指数退避）
      console.log(`请求失败，${delay}ms后重试 (尝试 ${attempt + 1}/${finalConfig.maxRetries})`);
      await sleep(delay);
      delay *= finalConfig.backoffMultiplier;
    }
  }

  // 理论上不会到达这里，但为了类型安全
  throw lastError;
};

/**
 * 延迟函数
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 网络状态管理器
 */
export class NetworkStatusManager {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private cleanupFn: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.cleanupFn = addNetworkListener(
      () => this.handleStatusChange(true),
      () => this.handleStatusChange(false)
    );
  }

  private handleStatusChange(isOnline: boolean) {
    this.isOnline = isOnline;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  /**
   * 订阅网络状态变化
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    // 立即通知当前状态
    listener(this.isOnline);

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取当前网络状态
   */
  getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.cleanupFn) {
      this.cleanupFn();
    }
    this.listeners.clear();
  }
}

// 导出单例实例
export const networkStatusManager = new NetworkStatusManager();
