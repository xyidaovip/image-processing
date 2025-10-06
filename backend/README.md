# 图片背景处理后端服务

## 概述

这是图片背景处理工具的后端服务，提供文件上传、图片处理和结果下载的API接口。

## 功能特性

- ✅ 文件上传和验证
- ✅ 支持 JPG、PNG、WEBP 格式
- ✅ 文件大小限制（10MB）
- ✅ 图片元数据提取
- ✅ 错误处理和验证
- ✅ 请求频率限制
- ✅ 自动清理过期文件

## 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=8000
NODE_ENV=development
UPLOAD_DIR=../uploads
MAX_FILE_SIZE=10485760
AI_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:3000
```

### 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## API 接口

### 健康检查

```http
GET /health
```

响应：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.456,
    "environment": "development"
  }
}
```

### 文件上传

```http
POST /api/upload
Content-Type: multipart/form-data
```

请求参数：
- `file`: 图片文件 (JPG/PNG/WEBP, 最大10MB)

响应：
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-string",
    "originalUrl": "http://localhost:8000/uploads/filename.jpg",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg",
      "size": 1048576
    }
  }
}
```

### 获取上传信息

```http
GET /api/upload/:uploadId
```

响应：
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-string",
    "originalName": "original-filename.jpg",
    "originalUrl": "http://localhost:8000/uploads/filename.jpg",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg",
      "size": 1048576
    },
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 删除上传文件

```http
DELETE /api/upload/:uploadId
```

响应：
```json
{
  "success": true,
  "data": {
    "message": "文件已成功删除",
    "uploadId": "uuid-string"
  }
}
```

### 获取上传列表

```http
GET /api/uploads
```

响应：
```json
{
  "success": true,
  "data": {
    "uploads": [...],
    "total": 5
  }
}
```

## 错误处理

所有错误响应都遵循统一格式：

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "错误描述",
    "code": 400
  }
}
```

### 错误类型

- `UPLOAD_ERROR`: 文件上传错误
- `FILE_SIZE_ERROR`: 文件大小超限
- `FORMAT_ERROR`: 文件格式不支持
- `VALIDATION_ERROR`: 参数验证错误
- `NOT_FOUND`: 资源不存在
- `RATE_LIMIT_ERROR`: 请求频率超限
- `SERVER_ERROR`: 服务器内部错误

## 测试

运行测试脚本：

```bash
# 确保服务器正在运行
npm run dev

# 在另一个终端运行测试
npx ts-node src/test/uploadTest.ts
```

## 项目结构

```
backend/
├── src/
│   ├── controllers/     # 控制器
│   ├── middleware/      # 中间件
│   ├── routes/         # 路由
│   ├── types/          # 类型定义
│   ├── utils/          # 工具函数
│   ├── test/           # 测试文件
│   └── server.ts       # 主服务器文件
├── dist/               # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

## 开发说明

### 文件存储

- 上传的文件存储在 `uploads/` 目录
- 文件名格式：`{uuid}_{timestamp}.{ext}`
- 自动清理24小时前的文件

### 安全特性

- CORS 跨域保护
- 文件类型验证
- 文件大小限制
- 请求频率限制
- 输入参数验证

### 监控和日志

- 请求日志记录
- 错误堆栈跟踪（开发模式）
- 健康检查端点
- 优雅关闭处理

## 下一步

当前实现了基础的文件上传功能，接下来需要：

1. 集成 AI 背景移除服务
2. 实现图片处理管道
3. 添加任务队列管理
4. 实现处理状态跟踪