import { useEffect, useState } from 'react'

interface ProcessingProgressProps {
  status: 'uploading' | 'processing' | 'finalizing'
  progress: number
  estimatedTime?: number
}

const ProcessingProgress = ({ status, progress, estimatedTime }: ProcessingProgressProps) => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return '上传图片中'
      case 'processing':
        return 'AI 处理中'
      case 'finalizing':
        return '生成最终图片'
      default:
        return '处理中'
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* 动画图标 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>

        {/* 状态文本 */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {getStatusText()}{dots}
          </h3>
          <p className="text-sm text-gray-600">
            请稍候，正在处理您的图片
          </p>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{progress}%</span>
            {estimatedTime && (
              <span>预计剩余 {estimatedTime} 秒</span>
            )}
          </div>
        </div>

        {/* 处理步骤指示器 */}
        <div className="flex justify-between items-center mt-6">
          <div className={`flex flex-col items-center ${status === 'uploading' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              status === 'uploading' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {progress > 33 ? '✓' : '1'}
            </div>
            <span className="text-xs">上传</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-200 mx-2">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: progress > 33 ? '100%' : '0%' }}
            ></div>
          </div>
          
          <div className={`flex flex-col items-center ${status === 'processing' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              status === 'processing' ? 'bg-blue-600 text-white' : progress > 66 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {progress > 66 ? '✓' : '2'}
            </div>
            <span className="text-xs">处理</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-200 mx-2">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: progress > 66 ? '100%' : '0%' }}
            ></div>
          </div>
          
          <div className={`flex flex-col items-center ${status === 'finalizing' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              status === 'finalizing' ? 'bg-blue-600 text-white' : progress === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {progress === 100 ? '✓' : '3'}
            </div>
            <span className="text-xs">完成</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProcessingProgress
