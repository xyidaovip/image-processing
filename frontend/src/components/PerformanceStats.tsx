import React, { useState, useEffect } from 'react';

interface PerformanceData {
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
    small: number[];
    medium: number[];
    large: number[];
  };
}

interface QueueData {
  queueLength: number;
  activeProcessing: number;
  maxConcurrent: number;
  maxQueueSize: number;
  queueUtilization: number;
  averageProcessingTime: number;
}

interface PerformanceStatsProps {
  apiUrl?: string;
  refreshInterval?: number;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  apiUrl = 'http://localhost:8000',
  refreshInterval = 5000
}) => {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/performance/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }
      
      const data = await response.json();
      if (data.success) {
        setPerformance(data.data.performance);
        setQueue(data.data.queue);
        setLastUpdate(new Date(data.data.timestamp));
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [apiUrl, refreshInterval]);

  const calculateAverage = (values: number[]): string => {
    if (values.length === 0) return 'N/A';
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.round(avg).toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading performance stats: {error}</p>
      </div>
    );
  }

  if (!performance || !queue) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Performance Monitor</h2>
        {lastUpdate && (
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Overall Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Overall Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Processed"
            value={performance.totalProcessed}
            color="blue"
          />
          <StatCard
            label="Successful"
            value={performance.successCount}
            color="green"
          />
          <StatCard
            label="Failed"
            value={performance.errorCount}
            color="red"
          />
          <StatCard
            label="Error Rate"
            value={`${performance.errorRate.toFixed(2)}%`}
            color={performance.errorRate > 10 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Processing Time Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Processing Time</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Average"
            value={`${(performance.averageProcessingTime / 1000).toFixed(2)}s`}
            color="blue"
          />
          <StatCard
            label="Min"
            value={`${(performance.minProcessingTime / 1000).toFixed(2)}s`}
            color="green"
          />
          <StatCard
            label="Max"
            value={`${(performance.maxProcessingTime / 1000).toFixed(2)}s`}
            color="orange"
          />
          <StatCard
            label="Total"
            value={`${(performance.totalProcessingTime / 1000).toFixed(2)}s`}
            color="purple"
          />
        </div>
      </div>

      {/* Processing Time by File Size */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Processing Time by File Size</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Small Files (&lt;1MB)</p>
            <p className="text-2xl font-bold text-gray-800">
              {calculateAverage(performance.processingTimesBySize.small)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {performance.processingTimesBySize.small.length} samples
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Medium Files (1-5MB)</p>
            <p className="text-2xl font-bold text-gray-800">
              {calculateAverage(performance.processingTimesBySize.medium)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {performance.processingTimesBySize.medium.length} samples
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Large Files (&gt;5MB)</p>
            <p className="text-2xl font-bold text-gray-800">
              {calculateAverage(performance.processingTimesBySize.large)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {performance.processingTimesBySize.large.length} samples
            </p>
          </div>
        </div>
      </div>

      {/* Queue Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Queue Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Queue Length"
            value={queue.queueLength}
            color="blue"
          />
          <StatCard
            label="Active Processing"
            value={queue.activeProcessing}
            color="green"
          />
          <StatCard
            label="Queue Utilization"
            value={`${queue.queueUtilization.toFixed(1)}%`}
            color={queue.queueUtilization > 80 ? 'red' : 'green'}
          />
          <StatCard
            label="Avg Time"
            value={`${queue.averageProcessingTime}s`}
            color="purple"
          />
        </div>
      </div>

      {/* Errors by Type */}
      {performance.errorCount > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Errors by Type</h3>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="space-y-2">
              {Object.entries(performance.errorsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-600">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({((count / performance.errorCount) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-800',
    orange: 'bg-orange-50 text-orange-800',
    purple: 'bg-purple-50 text-purple-800',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4`}>
      <p className="text-sm opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default PerformanceStats;
