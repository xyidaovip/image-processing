# Performance Monitoring System

## Overview

The performance monitoring system tracks and analyzes image processing tasks to provide insights into system performance, error rates, and processing times.

## Features

### 1. Processing Time Statistics
- Average, minimum, and maximum processing times
- Total processing time across all tasks
- Processing time breakdown by file size (small, medium, large)

### 2. Error Rate Monitoring
- Total error count and success count
- Error rate percentage
- Errors categorized by type (AI_SERVICE_ERROR, IMAGE_PROCESSING_ERROR, TIMEOUT_ERROR, etc.)

### 3. Performance Analysis Reports
- Detailed text-based reports
- Statistics grouped by categories
- Historical data analysis

## API Endpoints

### GET /api/performance/stats
Returns current performance statistics including:
- Overall statistics (total processed, success/error counts, error rate)
- Processing time statistics
- Queue status
- Error breakdown by type

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "totalProcessed": 150,
      "successCount": 145,
      "errorCount": 5,
      "errorRate": 3.33,
      "averageProcessingTime": 15234,
      "minProcessingTime": 8500,
      "maxProcessingTime": 28000,
      "totalProcessingTime": 2285100,
      "errorsByType": {
        "AI_SERVICE_ERROR": 3,
        "TIMEOUT_ERROR": 2
      },
      "processingTimesBySize": {
        "small": [8500, 9200, 8800],
        "medium": [15000, 16000, 14500],
        "large": [25000, 28000, 26500]
      }
    },
    "queue": {
      "queueLength": 2,
      "activeProcessing": 1,
      "maxConcurrent": 3,
      "maxQueueSize": 50,
      "queueUtilization": 4.0,
      "averageProcessingTime": 15
    },
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

### GET /api/performance/report
Generates a detailed text-based performance report.

**Response:** Plain text report
```
=== Performance Analysis Report ===
Generated at: 2025-10-05T12:34:56.789Z

--- Overall Statistics ---
Total Tasks Processed: 150
Successful: 145
Failed: 5
Error Rate: 3.33%

--- Processing Time Statistics ---
Average Processing Time: 15234ms
Min Processing Time: 8500ms
Max Processing Time: 28000ms
Total Processing Time: 2285.10s

--- Processing Time by File Size ---
Small files (<1MB): 8833ms (45 samples)
Medium files (1-5MB): 15167ms (80 samples)
Large files (>5MB): 26500ms (20 samples)

--- Errors by Type ---
AI_SERVICE_ERROR: 3 (60.00%)
TIMEOUT_ERROR: 2 (40.00%)

=== End of Report ===
```

### GET /api/performance/metrics
Returns detailed metrics for all tracked tasks (up to last 1000).

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "taskId": "abc-123",
        "startTime": 1696512896789,
        "endTime": 1696512911023,
        "duration": 14234,
        "status": "success",
        "fileSize": 2048000,
        "imageWidth": 1024,
        "imageHeight": 768
      }
    ],
    "count": 150,
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

### POST /api/performance/reset
Resets all performance statistics (only available in non-production environments).

**Response:**
```json
{
  "success": true,
  "message": "Performance statistics reset successfully"
}
```

## Integration

The performance monitoring is automatically integrated into the processing pipeline:

```typescript
import { performanceMonitor } from './services/performanceMonitorService';

// Start tracking
performanceMonitor.startTracking(taskId, fileSize, imageWidth, imageHeight);

try {
  // Process image...
  
  // End tracking on success
  performanceMonitor.endTracking(taskId);
} catch (error) {
  // End tracking on error
  performanceMonitor.endTrackingWithError(taskId, errorType);
}
```

## Frontend Component

Use the `PerformanceStats` component to display real-time performance metrics:

```tsx
import { PerformanceStats } from './components/PerformanceStats';

function AdminDashboard() {
  return (
    <div>
      <h1>System Dashboard</h1>
      <PerformanceStats 
        apiUrl="http://localhost:8000"
        refreshInterval={5000}
      />
    </div>
  );
}
```

## File Size Categories

- **Small**: < 1MB
- **Medium**: 1-5MB
- **Large**: > 5MB

## Error Types

- `AI_SERVICE_ERROR`: AI service unavailable or inference failed
- `IMAGE_PROCESSING_ERROR`: Image processing operation failed
- `TIMEOUT_ERROR`: Processing exceeded time limit
- `MEMORY_ERROR`: Insufficient memory for processing
- `UNKNOWN_ERROR`: Unclassified error

## Data Retention

The system maintains a rolling history of the last 1000 completed tasks to prevent memory issues in long-running processes.

## Use Cases

1. **System Health Monitoring**: Track error rates and identify issues
2. **Performance Optimization**: Identify bottlenecks and slow operations
3. **Capacity Planning**: Understand queue utilization and processing times
4. **Debugging**: Analyze error patterns and failure modes
5. **Reporting**: Generate reports for stakeholders

## Best Practices

1. Monitor error rates regularly - rates above 10% indicate system issues
2. Check queue utilization - values above 80% suggest capacity constraints
3. Review processing times by file size to optimize for common use cases
4. Use the detailed metrics endpoint for in-depth analysis
5. Generate reports periodically for historical tracking
