// 文件验证相关的类型定义
export interface FileValidationConfig {
  maxFileSize: number
  acceptedFormats: string[]
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

// 支持的文件格式映射
export const FILE_FORMAT_NAMES: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP'
}

// 默认配置
export const DEFAULT_VALIDATION_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp']
}

/**
 * 验证文件格式
 * @param file 要验证的文件
 * @param acceptedFormats 允许的文件格式数组
 * @returns 验证结果
 */
export function validateFileFormat(file: File, acceptedFormats: string[]): ValidationResult {
  // 检查MIME类型
  if (!acceptedFormats.includes(file.type)) {
    const formatList = acceptedFormats
      .map(format => FILE_FORMAT_NAMES[format] || format)
      .join('、')
    
    return {
      isValid: false,
      error: `不支持的文件格式。请选择 ${formatList} 格式的图片。当前文件格式：${file.type || '未知'}`
    }
  }

  // 检查文件扩展名是否与MIME类型匹配
  if (!isFileExtensionValid(file)) {
    return {
      isValid: false,
      error: `文件扩展名与文件类型不匹配。请确保文件是有效的图片格式。`
    }
  }

  return { isValid: true }
}

/**
 * 验证文件大小
 * @param file 要验证的文件
 * @param maxFileSize 最大文件大小（字节）
 * @returns 验证结果
 */
export function validateFileSize(file: File, maxFileSize: number): ValidationResult {
  if (file.size === 0) {
    return {
      isValid: false,
      error: `文件为空或损坏。请选择有效的图片文件。`
    }
  }

  if (file.size > maxFileSize) {
    const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(0)
    const currentSizeMB = (file.size / 1024 / 1024).toFixed(2)
    return {
      isValid: false,
      error: `文件大小超过限制。当前文件大小：${currentSizeMB}MB，最大允许：${maxSizeMB}MB。请选择更小的图片文件。`
    }
  }

  return { isValid: true }
}

/**
 * 验证文件是否为有效的图片文件
 * @param file 要验证的文件
 * @returns Promise<ValidationResult>
 */
export function validateImageFile(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ isValid: true })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        isValid: false,
        error: '文件不是有效的图片格式或图片已损坏。'
      })
    }

    img.src = url
  })
}

/**
 * 综合验证文件
 * @param file 要验证的文件
 * @param config 验证配置
 * @returns Promise<ValidationResult>
 */
export async function validateFile(
  file: File, 
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<ValidationResult> {
  // 获取所有同步验证错误
  const syncErrors = getDetailedValidationErrors(file, config)
  
  if (syncErrors.length > 0) {
    return {
      isValid: false,
      error: createUserFriendlyErrorMessage(syncErrors)
    }
  }

  // 验证是否为有效图片（异步验证）
  const imageResult = await validateImageFile(file)
  if (!imageResult.isValid) {
    return imageResult
  }

  return { isValid: true }
}

/**
 * 获取文件信息摘要
 * @param file 文件对象
 * @returns 文件信息字符串
 */
export function getFileInfo(file: File): string {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2)
  const formatName = FILE_FORMAT_NAMES[file.type] || file.type
  
  return `${file.name} (${sizeMB}MB, ${formatName})`
}

/**
 * 检查文件扩展名是否匹配MIME类型
 * @param file 文件对象
 * @returns 是否匹配
 */
export function isFileExtensionValid(file: File): boolean {
  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  const extensionMap: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp']
  }

  const validExtensions = extensionMap[fileType]
  if (!validExtensions) {
    return false
  }

  return validExtensions.some(ext => fileName.endsWith(ext))
}

/**
 * 格式化文件大小为可读字符串
 * @param bytes 字节数
 * @returns 格式化的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 验证文件名是否安全
 * @param fileName 文件名
 * @returns 验证结果
 */
export function validateFileName(fileName: string): ValidationResult {
  // 检查文件名长度
  if (fileName.length > 255) {
    return {
      isValid: false,
      error: '文件名过长。请使用长度小于255个字符的文件名。'
    }
  }

  // 检查危险字符
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
  if (dangerousChars.test(fileName)) {
    return {
      isValid: false,
      error: '文件名包含不允许的字符。请使用标准的文件名。'
    }
  }

  return { isValid: true }
}

/**
 * 获取详细的文件验证错误信息
 * @param file 文件对象
 * @param config 验证配置
 * @returns 详细的错误信息数组
 */
export function getDetailedValidationErrors(
  file: File, 
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): string[] {
  const errors: string[] = []

  // 文件名验证
  const nameResult = validateFileName(file.name)
  if (!nameResult.isValid && nameResult.error) {
    errors.push(nameResult.error)
  }

  // 格式验证
  const formatResult = validateFileFormat(file, config.acceptedFormats)
  if (!formatResult.isValid && formatResult.error) {
    errors.push(formatResult.error)
  }

  // 大小验证
  const sizeResult = validateFileSize(file, config.maxFileSize)
  if (!sizeResult.isValid && sizeResult.error) {
    errors.push(sizeResult.error)
  }

  return errors
}

/**
 * 创建用户友好的错误提示
 * @param errors 错误信息数组
 * @returns 格式化的错误提示
 */
export function createUserFriendlyErrorMessage(errors: string[]): string {
  if (errors.length === 0) return ''
  
  if (errors.length === 1) {
    return errors[0]
  }

  return `发现以下问题：\n${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`
}