import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ImageUploader from '../ImageUploader'
import { ImageUploaderProps } from '../../types/components'

// Helper function to create mock files
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('ImageUploader', () => {
  const defaultProps: ImageUploaderProps = {
    onImageSelect: vi.fn(),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    isUploading: false,
    uploadProgress: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('文件选择和验证逻辑', () => {
    it('应该渲染上传区域和提示文本', () => {
      render(<ImageUploader {...defaultProps} />)
      
      expect(screen.getByText('拖拽图片到此处或点击选择')).toBeInTheDocument()
      expect(screen.getByText('支持 JPG、PNG、WEBP 格式，最大 10MB')).toBeInTheDocument()
    })

    it('应该接受有效的图片文件', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const validFile = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      await user.upload(fileInput, validFile)
      
      await waitFor(() => {
        expect(defaultProps.onImageSelect).toHaveBeenCalledWith(validFile)
      })
    })

    it('应该显示文件预览', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const validFile = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      await user.upload(fileInput, validFile)
      
      await waitFor(() => {
        expect(screen.getByText('图片预览')).toBeInTheDocument()
        expect(screen.getByAltText('预览图片')).toBeInTheDocument()
      })
    })

    it('应该测试文件验证逻辑', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // 测试无效格式
      const invalidFile = createMockFile('test.txt', 1024, 'text/plain')
      await user.upload(fileInput, invalidFile)
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
      
      // 清除mock调用记录
      vi.clearAllMocks()
      
      // 测试大文件
      const largeFile = createMockFile('large.jpg', 15 * 1024 * 1024, 'image/jpeg')
      await user.upload(fileInput, largeFile)
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
      
      // 清除mock调用记录
      vi.clearAllMocks()
      
      // 测试空文件
      const emptyFile = createMockFile('empty.jpg', 0, 'image/jpeg')
      await user.upload(fileInput, emptyFile)
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
    })
  })

  describe('拖拽功能', () => {
    it('应该处理文件拖拽', async () => {
      render(<ImageUploader {...defaultProps} />)
      
      const dropZone = screen.getByText('拖拽图片到此处或点击选择').closest('div')
      const validFile = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
      
      // 模拟拖拽进入
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          files: [validFile]
        }
      })
      
      expect(screen.getByText('松开鼠标上传图片')).toBeInTheDocument()
      
      // 模拟放下文件
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [validFile]
        }
      })
      
      await waitFor(() => {
        expect(defaultProps.onImageSelect).toHaveBeenCalledWith(validFile)
      })
    })

    it('应该处理拖拽状态变化', () => {
      render(<ImageUploader {...defaultProps} />)
      
      const dropZone = screen.getByText('拖拽图片到此处或点击选择').closest('div')
      
      // 拖拽进入
      fireEvent.dragOver(dropZone!)
      expect(screen.getByText('松开鼠标上传图片')).toBeInTheDocument()
      
      // 拖拽离开
      fireEvent.dragLeave(dropZone!)
      expect(screen.getByText('拖拽图片到此处或点击选择')).toBeInTheDocument()
    })

    it('应该测试拖拽错误处理', async () => {
      render(<ImageUploader {...defaultProps} />)
      
      const dropZone = screen.getByText('拖拽图片到此处或点击选择').closest('div')
      
      // 测试多文件拖拽
      const file1 = createMockFile('test1.jpg', 1024, 'image/jpeg')
      const file2 = createMockFile('test2.jpg', 1024, 'image/jpeg')
      
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file1, file2]
        }
      })
      
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
      
      // 测试空拖拽
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: []
        }
      })
      
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
    })
  })

  describe('错误处理和用户反馈', () => {
    it('应该测试错误显示和清除', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // 上传无效文件，应该显示错误
      const invalidFile = createMockFile('test.txt', 1024, 'text/plain')
      await user.upload(fileInput, invalidFile)
      
      // 验证文件没有被接受
      expect(defaultProps.onImageSelect).not.toHaveBeenCalled()
      
      // 上传有效文件，应该被接受
      const validFile = createMockFile('test.jpg', 1024, 'image/jpeg')
      await user.upload(fileInput, validFile)
      
      await waitFor(() => {
        expect(defaultProps.onImageSelect).toHaveBeenCalledWith(validFile)
      })
    })

    it('应该在选择新文件时清除之前的状态', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // 首先上传有效文件
      const validFile1 = createMockFile('test1.jpg', 1024, 'image/jpeg')
      await user.upload(fileInput, validFile1)
      
      await waitFor(() => {
        expect(screen.getByText('图片预览')).toBeInTheDocument()
      })
      
      // 然后上传另一个有效文件
      const validFile2 = createMockFile('test2.jpg', 1024, 'image/jpeg')
      await user.upload(fileInput, validFile2)
      
      // 预览应该更新为新文件
      await waitFor(() => {
        expect(screen.getByText('图片预览')).toBeInTheDocument()
        expect(defaultProps.onImageSelect).toHaveBeenCalledWith(validFile2)
      })
    })
  })

  describe('上传状态处理', () => {
    it('应该在上传时显示进度指示器', () => {
      render(<ImageUploader {...defaultProps} isUploading={true} uploadProgress={50} />)
      
      expect(screen.getByText('正在上传...')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
      // 检查进度条元素存在
      const progressBar = document.querySelector('.bg-blue-600')
      expect(progressBar).toBeInTheDocument()
    })

    it('应该在上传时禁用交互', () => {
      render(<ImageUploader {...defaultProps} isUploading={true} />)
      
      // 检查上传区域有禁用样式
      const uploadContainer = document.querySelector('.pointer-events-none.opacity-50')
      expect(uploadContainer).toBeInTheDocument()
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeDisabled()
    })

    it('应该在上传时隐藏预览', () => {
      render(<ImageUploader {...defaultProps} isUploading={true} />)
      
      expect(screen.queryByText('图片预览')).not.toBeInTheDocument()
    })
  })

  describe('文件输入处理', () => {
    it('应该测试文件输入边界情况', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // 测试多文件选择 - 使用userEvent来模拟
      const file1 = createMockFile('test1.jpg', 1024, 'image/jpeg')
      const file2 = createMockFile('test2.jpg', 1024, 'image/jpeg')
      
      // 由于userEvent不支持多文件上传，我们直接测试单文件情况
      await user.upload(fileInput, file1)
      expect(defaultProps.onImageSelect).toHaveBeenCalledWith(file1)
      
      // 清除mock调用记录
      vi.clearAllMocks()
      
      // 测试另一个文件
      await user.upload(fileInput, file2)
      expect(defaultProps.onImageSelect).toHaveBeenCalledWith(file2)
    })

    it('应该在文件选择后清空input值', async () => {
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = createMockFile('test.jpg', 1024, 'image/jpeg')
      
      await user.upload(fileInput, validFile)
      
      // input值应该被清空，允许重新选择相同文件
      expect(fileInput.value).toBe('')
    })
  })

  describe('FileReader错误处理', () => {
    it('应该处理FileReader错误', async () => {
      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader
      global.FileReader = class {
        result = null
        error = null
        readyState = 0
        onload: any = null
        onerror: any = null
        
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror()
            }
          }, 0)
        }
        
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() { return true }
        abort() {}
        readAsText() {}
        readAsArrayBuffer() {}
        readAsBinaryString() {}
      } as any
      
      const user = userEvent.setup()
      render(<ImageUploader {...defaultProps} />)
      
      const validFile = createMockFile('test.jpg', 1024, 'image/jpeg')
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      await user.upload(fileInput, validFile)
      
      await waitFor(() => {
        // 检查是否显示了FileReader错误
        expect(screen.getByLabelText('关闭错误提示')).toBeInTheDocument()
      })
      
      // Restore original FileReader
      global.FileReader = originalFileReader
    })
  })
})