# API 文档 (API Documentation)

## 目录

- [概述](#概述)
- [基础信息](#基础信息)
- [认证](#认证)
- [通用响应格式](#通用响应格式)
- [错误处理](#错误处理)
- [API端点](#api端点)
  - [健康检查](#健康检查)
  - [文件上传](#文件上传)
  - [图片处理](#图片处理)
  - [性能监控](#性能监控)
- [使用示例](#使用示例)
- [速率限制](#速率限制)
- [最佳实践](#最佳实践)

---

## 概述

图片背景处理工具提供RESTful API，用于上传产品图片、自动移除背景、替换为白色背景，并输出标准化的1200x1200像素图片。

### 主要功能

- ✅ 图片上传和验证
- ✅ AI自动背景移除
- ✅ 白色背景替换
- ✅ 图片尺寸标准化
- ✅ 处理进度跟踪
- ✅ 结果下载

---

## 基础信息

### 服务地址

**开发环境：**
- 后端API: `http://localhost:3000`
- AI服务: `http://localhost:8001`

**生产环境：**
- 后端API: `https://api.your-domain.com`
- AI服务: `https://ai.your-domain.com`

### API版本

当前版本: `v1`

所有API端点都以 `/api` 为前缀。

### 支持的内容类型

- `application/json`
- `multipart/form-data` (文件上传)

---

## 认证

当前版本不需要认证。未来版本可能会添加API密钥或OAuth2认证。

---

## 通用响应格式

所有API响应都遵循统一的JSON格式。

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "错误描述信息",
    "code": 400,
    "details": {
      // 可选的详细错误信息
    }
  }
}
```

---

## 错误处理

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 413 | 请求体过大 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

### 错误类型

| 错误类型 | 说明 | HTTP状态码 |
|----------|------|------------|
| `UPLOAD_ERROR` | 文件上传错误 | 400 |
| `FILE_SIZE_ERROR` | 文件大小超限 | 413 |
| `FORMAT_ERROR` | 文件格式不支持 | 400 |
| `VALIDATION_ERROR` | 参数验证错误 | 400 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `PROCESSING_ERROR` | 图片处理错误 | 500 |
| `AI_MODEL_ERROR` | AI模型错误 | 500 |
| `NETWORK_ERROR` | 网络连接错误 | 503 |
| `RATE_LIMIT_ERROR` | 请求频率超限 | 429 |
| `SERVER_ERROR` | 服务器内部错误 | 500 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "type": "FILE_SIZE_ERROR",
    "message": "文件大小超过限制，最大允许10MB",
    "code": 413,
    "details": {
      "maxSize": 10485760,
      "actualSize": 15728640
    }
  }
}
```

---

## API端点

### 健康检查

#### 后端健康检查

检查后端服务是否正常运行。

**端点：** `GET /health`

**请求示例：**
```bash
curl http://localhost:3000/health
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-06T12:00:00.000Z",
    "uptime": 3600.5,
    "environment": "production"
  }
}
```

**响应字段：**
- `status`: 服务状态 (`healthy` | `unhealthy`)
- `timestamp`: 当前时间戳
- `uptime`: 服务运行时间（秒）
- `environment`: 运行环境

---

#### AI服务健康检查

检查AI服务是否正常运行。

**端点：** `GET /health` (AI服务)

**请求示例：**
```bash
curl http://localhost:8001/health
```

**响应示例：**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

### 文件上传

#### 上传图片

上传产品图片到服务器。

**端点：** `POST /api/upload`

**请求头：**
```
Content-Type: multipart/form-data
```

**请求参数：**
- `file` (必需): 图片文件
  - 支持格式: JPG, PNG, WEBP
  - 最大大小: 10MB
  - 推荐尺寸: 1000x1000 到 4000x4000 像素

**请求示例：**

```bash
# cURL
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/product-image.jpg"

# JavaScript (Fetch API)
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "originalUrl": "http://localhost:3000/uploads/550e8400_1696512000000.jpg",
    "metadata": {
      "width": 2000,
      "height": 1500,
      "format": "jpeg",
      "size": 2048576
    }
  }
}
```

**响应字段：**
- `uploadId`: 上传文件的唯一标识符
- `originalUrl`: 原始图片的访问URL
- `metadata`: 图片元数据
  - `width`: 图片宽度（像素）
  - `height`: 图片高度（像素）
  - `format`: 图片格式
  - `size`: 文件大小（字节）

**错误响应：**

文件大小超限：
```json
{
  "success": false,
  "error": {
    "type": "FILE_SIZE_ERROR",
    "message": "文件大小超过限制，最大允许10MB",
    "code": 413
  }
}
```

文件格式不支持：
```json
{
  "success": false,
  "error": {
    "type": "FORMAT_ERROR",
    "message": "不支持的文件格式，仅支持 JPG, PNG, WEBP",
    "code": 400
  }
}
```

---

#### 获取上传信息

获取已上传文件的详细信息。

**端点：** `GET /api/upload/:uploadId`

**路径参数：**
- `uploadId`: 上传文件的ID

**请求示例：**
```bash
curl http://localhost:3000/api/upload/550e8400-e29b-41d4-a716-446655440000
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "product-image.jpg",
    "originalUrl": "http://localhost:3000/uploads/550e8400_1696512000000.jpg",
    "metadata": {
      "width": 2000,
      "height": 1500,
      "format": "jpeg",
      "size": 2048576
    },
    "uploadedAt": "2025-10-06T12:00:00.000Z"
  }
}
```

---

#### 删除上传文件

删除已上传的文件。

**端点：** `DELETE /api/upload/:uploadId`

**路径参数：**
- `uploadId`: 上传文件的ID

**请求示例：**
```bash
curl -X DELETE http://localhost:3000/api/upload/550e8400-e29b-41d4-a716-446655440000
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "message": "文件已成功删除",
    "uploadId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 图片处理

#### 开始处理图片

开始处理上传的图片（背景移除、白色背景替换、尺寸标准化）。

**端点：** `POST /api/process`

**请求头：**
```
Content-Type: application/json
```

**请求体：**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "options": {
    "outputFormat": "jpg",
    "outputSize": {
      "width": 1200,
      "height": 1200
    },
    "backgroundColor": "#FFFFFF"
  }
}
```

**请求参数：**
- `uploadId` (必需): 上传文件的ID
- `options` (可选): 处理选项
  - `outputFormat`: 输出格式 (`jpg` | `png`)，默认 `jpg`
  - `outputSize`: 输出尺寸，默认 `{width: 1200, height: 1200}`
  - `backgroundColor`: 背景颜色，默认 `#FFFFFF`

**请求示例：**

```bash
# cURL
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# JavaScript
const response = await fetch('http://localhost:3000/api/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uploadId: '550e8400-e29b-41d4-a716-446655440000'
  })
});

const result = await response.json();
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "progress": 0,
    "estimatedTime": 25000
  }
}
```

**响应字段：**
- `processId`: 处理任务的唯一标识符
- `status`: 处理状态 (`pending` | `processing` | `completed` | `failed`)
- `progress`: 处理进度 (0-100)
- `estimatedTime`: 预估完成时间（毫秒）

---

#### 查询处理状态

查询图片处理的当前状态和进度。

**端点：** `GET /api/process/status/:processId`

**路径参数：**
- `processId`: 处理任务的ID

**请求示例：**
```bash
curl http://localhost:3000/api/process/status/660e8400-e29b-41d4-a716-446655440001
```

**响应示例（处理中）：**
```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "progress": 65,
    "estimatedTime": 8750,
    "currentStep": "background_removal"
  }
}
```

**响应示例（处理完成）：**
```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "progress": 100,
    "processedUrl": "http://localhost:3000/processed/660e8400_processed.jpg",
    "processingTime": 23456,
    "confidence": 0.95,
    "metadata": {
      "width": 1200,
      "height": 1200,
      "format": "jpeg",
      "size": 1536000
    }
  }
}
```

**响应字段：**
- `processId`: 处理任务ID
- `status`: 处理状态
- `progress`: 处理进度 (0-100)
- `processedUrl`: 处理后图片的URL（仅在完成时）
- `processingTime`: 实际处理时间（毫秒）
- `confidence`: AI分割置信度 (0-1)
- `metadata`: 处理后图片的元数据

**响应示例（处理失败）：**
```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "failed",
    "progress": 45,
    "error": {
      "type": "AI_MODEL_ERROR",
      "message": "AI模型推理失败，请重试"
    }
  }
}
```

---

#### 获取队列状态

获取当前处理队列的状态信息。

**端点：** `GET /api/process/queue`

**请求示例：**
```bash
curl http://localhost:3000/api/process/queue
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "queueLength": 5,
    "activeProcessing": 2,
    "averageWaitTime": 15000,
    "estimatedWaitTime": 30000
  }
}
```

**响应字段：**
- `queueLength`: 队列中等待的任务数
- `activeProcessing`: 正在处理的任务数
- `averageWaitTime`: 平均等待时间（毫秒）
- `estimatedWaitTime`: 预估等待时间（毫秒）

---

### 性能监控

#### 获取性能统计

获取系统性能统计信息。

**端点：** `GET /api/performance/stats`

**请求示例：**
```bash
curl http://localhost:3000/api/performance/stats
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 1234,
    "averageProcessingTime": 23456,
    "successRate": 0.98,
    "queueLength": 5,
    "activeProcessing": 2,
    "timeRanges": {
      "last24h": {
        "processed": 156,
        "avgTime": 22000,
        "successRate": 0.99
      },
      "last7d": {
        "processed": 890,
        "avgTime": 24000,
        "successRate": 0.97
      }
    }
  }
}
```

**响应字段：**
- `totalProcessed`: 总处理数量
- `averageProcessingTime`: 平均处理时间（毫秒）
- `successRate`: 成功率 (0-1)
- `queueLength`: 当前队列长度
- `activeProcessing`: 正在处理的任务数
- `timeRanges`: 不同时间范围的统计

---

## 使用示例

### 完整处理流程

以下是一个完整的图片处理流程示例。

#### 1. 上传图片

```javascript
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('上传失败');
  }

  const result = await response.json();
  return result.data.uploadId;
}
```

#### 2. 开始处理

```javascript
async function startProcessing(uploadId) {
  const response = await fetch('http://localhost:3000/api/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uploadId })
  });

  if (!response.ok) {
    throw new Error('处理启动失败');
  }

  const result = await response.json();
  return result.data.processId;
}
```

#### 3. 轮询处理状态

```javascript
async function pollProcessingStatus(processId) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/process/status/${processId}`
        );

        if (!response.ok) {
          clearInterval(interval);
          reject(new Error('状态查询失败'));
          return;
        }

        const result = await response.json();
        const { status, progress, processedUrl, error } = result.data;

        // 更新进度UI
        console.log(`处理进度: ${progress}%`);

        if (status === 'completed') {
          clearInterval(interval);
          resolve(processedUrl);
        } else if (status === 'failed') {
          clearInterval(interval);
          reject(new Error(error.message));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 1000); // 每秒查询一次
  });
}
```

#### 4. 完整流程

```javascript
async function processImage(file) {
  try {
    // 1. 上传图片
    console.log('上传图片...');
    const uploadId = await uploadImage(file);
    console.log('上传成功:', uploadId);

    // 2. 开始处理
    console.log('开始处理...');
    const processId = await startProcessing(uploadId);
    console.log('处理任务ID:', processId);

    // 3. 等待处理完成
    console.log('等待处理完成...');
    const processedUrl = await pollProcessingStatus(processId);
    console.log('处理完成:', processedUrl);

    // 4. 下载或显示结果
    return processedUrl;
  } catch (error) {
    console.error('处理失败:', error);
    throw error;
  }
}

// 使用示例
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const resultUrl = await processImage(file);
      // 显示结果图片
      document.getElementById('result').src = resultUrl;
    } catch (error) {
      alert('处理失败: ' + error.message);
    }
  }
});
```

---

### Python示例

```python
import requests
import time

def upload_image(file_path):
    """上传图片"""
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'http://localhost:3000/api/upload',
            files=files
        )
    
    if response.status_code != 200:
        raise Exception('上传失败')
    
    return response.json()['data']['uploadId']

def start_processing(upload_id):
    """开始处理"""
    response = requests.post(
        'http://localhost:3000/api/process',
        json={'uploadId': upload_id}
    )
    
    if response.status_code != 200:
        raise Exception('处理启动失败')
    
    return response.json()['data']['processId']

def wait_for_completion(process_id, timeout=60):
    """等待处理完成"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        response = requests.get(
            f'http://localhost:3000/api/process/status/{process_id}'
        )
        
        if response.status_code != 200:
            raise Exception('状态查询失败')
        
        data = response.json()['data']
        status = data['status']
        progress = data['progress']
        
        print(f'处理进度: {progress}%')
        
        if status == 'completed':
            return data['processedUrl']
        elif status == 'failed':
            raise Exception(data['error']['message'])
        
        time.sleep(1)
    
    raise Exception('处理超时')

def process_image(file_path):
    """完整处理流程"""
    try:
        # 上传
        print('上传图片...')
        upload_id = upload_image(file_path)
        print(f'上传成功: {upload_id}')
        
        # 处理
        print('开始处理...')
        process_id = start_processing(upload_id)
        print(f'处理任务ID: {process_id}')
        
        # 等待完成
        print('等待处理完成...')
        result_url = wait_for_completion(process_id)
        print(f'处理完成: {result_url}')
        
        return result_url
    except Exception as e:
        print(f'处理失败: {e}')
        raise

# 使用示例
if __name__ == '__main__':
    result = process_image('product-image.jpg')
    print(f'结果URL: {result}')
```

---

## 速率限制

为了保护服务器资源，API实施了速率限制。

### 限制规则

- **默认限制**: 每个IP地址每分钟最多100个请求
- **上传限制**: 每个IP地址每分钟最多10次上传
- **处理限制**: 每个IP地址同时最多处理3个任务

### 速率限制响应

当超过速率限制时，API返回429状态码：

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "message": "请求频率超限，请稍后重试",
    "code": 429,
    "details": {
      "retryAfter": 30
    }
  }
}
```

### 响应头

速率限制信息包含在响应头中：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696512060
```

- `X-RateLimit-Limit`: 时间窗口内的最大请求数
- `X-RateLimit-Remaining`: 剩余可用请求数
- `X-RateLimit-Reset`: 限制重置的时间戳

---

## 最佳实践

### 1. 错误处理

始终检查响应的 `success` 字段并处理错误：

```javascript
async function apiCall() {
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.success) {
      // 处理API错误
      console.error('API错误:', result.error);
      throw new Error(result.error.message);
    }

    return result.data;
  } catch (error) {
    // 处理网络错误
    console.error('网络错误:', error);
    throw error;
  }
}
```

### 2. 文件验证

在上传前验证文件：

```javascript
function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    throw new Error('文件大小超过10MB');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件格式');
  }

  return true;
}
```

### 3. 进度反馈

提供用户友好的进度反馈：

```javascript
async function processWithProgress(file, onProgress) {
  const uploadId = await uploadImage(file);
  const processId = await startProcessing(uploadId);

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `http://localhost:3000/api/process/status/${processId}`
      );
      const result = await response.json();
      const { status, progress, processedUrl } = result.data;

      // 调用进度回调
      onProgress(progress);

      if (status === 'completed') {
        clearInterval(interval);
        resolve(processedUrl);
      } else if (status === 'failed') {
        clearInterval(interval);
        reject(new Error('处理失败'));
      }
    }, 1000);
  });
}

// 使用
processWithProgress(file, (progress) => {
  console.log(`进度: ${progress}%`);
  progressBar.style.width = `${progress}%`;
});
```

### 4. 重试机制

实现自动重试机制处理临时错误：

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // 速率限制，等待后重试
        const retryAfter = response.headers.get('Retry-After') || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 5. 超时处理

设置合理的超时时间：

```javascript
async function fetchWithTimeout(url, options, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 6. 批量处理

批量处理多个图片时，控制并发数：

```javascript
async function processBatch(files, concurrency = 3) {
  const results = [];
  const queue = [...files];

  async function processNext() {
    if (queue.length === 0) return;
    
    const file = queue.shift();
    try {
      const result = await processImage(file);
      results.push({ file: file.name, success: true, url: result });
    } catch (error) {
      results.push({ file: file.name, success: false, error: error.message });
    }

    await processNext();
  }

  // 启动并发处理
  await Promise.all(
    Array(concurrency).fill(null).map(() => processNext())
  );

  return results;
}
```

---

## 更新日志

### v1.0.0 (2025-10-06)
- 初始版本发布
- 支持图片上传和背景移除
- 支持白色背景替换
- 支持1200x1200尺寸标准化

---

## 支持

如有问题或建议：
- 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 提交 GitHub Issue
- 联系技术支持

---

## 相关文档

- [安装指南](INSTALLATION.md)
- [用户指南](USER_GUIDE.md)
- [部署指南](DEPLOYMENT.md)
- [故障排除](TROUBLESHOOTING.md)
