import { performanceMonitor } from '../services/performanceMonitorService';

describe('Performance Monitor Service', () => {
  beforeEach(() => {
    // Reset metrics before each test
    performanceMonitor.reset();
  });

  describe('Tracking', () => {
    it('should start and end tracking successfully', (done) => {
      const taskId = 'test-task-1';
      
      performanceMonitor.startTracking(taskId, 1024000, 800, 600);
      
      // Add a small delay to ensure duration is calculated
      setTimeout(() => {
        performanceMonitor.endTracking(taskId);
        
        const stats = performanceMonitor.getStats();
        expect(stats.totalProcessed).toBe(1);
        expect(stats.successCount).toBe(1);
        expect(stats.errorCount).toBe(0);
        done();
      }, 10);
    });

    it('should track errors correctly', () => {
      const taskId = 'test-task-2';
      
      performanceMonitor.startTracking(taskId, 2048000, 1024, 768);
      performanceMonitor.endTrackingWithError(taskId, 'AI_SERVICE_ERROR');
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(0);
      expect(stats.errorCount).toBe(1);
      expect(stats.errorsByType['AI_SERVICE_ERROR']).toBe(1);
    });

    it('should calculate error rate correctly', () => {
      // Track 3 successful and 1 failed
      for (let i = 0; i < 3; i++) {
        performanceMonitor.startTracking(`success-${i}`, 1024000, 800, 600);
        performanceMonitor.endTracking(`success-${i}`);
      }
      
      performanceMonitor.startTracking('failed', 1024000, 800, 600);
      performanceMonitor.endTrackingWithError('failed', 'TIMEOUT_ERROR');
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalProcessed).toBe(4);
      expect(stats.errorRate).toBe(25); // 1 out of 4 = 25%
    });
  });

  describe('Statistics', () => {
    it('should calculate average processing time', (done) => {
      const taskId1 = 'task-1';
      const taskId2 = 'task-2';
      
      performanceMonitor.startTracking(taskId1, 1024000, 800, 600);
      setTimeout(() => {
        performanceMonitor.endTracking(taskId1);
        
        performanceMonitor.startTracking(taskId2, 1024000, 800, 600);
        setTimeout(() => {
          performanceMonitor.endTracking(taskId2);
          
          const stats = performanceMonitor.getStats();
          expect(stats.totalProcessed).toBe(2);
          expect(stats.averageProcessingTime).toBeGreaterThan(0);
          expect(stats.minProcessingTime).toBeGreaterThan(0);
          expect(stats.maxProcessingTime).toBeGreaterThan(0);
          done();
        }, 100);
      }, 100);
    });

    it('should group processing times by file size', (done) => {
      // Small file
      performanceMonitor.startTracking('small', 500000, 400, 300); // 0.5MB
      setTimeout(() => {
        performanceMonitor.endTracking('small');
        
        // Medium file
        performanceMonitor.startTracking('medium', 3000000, 1200, 900); // 3MB
        setTimeout(() => {
          performanceMonitor.endTracking('medium');
          
          // Large file
          performanceMonitor.startTracking('large', 8000000, 2400, 1800); // 8MB
          setTimeout(() => {
            performanceMonitor.endTracking('large');
            
            const stats = performanceMonitor.getStats();
            expect(stats.processingTimesBySize.small.length).toBe(1);
            expect(stats.processingTimesBySize.medium.length).toBe(1);
            expect(stats.processingTimesBySize.large.length).toBe(1);
            done();
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe('Report Generation', () => {
    it('should generate a performance report', (done) => {
      // Add some test data
      performanceMonitor.startTracking('task-1', 1024000, 800, 600);
      
      // Add a small delay to ensure duration is calculated
      setTimeout(() => {
        performanceMonitor.endTracking('task-1');
        
        performanceMonitor.startTracking('task-2', 2048000, 1024, 768);
        performanceMonitor.endTrackingWithError('task-2', 'AI_SERVICE_ERROR');
        
        const report = performanceMonitor.generateReport();
        
        expect(report).toContain('Performance Analysis Report');
        expect(report).toContain('Overall Statistics');
        expect(report).toContain('Processing Time Statistics');
        expect(report).toContain('Total Tasks Processed: 2');
        expect(report).toContain('Successful: 1');
        expect(report).toContain('Failed: 1');
        done();
      }, 10);
    });
  });

  describe('Detailed Metrics', () => {
    it('should return detailed metrics', () => {
      performanceMonitor.startTracking('task-1', 1024000, 800, 600);
      performanceMonitor.endTracking('task-1');
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].taskId).toBe('task-1');
      expect(metrics[0].status).toBe('success');
      expect(metrics[0].fileSize).toBe(1024000);
    });

    it('should limit history to MAX_HISTORY records', () => {
      // Add more than MAX_HISTORY records (1000)
      for (let i = 0; i < 1100; i++) {
        performanceMonitor.startTracking(`task-${i}`, 1024000, 800, 600);
        performanceMonitor.endTracking(`task-${i}`);
      }
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics.length).toBe(1000);
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      performanceMonitor.startTracking('task-1', 1024000, 800, 600);
      performanceMonitor.endTracking('task-1');
      
      let stats = performanceMonitor.getStats();
      expect(stats.totalProcessed).toBe(1);
      
      performanceMonitor.reset();
      
      stats = performanceMonitor.getStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });
});
