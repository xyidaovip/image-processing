import express from 'express';
import {
  getPerformanceStats,
  generatePerformanceReport,
  getDetailedMetrics,
  resetPerformanceStats
} from '../controllers/performanceController';

const router = express.Router();

/**
 * GET /api/performance/stats
 * 获取性能统计信息
 */
router.get('/stats', getPerformanceStats);

/**
 * GET /api/performance/report
 * 生成性能分析报告（文本格式）
 */
router.get('/report', generatePerformanceReport);

/**
 * GET /api/performance/metrics
 * 获取详细的性能指标数据
 */
router.get('/metrics', getDetailedMetrics);

/**
 * POST /api/performance/reset
 * 重置性能统计（仅测试环境）
 */
router.post('/reset', resetPerformanceStats);

export default router;
