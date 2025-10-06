import { Request, Response } from 'express';
import { performanceMonitor } from '../services/performanceMonitorService';
import { processingPipelineService } from '../services/processingPipelineService';

/**
 * 获取性能统计信息
 */
export const getPerformanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = performanceMonitor.getStats();
    const processingStats = processingPipelineService.getProcessingStats();

    res.json({
      success: true,
      data: {
        performance: stats,
        queue: processingStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance statistics'
    });
  }
};

/**
 * 生成性能分析报告
 */
export const generatePerformanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = performanceMonitor.generateReport();
    
    // 返回纯文本报告
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
};

/**
 * 获取详细的性能指标数据
 */
export const getDetailedMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = performanceMonitor.getDetailedMetrics();
    
    res.json({
      success: true,
      data: {
        metrics,
        count: metrics.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting detailed metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve detailed metrics'
    });
  }
};

/**
 * 重置性能统计（仅用于测试环境）
 */
export const resetPerformanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 仅在非生产环境允许重置
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: 'Reset not allowed in production environment'
      });
      return;
    }

    performanceMonitor.reset();
    
    res.json({
      success: true,
      message: 'Performance statistics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance statistics'
    });
  }
};
