import fs from 'fs';
import path from 'path';

// 创建测试上传目录
const testUploadDir = path.join(__dirname, '../../test-uploads');
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true });
}

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = '../test-uploads';
process.env.PORT = '8001';

// 清理函数
afterAll(async () => {
  // 清理测试上传目录
  if (fs.existsSync(testUploadDir)) {
    fs.rmSync(testUploadDir, { recursive: true, force: true });
  }
});