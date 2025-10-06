import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse } from '../shared/types';
import { extractError, logError } from './errorHandler';
import { withRetry, checkNetworkConnection } from './networkHandler';

/**
 * API客户端配置
 */
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30秒

/**
 * 创建axios实例
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // 检查网络连接
    if (!checkNetworkConnection()) {
      return Promise.reject({
        response: {
          status: 503,
          data: {
            success: false,
            error: {
              type: 'NETWORK_ERROR',
              message: '网络连接已断开',
              code: 503
            }
          }
        }
      });
    }

    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 提取并记录错误
    const appError = extractError(error);
    logError(appError, 'API Request');
    
    return Promise.reject(error);
  }
);

/**
 * API客户端类
 */
class ApiClient {
  /**
   * GET请求
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    enableRetry: boolean = true
  ): Promise<ApiResponse<T>> {
    const request = () => axiosInstance.get<ApiResponse<T>>(url, config);
    
    if (enableRetry) {
      const response = await withRetry(request);
      return response.data;
    }
    
    const response = await request();
    return response.data;
  }

  /**
   * POST请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    enableRetry: boolean = true
  ): Promise<ApiResponse<T>> {
    const request = () => axiosInstance.post<ApiResponse<T>>(url, data, config);
    
    if (enableRetry) {
      const response = await withRetry(request);
      return response.data;
    }
    
    const response = await request();
    return response.data;
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    enableRetry: boolean = true
  ): Promise<ApiResponse<T>> {
    const request = () => axiosInstance.put<ApiResponse<T>>(url, data, config);
    
    if (enableRetry) {
      const response = await withRetry(request);
      return response.data;
    }
    
    const response = await request();
    return response.data;
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    enableRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const request = () => axiosInstance.delete<ApiResponse<T>>(url, config);
    
    if (enableRetry) {
      const response = await withRetry(request);
      return response.data;
    }
    
    const response = await request();
    return response.data;
  }

  /**
   * 上传文件
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    enableRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    };

    const request = () => axiosInstance.post<ApiResponse<T>>(url, formData, config);
    
    if (enableRetry) {
      const response = await withRetry(request, {
        maxRetries: 2, // 文件上传只重试2次
        retryDelay: 2000
      });
      return response.data;
    }
    
    const response = await request();
    return response.data;
  }

  /**
   * 获取axios实例（用于特殊情况）
   */
  getAxiosInstance(): AxiosInstance {
    return axiosInstance;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
export default apiClient;
