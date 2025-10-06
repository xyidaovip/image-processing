import React, { useState } from 'react'
import { ResultViewerProps } from '../types/components'

const ResultViewer: React.FC<ResultViewerProps> = ({
  originalImage,
  processedImage,
  onDownload,
  onReset,
  isDownloading = false
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side')
  const [sliderPosition, setSliderPosition] = useState(50)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  // 处理滑块拖动
  const handleSliderMouseDown = () => {
    setIsDragging(true)
  }

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  const handleSliderMouseUp = () => {
    setIsDragging(false)
  }

  // 缩放控制
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomReset = () => {
    setZoomLevel(1)
  }

  return (
    <div className="w-full space-y-6">
      {/* 控制栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        {/* 视图模式切换 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-xs sm:text-sm font-medium text-gray-700">查看模式：</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              并排对比
            </button>
            <button
              onClick={() => setViewMode('slider')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-l border-gray-300 ${
                viewMode === 'slider'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              滑动对比
            </button>
          </div>
        </div>

        {/* 缩放控制 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-xs sm:text-sm font-medium text-gray-700">缩放：</span>
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="缩小"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors min-w-[60px]"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="放大"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 图片对比区域 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {viewMode === 'side-by-side' ? (
          // 并排对比模式
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-6">
            {/* 原始图片 */}
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 text-center">处理前</h3>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                <div className="absolute inset-0 flex items-center justify-center overflow-auto">
                  <img
                    src={originalImage}
                    alt="原始图片"
                    className="object-contain transition-transform duration-200"
                    style={{ 
                      transform: `scale(${zoomLevel})`,
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 处理后图片 */}
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 text-center">处理后</h3>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                <div className="absolute inset-0 flex items-center justify-center overflow-auto">
                  <img
                    src={processedImage}
                    alt="处理后图片"
                    className="object-contain transition-transform duration-200"
                    style={{ 
                      transform: `scale(${zoomLevel})`,
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 滑动对比模式
          <div className="p-3 sm:p-6">
            <div
              className="relative bg-gray-100 rounded-lg overflow-hidden cursor-col-resize select-none touch-none"
              style={{ minHeight: '300px' }}
              onMouseMove={handleSliderMouseMove}
              onMouseUp={handleSliderMouseUp}
              onMouseLeave={handleSliderMouseUp}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                const rect = e.currentTarget.getBoundingClientRect()
                const x = touch.clientX - rect.left
                const percentage = (x / rect.width) * 100
                setSliderPosition(Math.max(0, Math.min(100, percentage)))
              }}
            >
              {/* 处理后图片（底层） */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={processedImage}
                  alt="处理后图片"
                  className="object-contain transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              </div>

              {/* 原始图片（顶层，带裁剪） */}
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={originalImage}
                  alt="原始图片"
                  className="object-contain transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              </div>

              {/* 滑块 */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>

              {/* 标签 */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-black bg-opacity-60 text-white text-xs font-medium rounded">
                处理前
              </div>
              <div className="absolute top-4 right-4 px-3 py-1 bg-black bg-opacity-60 text-white text-xs font-medium rounded">
                处理后
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 处理结果信息 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 sm:p-6 border border-green-200 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">处理完成！</h3>
            <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
              您的图片已成功处理。背景已移除并替换为纯白色，图片尺寸已标准化为 1200x1200 像素。
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>输出格式: 高质量 JPG</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>尺寸: 1200 x 1200 px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              <span>下载中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>下载处理后图片</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>处理新图片</span>
        </button>
      </div>
    </div>
  )
}

export default ResultViewer
