import { Router } from 'express';
import { upload } from '../server';
import {
  uploadFile,
  getUploadInfo,
  deleteUpload,
  listUploads
} from '../controllers/uploadController';
import { validateUploadId, requestLogger } from '../middleware/validation';
import { uploadRateLimiter, generalRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// 应用请求日志中间件
router.use(requestLogger);

/**
 * POST /api/upload
 * 上传图片文件（带速率限制）
 */
router.post('/upload', uploadRateLimiter, upload.single('file'), uploadFile);

/**
 * GET /api/upload/:uploadId
 * 获取上传文件信息
 */
router.get('/upload/:uploadId', generalRateLimiter, validateUploadId, getUploadInfo);

/**
 * DELETE /api/upload/:uploadId
 * 删除上传文件
 */
router.delete('/upload/:uploadId', generalRateLimiter, validateUploadId, deleteUpload);

/**
 * GET /api/uploads
 * 获取所有上传文件列表（调试用）
 */
router.get('/uploads', generalRateLimiter, listUploads);

export default router;