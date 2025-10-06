import '@testing-library/jest-dom'

// Mock FileReader for tests
global.FileReader = class {
  result: string | ArrayBuffer | null = null
  error: any = null
  readyState: number = 0
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null

  readAsDataURL(file: Blob) {
    this.readyState = 1
    setTimeout(() => {
      this.result = `data:${file.type};base64,mock-base64-data`
      this.readyState = 2
      if (this.onload) {
        this.onload({ target: this } as any)
      }
    }, 0)
  }

  readAsText() {}
  readAsArrayBuffer() {}
  readAsBinaryString() {}
  abort() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src: string = ''

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
} as any