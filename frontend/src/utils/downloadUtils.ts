/**
 * 下载图片工具函数
 */

interface DownloadOptions {
  filename: string;
  quality?: number;
  onProgress?: (progress: number) => void;
}

/**
 * 从URL下载图片并保存为JPG格式
 * @param imageUrl 图片URL
 * @param options 下载选项
 */
export const downloadImage = async (
  imageUrl: string,
  options: DownloadOptions
): Promise<void> => {
  const { filename, quality = 0.95, onProgress } = options

  try {
    // 报告开始下载
    onProgress?.(10)

    // 获取图片数据
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`)
    }

    onProgress?.(30)

    // 读取图片数据
    const blob = await response.blob()
    onProgress?.(50)

    // 如果已经是JPG格式且不需要转换，直接下载
    if (blob.type === 'image/jpeg') {
      downloadBlob(blob, filename)
      onProgress?.(100)
      return
    }

    // 转换为高质量JPG
    const jpegBlob = await convertToJPEG(blob, quality, (progress) => {
      // 转换进度映射到50-90%
      onProgress?.(50 + progress * 0.4)
    })

    onProgress?.(90)

    // 下载文件
    downloadBlob(jpegBlob, filename)
    onProgress?.(100)
  } catch (error) {
    console.error('下载图片失败:', error)
    throw new Error('下载图片失败，请重试')
  }
}

/**
 * 将图片转换为高质量JPG格式
 * @param blob 原始图片Blob
 * @param quality 质量 (0-1)
 * @param onProgress 进度回调
 */
const convertToJPEG = async (
  blob: Blob,
  quality: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      try {
        onProgress?.(0.2)

        // 创建canvas
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        onProgress?.(0.4)

        // 绘制图片
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('无法创建canvas上下文')
        }

        // 使用白色背景（JPG不支持透明）
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        onProgress?.(0.7)

        // 转换为JPG Blob
        canvas.toBlob(
          (jpegBlob) => {
            URL.revokeObjectURL(url)
            
            if (!jpegBlob) {
              reject(new Error('图片转换失败'))
              return
            }

            onProgress?.(1)
            resolve(jpegBlob)
          },
          'image/jpeg',
          quality
        )
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}

/**
 * 下载Blob为文件
 * @param blob 文件Blob
 * @param filename 文件名
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 从原始文件名生成处理后的文件名
 * @param originalFilename 原始文件名
 * @returns 处理后的文件名（添加_processed后缀，扩展名改为.jpg）
 */
export const generateProcessedFilename = (originalFilename: string): string => {
  // 移除扩展名
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '')
  
  // 添加_processed后缀和.jpg扩展名
  return `${nameWithoutExt}_processed.jpg`
}

/**
 * 验证URL是否有效
 * @param url URL字符串
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
