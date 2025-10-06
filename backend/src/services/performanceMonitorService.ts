interface ProcessingMetrics {
  taskId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error';
  errorType?: string;
  fileSize: number;
  imageWidth: number;
  imageHeight: number;
}

interface PerformanceStats {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalProcessingTime: number;
  errorsByType: Record<string, number>;
  processingTimesBySize: {
    small: number[];  // < 1MB
    medium: number[]; // 1-5MB
    large: number[];  // > 5MB
  };
}

class PerformanceMonitorService {
  private metrics: Map<string, ProcessingMetrics> = new Map();
  private completedMetrics: ProcessingMetrics[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 records

  /**
   * Start tracking a processing task
   */
  startTracking(taskId: string, fileSize: number, imageWidth: number, imageHeight: number): void {
    const metric: ProcessingMetrics = {
      taskId,
      startTime: Date.now(),
      status: 'success',
      fileSize,
      imageWidth,
      imageHeight,
    };
    this.metrics.set(taskId, metric);
  }

  /**
   * End tracking a processing task with success
   */
  endTracking(taskId: string): void {
    const metric = this.metrics.get(taskId);
    if (!metric) {
      console.warn(`No metric found for task ${taskId}`);
      return;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = 'success';

    this.completeMetric(taskId, metric);
  }

  /**
   * End tracking a processing task with error
   */
  endTrackingWithError(taskId: string, errorType: string): void {
    const metric = this.metrics.get(taskId);
    if (!metric) {
      console.warn(`No metric found for task ${taskId}`);
      return;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = 'error';
    metric.errorType = errorType;

    this.completeMetric(taskId, metric);
  }

  /**
   * Move metric to completed list and clean up
   */
  private completeMetric(taskId: string, metric: ProcessingMetrics): void {
    this.completedMetrics.push(metric);
    this.metrics.delete(taskId);

    // Keep only the last MAX_HISTORY records
    if (this.completedMetrics.length > this.MAX_HISTORY) {
      this.completedMetrics.shift();
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    const successMetrics = this.completedMetrics.filter(m => m.status === 'success' && m.duration);
    const errorMetrics = this.completedMetrics.filter(m => m.status === 'error');

    const processingTimes = successMetrics.map(m => m.duration!);
    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
    const averageProcessingTime = processingTimes.length > 0 
      ? totalProcessingTime / processingTimes.length 
      : 0;

    // Group by file size
    const processingTimesBySize = {
      small: [] as number[],
      medium: [] as number[],
      large: [] as number[],
    };

    successMetrics.forEach(m => {
      if (!m.duration) return;
      const sizeMB = m.fileSize / (1024 * 1024);
      if (sizeMB < 1) {
        processingTimesBySize.small.push(m.duration);
      } else if (sizeMB <= 5) {
        processingTimesBySize.medium.push(m.duration);
      } else {
        processingTimesBySize.large.push(m.duration);
      }
    });

    // Count errors by type
    const errorsByType: Record<string, number> = {};
    errorMetrics.forEach(m => {
      if (m.errorType) {
        errorsByType[m.errorType] = (errorsByType[m.errorType] || 0) + 1;
      }
    });

    return {
      totalProcessed: this.completedMetrics.length,
      successCount: successMetrics.length,
      errorCount: errorMetrics.length,
      errorRate: this.completedMetrics.length > 0 
        ? (errorMetrics.length / this.completedMetrics.length) * 100 
        : 0,
      averageProcessingTime: Math.round(averageProcessingTime),
      minProcessingTime: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
      maxProcessingTime: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
      totalProcessingTime,
      errorsByType,
      processingTimesBySize,
    };
  }

  /**
   * Generate detailed performance report
   */
  generateReport(): string {
    const stats = this.getStats();
    const report: string[] = [];

    report.push('=== Performance Analysis Report ===\n');
    report.push(`Generated at: ${new Date().toISOString()}\n`);
    
    report.push('\n--- Overall Statistics ---');
    report.push(`Total Tasks Processed: ${stats.totalProcessed}`);
    report.push(`Successful: ${stats.successCount}`);
    report.push(`Failed: ${stats.errorCount}`);
    report.push(`Error Rate: ${stats.errorRate.toFixed(2)}%`);
    
    report.push('\n--- Processing Time Statistics ---');
    report.push(`Average Processing Time: ${stats.averageProcessingTime}ms`);
    report.push(`Min Processing Time: ${stats.minProcessingTime}ms`);
    report.push(`Max Processing Time: ${stats.maxProcessingTime}ms`);
    report.push(`Total Processing Time: ${(stats.totalProcessingTime / 1000).toFixed(2)}s`);

    report.push('\n--- Processing Time by File Size ---');
    const avgSmall = this.calculateAverage(stats.processingTimesBySize.small);
    const avgMedium = this.calculateAverage(stats.processingTimesBySize.medium);
    const avgLarge = this.calculateAverage(stats.processingTimesBySize.large);
    
    report.push(`Small files (<1MB): ${avgSmall}ms (${stats.processingTimesBySize.small.length} samples)`);
    report.push(`Medium files (1-5MB): ${avgMedium}ms (${stats.processingTimesBySize.medium.length} samples)`);
    report.push(`Large files (>5MB): ${avgLarge}ms (${stats.processingTimesBySize.large.length} samples)`);

    if (stats.errorCount > 0) {
      report.push('\n--- Errors by Type ---');
      Object.entries(stats.errorsByType).forEach(([type, count]) => {
        const percentage = ((count / stats.errorCount) * 100).toFixed(2);
        report.push(`${type}: ${count} (${percentage}%)`);
      });
    }

    report.push('\n=== End of Report ===');
    
    return report.join('\n');
  }

  /**
   * Get detailed metrics for analysis
   */
  getDetailedMetrics(): ProcessingMetrics[] {
    return [...this.completedMetrics];
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  private calculateAverage(values: number[]): string {
    if (values.length === 0) return 'N/A';
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.round(avg).toString();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorService();
export default performanceMonitor;
