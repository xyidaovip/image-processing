// 图片上传组件接口
export interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  maxFileSize: number;
  acceptedFormats: string[];
  isUploading?: boolean;
  uploadProgress?: number;
}

// 图片处理组件接口
export interface ImageProcessorProps {
  originalImage: File;
  onProcessComplete: (processedImage: Blob) => void;
  onError: (error: string) => void;
  onProgressUpdate?: (progress: number) => void;
}

// 结果预览组件接口
export interface ResultViewerProps {
  originalImage: string;
  processedImage: string;
  onDownload: () => void;
  onReset: () => void;
  isDownloading?: boolean;
}

// 错误显示组件接口
export interface ErrorDisplayProps {
  error: string | null;
  onDismiss: () => void;
  type?: 'error' | 'warning' | 'info';
}

// 进度指示器组件接口
export interface ProgressIndicatorProps {
  progress: number;
  status: string;
  estimatedTime?: number;
}

// 文件拖拽区域组件接口
export interface DropZoneProps {
  onFilesDrop: (files: FileList) => void;
  acceptedFormats: string[];
  maxFileSize: number;
  children: React.ReactNode;
}