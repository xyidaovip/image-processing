import express from 'express';
import {
  startProcessing,
  getProcessingStatus,
  getQueueStats,
  checkHealth
} from '../controllers/processController';
import { processRateLimiter, generalRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * 处理路由
 * 需求: 6.1, 6.2, 6.4
 */

// POST /api/process - 启动图片处理（带速率限制）
router.post('/', processRateLimiter, startProcessing);

// GET /api/process/status/:taskId - 查询处理状态
router.get('/status/:taskId', generalRateLimiter, getProcessingStatus);

// GET /api/process/queue - 获取队列统计
router.get('/queue', generalRateLimiter, getQueueStats);

// GET /api/process/health - 健康检查
router.get('/health', checkHealth);

export default router;
