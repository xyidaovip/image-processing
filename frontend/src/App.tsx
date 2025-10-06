import { useState } from 'react'
import './App.css'
import ImageUploader from './components/ImageUploader'
import ProcessingProgress from './components/ProcessingProgress'
import ResultViewer from './components/ResultViewer'
import ErrorDisplay from './components/ErrorDisplay'
import { AppState, ProcessRequest, Task, UploadResponse } from './types/components'
import { apiClient } from './utils/apiClient'


function App() {
  const [appState, setAppState] = useState<AppState>('upload')
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('')
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleImageUpload = async (file: File) => {
    setOriginalImageUrl(URL.createObjectURL(file))
    setAppState('processing')

    try {
      // 1. Upload the image
      const formData = new FormData()
      formData.append('image', file)
      const uploadResponse = await apiClient.post<UploadResponse>('/upload', formData)
      const { uploadId } = uploadResponse

      // 2. Start processing
      const processResponse = await apiClient.post<Task>('/process', {
        uploadId,
        operations: [{
          type: 'removeBackground'
        }, {
          type: 'resize',
          parameters: {
            width: 500,
            height: 500
          }
        }]
      } as ProcessRequest)
      const { taskId } = processResponse

      // 3. Poll for status
      const pollStatus = async () => {
        const statusResponse = await apiClient.get<Task>(`/process/status/${taskId}`)
        if (statusResponse.status === 'completed') {
          setProcessedImageUrl(statusResponse.resultUrl as string)
          setAppState('result')
        } else if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || '处理失败');
        } else {
          setTimeout(pollStatus, 2000) // Poll every 2 seconds
        }
      }
      pollStatus()

    } catch (err) {
      setError((err as Error).message)
      setAppState('error')
    }
  }

  const handleRetry = () => {
    setAppState('upload')
    setOriginalImageUrl('')
    setProcessedImageUrl('')
    setError('')
  }

  return (
    <div className="App">
      {appState === 'upload' && <ImageUploader onImageUpload={handleImageUpload} />}
      {appState === 'processing' && <ProcessingProgress />}
      {appState === 'result' && <ResultViewer originalUrl={originalImageUrl} processedUrl={processedImageUrl} onRetry={handleRetry} />}
      {appState === 'error' && <ErrorDisplay message={error} onRetry={handleRetry} />}
    </div>
  )
}

export default App
