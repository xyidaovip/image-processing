import { useState, useCallback } from 'react'
import ImageUploader from './components/ImageUploader'
import ResultViewer from './components/ResultViewer'
import ProcessingProgress from './components/ProcessingProgress'
import ErrorDisplay from './components/ErrorDisplay' // 用于显示错误
import { apiClient } from './utils/apiClient'; // 假设的API客户端

// 定义一些基本类型
type AppState = 'upload' | 'processing' | 'result' | 'error';
interface Task {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  error?: string;
}
interface UploadResponse {
  uploadId: string;
  filePath: string;
}
interface ProcessRequest {
  uploadId: string;
  operations: { type: string; parameters?: any; }[];
}

function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleImageSelect = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setOriginalImageUrl(objectUrl);
    setAppState('processing');
    setError(''); // 清除之前的错误

    try {
      // --- 真实API调用逻辑 ---
      // 1. 上传图片
      const formData = new FormData();
      formData.append('image', file);
      const uploadResponse = await apiClient.post<UploadResponse>('/upload', formData);
      const { uploadId } = uploadResponse;

      // 2. 请求处理
      const processPayload: ProcessRequest = {
        uploadId,
        operations: [
          { type: 'removeBackground' },
          { type: 'resize', parameters: { width: 500, height: 500 } }
        ]
      };
      const processResponse = await apiClient.post<Task>('/process', processPayload);
      const { taskId } = processResponse;

      // 3. 轮询状态
      const pollStatus = async () => {
        const statusResponse = await apiClient.get<Task>(`/process/status/${taskId}`);
        if (statusResponse.status === 'completed' && statusResponse.resultUrl) {
          setProcessedImageUrl(statusResponse.resultUrl);
          setAppState('result');
        } else if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || '图片处理失败');
        } else {
          setTimeout(pollStatus, 2000); // 2秒后再次检查
        }
      };
      await pollStatus();

    } catch (err: any) {
      console.error('处理流程出错:', err);
      setError(err.message || '发生未知错误，请重试。');
      setAppState('error');
    }
  }, []);

  const handleReset = useCallback(() => {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    setAppState('upload');
    setOriginalImageUrl('');
    setProcessedImageUrl('');
    setError('');
  }, [originalImageUrl]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">图片背景处理</h1>
        {appState === 'upload' && <ImageUploader onImageSelect={handleImageSelect} />}
        {appState === 'processing' && <ProcessingProgress status="processing" progress={50} />}
        {appState === 'result' && <ResultViewer originalImage={originalImageUrl} processedImage={processedImageUrl} onReset={handleReset} onDownload={() => window.open(processedImageUrl, '_blank')} isDownloading={false}/>}
        {appState === 'error' && <ErrorDisplay message={error} onRetry={handleReset} />}
      </div>
    </div>
  );
}

export default App;
