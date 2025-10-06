import React, { useState, useEffect } from 'react';
import { networkStatusManager } from '../utils/networkHandler';

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState(networkStatusManager.getStatus());
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((online) => {
      setIsOnline(online);
      
      // 通知父组件
      if (onStatusChange) {
        onStatusChange(online);
      }

      // 如果离线，显示消息
      if (!online) {
        setShowOfflineMessage(true);
      } else {
        // 如果重新上线，3秒后隐藏消息
        setTimeout(() => {
          setShowOfflineMessage(false);
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onStatusChange]);

  // 如果在线且不需要显示消息，不渲染任何内容
  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center text-white text-sm">
          {isOnline ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>网络连接已恢复</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>网络连接已断开，请检查网络设置</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
