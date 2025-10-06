import { useState, useCallback } from 'react'
import { downloadImage, generateProcessedFilename } from '../utils/downloadUtils'

interface UseImageDownloadOptions {
  imageUrl: string;
  originalFilename: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseImageDownloadReturn {
  isDownloading: boolean;
  downloadProgress: number;
  error: string | null;
  startDownload: () => Promise<void>;
  clearError: () => void;
}

/**
 * 图片下载Hook
 * 管理下载状态、进度和错误处理
 */
export const useImageDownload = ({
  imageUrl,
  originalFilename,
  onSuccess,
  onError
}: UseImageDownloadOptions): UseImageDownloadReturn => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const startDownload = useCallback(async () => {
    if (isDownloading) return

    try {
      setIsDownloading(true)
      setDownloadProgress(0)
      setError(null)

      // 生成处理后的文件名
      const filename = generateProcessedFilename(originalFilename)

      // 下载图片
      await downloadImage(imageUrl, {
        filename,
        quality: 0.95,
        onProgress: (progress) => {
          setDownloadProgress(progress)
        }
      })

      // 下载成功
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '下载失败，请重试'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsDownloading(false)
      // 保持进度显示一小段时间
      setTimeout(() => {
        setDownloadProgress(0)
      }, 1000)
    }
  }, [imageUrl, originalFilename, isDownloading, onSuccess, onError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isDownloading,
    downloadProgress,
    error,
    startDownload,
    clearError
  }
}
