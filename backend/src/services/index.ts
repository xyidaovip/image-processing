/**
 * 服务导出文件
 * 统一导出所有服务实例
 */

import ImageProcessingServiceImpl from './imageProcessingService';
import path from 'path';

// 创建处理后图像的输出目录
const PROCESSED_DIR = path.join(process.cwd(), 'uploads', 'processed');

// 导出图像处理服务实例
export const imageProcessingService = new ImageProcessingServiceImpl(PROCESSED_DIR);

// 导出服务类供测试使用
export { ImageProcessingServiceImpl };

// 导出任务管理和处理管道服务
export { taskManagerService } from './taskManagerService';
export { processingPipelineService } from './processingPipelineService';
export { performanceMonitor } from './performanceMonitorService';
