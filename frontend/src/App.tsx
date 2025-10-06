import { useState, useCallback, useEffect } from 'react'
import ImageUploader from './components/ImageUploader'
import ResultViewer from './components/ResultViewer'
import ProcessingProgress from './components/ProcessingProgress'
import { useImageDownload } from './hooks/useImageDownload'

type AppState = 'upload' | 'processing' | 'result'
type ProcessingStatus = 'uploading' | 'processing' | 'finalizing'

function App() {
  const [appState, setAppState] = useState<AppState>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('')
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('')
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('uploading')
  const [processingProgress, setProcessingProgress] = useState<number>(0)

  // 下载功能
  const { isDownloading, startDownload } = useImageDownload({
    imageUrl: processedImageUrl,
    originalFilename: selectedFile?.name || 'image.jpg',
    onSuccess: () => {
      console.log('下载成功')
    },
    onError: (error) => {
      console.error('下载失败:', error)
    }
  })

  // 模拟处理进度
  useEffect(() => {
    if (appState !== 'processing') return

    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      
      if (progress < 33) {
        setProcessingStatus('uploading')
      } else if (progress < 80) {
        setProcessingStatus('processing')
      } else {
        setProcessingStatus('finalizing')
      }

      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }

      setProcessingProgress(Math.min(progress, 100))
    }, 300)

    return () => clearInterval(interval)
  }, [appState])

  // 处理图片选择
  const handleImageSelect = useCallback((file: File) => {
    setSelectedFile(file)
    
    // 创建预览URL
    const url = URL.createObjectURL(file)
    setOriginalImageUrl(url)
    
    console.log('Selected file:', file.name, file.size, file.type)
    
    // 开始处理
    setAppState('processing')
    setProcessingProgress(0)
    setProcessingStatus('uploading')
    
    // TODO: 这里应该调用处理API
    // 暂时模拟处理完成，使用相同的图片作为处理结果
    setTimeout(() => {
      setProcessedImageUrl(url)
      setAppState('result')
    }, 3000)
  }, [])

  // 重置应用状态
  const handleReset = useCallback(() => {
    // 清理URL对象
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl)
    }
    if (processedImageUrl && processedImageUrl !== originalImageUrl) {
      URL.revokeObjectURL(processedImageUrl)
    }

    // 重置所有状态
    setAppState('upload')
    setSelectedFile(null)
    setOriginalImageUrl('')
    setProcessedImageUrl('')
    setProcessingProgress(0)
    setProcessingStatus('uploading')
    
    console.log('应用状态已重置')
  }, [originalImageUrl, processedImageUrl])

  // 处理下载
  const handleDownload = useCallback(async () => {
    await startDownload()
  }, [startDownload])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            图片背景处理工具
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            AI 智能抠图，一键生成白底产品图
          </p>
        </div>
        
        {/* Main Content */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-xl p-4 sm:p-6 md:p-8 transition-all duration-300">
          {appState === 'upload' && (
            <div className="animate-fadeIn">
              <ImageUploader
                onImageSelect={handleImageSelect}
                maxFileSize={10 * 1024 * 1024} // 10MB
                acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
              />
            </div>
          )}

          {appState === 'processing' && (
            <div className="animate-fadeIn py-8">
              <ProcessingProgress
                status={processingStatus}
                progress={processingProgress}
                estimatedTime={Math.ceil((100 - processingProgress) / 10)}
              />
            </div>
          )}

          {appState === 'result' && originalImageUrl && processedImageUrl && (
            <div className="animate-fadeIn">
              <ResultViewer
                originalImage={originalImageUrl}
                processedImage={processedImageUrl}
                onDownload={handleDownload}
                onReset={handleReset}
                isDownloading={isDownloading}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-500">
          <p>支持 JPG、PNG、WEBP 格式，最大 10MB</p>
        </div>
      </div>
    </div>
  )
}

export default App