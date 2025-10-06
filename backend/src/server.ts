import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ImageMetadata } from './types/services';
import uploadRoutes from './routes/uploadRoutes';
import processRoutes from './routes/processRoutes';
import performanceRoutes from './routes/performanceRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createError } from './utils/errorHandler';

// 环境变量配置
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '../uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// 创建Express应用
const app = express();

// 确保上传目录存在
const uploadPath = path.resolve(__dirname, UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// CORS中间件配置
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 基础中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 用于提供上传的图片
app.use('/uploads', express.static(uploadPath));

// Multer配置 - 文件上传中间件
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：UUID + 时间戳 + 原始扩展名
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器 - 只允许特定格式的图片
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    const error = createError.formatError(['JPG', 'PNG', 'WEBP']);
    cb(error as any);
  }
};

// Multer实例配置
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: fileFilter
});

// API路由
app.use('/api', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/performance', performanceRoutes);

// 404处理 - 必须在所有路由之后
app.use('*', notFoundHandler);

// 全局错误处理中间件 - 必须在最后
app.use(errorHandler);

// 健康检查端点
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV
    }
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📁 上传目录: ${uploadPath}`);
  console.log(`🌍 环境: ${NODE_ENV}`);
  console.log(`📏 最大文件大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

export default app;