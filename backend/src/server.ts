import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import uploadRoutes from './routes/uploadRoutes';
import processRoutes from './routes/processRoutes';
import performanceRoutes from './routes/performanceRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createError } from './utils/errorHandler';

// 环境变量配置
const PORT = process.env.PORT || 3000; // 错误已修正：8000 -> 3000
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

// 静态文件服务
app.use('/uploads', express.static(uploadPath));

// Multer配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError.formatError(['JPG', 'PNG', 'WEBP']) as any);
  }
};

export const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// API路由
app.use('/api', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/performance', performanceRoutes);

// 404处理
app.use('*', notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 服务器启动
if (NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT} (环境: ${NODE_ENV})`);
  });
}

export default app;
