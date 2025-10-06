import React, { useState, useRef, useCallback } from 'react'
import { ImageUploaderProps } from '../types/components'
import { validateFile } from '../utils/fileValidation'
import ErrorDisplay from './ErrorDisplay'

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  maxFileSize,
  acceptedFormats,
  isUploading = false,
  uploadProgress = 0
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证文件
  const validateFileAsync = useCallback(async (file: File): Promise<string | null> => {
    try {
      const result = await validateFile(file, { maxFileSize, acceptedFormats })
      return result.isValid ? null : result.error || '文件验证失败'
    } catch (error) {
      console.error('文件验证过程中发生错误:', error)
      return '文件验证过程中发生错误，请重试'
    }
  }, [acceptedFormats, maxFileSize])

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    // 清除之前的错误和预览
    setError(null)
    setPreview(null)

    // 验证文件
    const validationError = await validateFileAsync(file)
    
    if (validationError) {
      setError(validationError)
      return
    }

    // 创建预览
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          setPreview(result)
        }
      }
      reader.onerror = () => {
        setError('无法读取文件。请确保文件未损坏。')
      }
      reader.readAsDataURL(file)

      // 调用父组件回调
      onImageSelect(file)
    } catch (error) {
      console.error('文件读取错误:', error)
      setError('文件读取失败，请重试')
    }
  }, [validateFileAsync, onImageSelect])

  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    
    if (files.length === 0) {
      setError('未检测到文件。请重试。')
      return
    }

    if (files.length > 1) {
      setError('一次只能上传一个文件。请选择单个图片文件。')
      return
    }

    handleFileSelect(files[0])
  }, [handleFileSelect])

  // 处理点击选择
  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }, [isUploading])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    
    if (!files || files.length === 0) {
      return
    }

    if (files.length > 1) {
      setError('一次只能上传一个文件。请选择单个图片文件。')
      return
    }

    handleFileSelect(files[0])
    
    // 清空input值，允许重新选择相同文件
    e.target.value = ''
  }, [handleFileSelect])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div className="w-full">
      {/* 错误提示 */}
      {error && (
        <div className="mb-4">
          <ErrorDisplay
            error={error}
            onDismiss={clearError}
            type="error"
          />
        </div>
      )}

      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            <div>
              <p className="text-gray-600 mb-2">正在上传...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <svg className="mx-auto w-12 h-12 sm:w-16 sm:h-16 text-gray-400 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
            </svg>
            
            <div>
              <p className="text-base sm:text-lg text-gray-700 mb-2 font-medium">
                {isDragOver ? '松开鼠标上传图片' : '拖拽图片到此处或点击选择'}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                支持 JPG、PNG、WEBP 格式，最大 {(maxFileSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>

            <button
              type="button"
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm sm:text-base"
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
            >
              选择图片
            </button>
          </div>
        )}
      </div>

      {/* 预览区域 */}
      {preview && !isUploading && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg animate-fadeIn">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">图片预览</h3>
          <div className="flex justify-center">
            <img
              src={preview}
              alt="预览图片"
              className="max-w-full max-h-48 sm:max-h-64 md:max-h-80 object-contain rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUploader