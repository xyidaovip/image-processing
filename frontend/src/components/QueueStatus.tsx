import React from 'react';

interface QueueStatusProps {
  queuePosition?: number;
  estimatedWaitTime?: number;
  showDetails?: boolean;
}

const QueueStatus: React.FC<QueueStatusProps> = ({
  queuePosition,
  estimatedWaitTime,
  showDetails = true
}) => {
  if (!queuePosition && !estimatedWaitTime) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}分钟`;
    }
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">处理队列中</h3>
          {showDetails && (
            <div className="mt-2 text-sm text-blue-700">
              {queuePosition !== undefined && queuePosition > 0 && (
                <p className="mb-1">
                  队列位置: <span className="font-semibold">{queuePosition}</span>
                </p>
              )}
              {estimatedWaitTime !== undefined && estimatedWaitTime > 0 && (
                <p>
                  预计等待时间:{' '}
                  <span className="font-semibold">{formatTime(estimatedWaitTime)}</span>
                </p>
              )}
            </div>
          )}
          <div className="mt-3">
            <div className="flex items-center">
              <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full animate-pulse" style={{ width: '30%' }} />
              </div>
              <span className="ml-2 text-xs text-blue-600">处理中...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueStatus;
