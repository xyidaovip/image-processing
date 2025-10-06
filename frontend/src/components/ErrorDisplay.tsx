import React from 'react'
import { ErrorDisplayProps } from '../types/components'
import { AppError } from '../shared/types'
import { getUserFriendlyMessage, isRetryable, formatErrorDetails } from '../utils/errorHandler'

interface EnhancedErrorDisplayProps extends ErrorDisplayProps {
  appError?: AppError;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  appError,
  onDismiss,
  onRetry,
  type = 'error'
}) => {
  if (!error && !appError) return null

  // 如果提供了appError，使用它的信息
  const displayMessage = appError ? getUserFriendlyMessage(appError) : error;
  const canRetry = appError ? isRetryable(appError) : false;
  const details = appError ? formatErrorDetails(appError) : null;

  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'text-yellow-400 hover:text-yellow-600'
        }
      case 'info':
        return {
          icon: (
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'text-blue-400 hover:text-blue-600'
        }
      default: // error
        return {
          icon: (
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'text-red-400 hover:text-red-600'
        }
    }
  }

  const { icon, bgColor, borderColor, textColor, buttonColor } = getIconAndColors()

  return (
    <div className={`p-4 ${bgColor} border ${borderColor} rounded-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-3 flex-1">
            <p className={`${textColor} text-sm font-medium`}>{displayMessage}</p>
            {details && (
              <p className={`${textColor} text-xs mt-1 opacity-75`}>{details}</p>
            )}
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`${textColor} text-xs mt-2 underline hover:no-underline font-medium`}
              >
                点击重试
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${buttonColor} transition-colors duration-200 flex-shrink-0 ml-3`}
            aria-label="关闭错误提示"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorDisplay