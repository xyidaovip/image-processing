import {
  validateFileFormat,
  validateFileSize,
  validateFileName,
  getDetailedValidationErrors,
  createUserFriendlyErrorMessage,
  DEFAULT_VALIDATION_CONFIG,
  FILE_FORMAT_NAMES
} from '../fileValidation'

// Mock File constructor for testing
class MockFile implements File {
  name: string
  size: number
  type: string
  lastModified: number
  webkitRelativePath: string = ''

  constructor(name: string, size: number, type: string) {
    this.name = name
    this.size = size
    this.type = type
    this.lastModified = Date.now()
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Method not implemented.')
  }
  
  slice(): Blob {
    throw new Error('Method not implemented.')
  }
  
  stream(): ReadableStream<Uint8Array> {
    throw new Error('Method not implemented.')
  }
  
  text(): Promise<string> {
    throw new Error('Method not implemented.')
  }
}

describe('File Validation', () => {
  describe('validateFileFormat', () => {
    it('should accept valid image formats', () => {
      const jpgFile = new MockFile('test.jpg', 1000, 'image/jpeg')
      const pngFile = new MockFile('test.png', 1000, 'image/png')
      const webpFile = new MockFile('test.webp', 1000, 'image/webp')

      expect(validateFileFormat(jpgFile, DEFAULT_VALIDATION_CONFIG.acceptedFormats).isValid).toBe(true)
      expect(validateFileFormat(pngFile, DEFAULT_VALIDATION_CONFIG.acceptedFormats).isValid).toBe(true)
      expect(validateFileFormat(webpFile, DEFAULT_VALIDATION_CONFIG.acceptedFormats).isValid).toBe(true)
    })

    it('should reject invalid formats', () => {
      const txtFile = new MockFile('test.txt', 1000, 'text/plain')
      const result = validateFileFormat(txtFile, DEFAULT_VALIDATION_CONFIG.acceptedFormats)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('不支持的文件格式')
      expect(result.error).toContain('JPG、PNG、WEBP')
    })

    it('should show current file format in error message', () => {
      const txtFile = new MockFile('test.txt', 1000, 'text/plain')
      const result = validateFileFormat(txtFile, DEFAULT_VALIDATION_CONFIG.acceptedFormats)
      
      expect(result.error).toContain('当前文件格式：text/plain')
    })
  })

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const smallFile = new MockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg') // 5MB
      const result = validateFileSize(smallFile, DEFAULT_VALIDATION_CONFIG.maxFileSize)
      
      expect(result.isValid).toBe(true)
    })

    it('should reject files exceeding size limit', () => {
      const largeFile = new MockFile('test.jpg', 15 * 1024 * 1024, 'image/jpeg') // 15MB
      const result = validateFileSize(largeFile, DEFAULT_VALIDATION_CONFIG.maxFileSize)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('文件大小超过限制')
      expect(result.error).toContain('当前文件大小：15.00MB')
      expect(result.error).toContain('最大允许：10MB')
    })

    it('should reject empty files', () => {
      const emptyFile = new MockFile('test.jpg', 0, 'image/jpeg')
      const result = validateFileSize(emptyFile, DEFAULT_VALIDATION_CONFIG.maxFileSize)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('文件为空或损坏')
    })
  })

  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      const result = validateFileName('test-image_01.jpg')
      expect(result.isValid).toBe(true)
    })

    it('should reject file names with dangerous characters', () => {
      const result = validateFileName('test<script>.jpg')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('文件名包含不允许的字符')
    })

    it('should reject overly long file names', () => {
      const longName = 'a'.repeat(256) + '.jpg'
      const result = validateFileName(longName)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('文件名过长')
    })
  })

  describe('getDetailedValidationErrors', () => {
    it('should return multiple errors for invalid file', () => {
      const invalidFile = new MockFile('test<script>.txt', 15 * 1024 * 1024, 'text/plain')
      const errors = getDetailedValidationErrors(invalidFile, DEFAULT_VALIDATION_CONFIG)
      
      expect(errors.length).toBeGreaterThan(1)
      expect(errors.some(error => error.includes('文件名包含不允许的字符'))).toBe(true)
      expect(errors.some(error => error.includes('不支持的文件格式'))).toBe(true)
      expect(errors.some(error => error.includes('文件大小超过限制'))).toBe(true)
    })

    it('should return empty array for valid file', () => {
      const validFile = new MockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
      const errors = getDetailedValidationErrors(validFile, DEFAULT_VALIDATION_CONFIG)
      
      expect(errors.length).toBe(0)
    })
  })

  describe('createUserFriendlyErrorMessage', () => {
    it('should return single error message', () => {
      const errors = ['文件大小超过限制']
      const message = createUserFriendlyErrorMessage(errors)
      
      expect(message).toBe('文件大小超过限制')
    })

    it('should format multiple errors as numbered list', () => {
      const errors = ['文件大小超过限制', '不支持的文件格式']
      const message = createUserFriendlyErrorMessage(errors)
      
      expect(message).toContain('发现以下问题：')
      expect(message).toContain('1. 文件大小超过限制')
      expect(message).toContain('2. 不支持的文件格式')
    })

    it('should return empty string for no errors', () => {
      const message = createUserFriendlyErrorMessage([])
      expect(message).toBe('')
    })
  })
})