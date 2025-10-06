/**
 * 简单的上传API测试脚本
 * 运行: npx ts-node src/test/uploadTest.ts
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:8000/api';

async function testHealthCheck() {
  console.log('🔍 测试健康检查...');
  try {
    const response = await axios.get('http://localhost:8000/health');
    console.log('✅ 健康检查通过:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 健康检查失败:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testFileUpload() {
  console.log('📤 测试文件上传...');
  
  // 创建一个测试图片文件（如果不存在）
  const testImagePath = path.join(__dirname, '../../test-image.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  测试图片不存在，请在 backend/test-image.jpg 放置一个测试图片文件');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath));

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ 文件上传成功:', response.data);
    return response.data.data.uploadId;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ 文件上传失败:', error.response?.data || error.message);
    } else {
      console.error('❌ 文件上传失败:', error);
    }
    return null;
  }
}

async function testGetUploadInfo(uploadId: string) {
  console.log('📋 测试获取上传信息...');
  try {
    const response = await axios.get(`${API_BASE_URL}/upload/${uploadId}`);
    console.log('✅ 获取上传信息成功:', response.data);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ 获取上传信息失败:', error.response?.data || error.message);
    } else {
      console.error('❌ 获取上传信息失败:', error);
    }
    return false;
  }
}

async function testListUploads() {
  console.log('📝 测试获取上传列表...');
  try {
    const response = await axios.get(`${API_BASE_URL}/uploads`);
    console.log('✅ 获取上传列表成功:', response.data);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ 获取上传列表失败:', error.response?.data || error.message);
    } else {
      console.error('❌ 获取上传列表失败:', error);
    }
    return false;
  }
}

async function testInvalidFileUpload() {
  console.log('🚫 测试无效文件上传...');
  
  try {
    const formData = new FormData();
    // 尝试上传一个文本文件
    formData.append('file', Buffer.from('这不是图片文件'), {
      filename: 'test.txt',
      contentType: 'text/plain'
    });

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('❌ 应该拒绝无效文件，但上传成功了:', response.data);
    return false;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('✅ 正确拒绝了无效文件:', error.response.data);
      return true;
    } else {
      console.error('❌ 意外错误:', error);
      return false;
    }
  }
}

async function runTests() {
  console.log('🧪 开始运行上传API测试...\n');

  // 测试健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ 服务器未运行，请先启动服务器: npm run dev');
    return;
  }

  console.log('');

  // 测试文件上传
  const uploadId = await testFileUpload();
  if (!uploadId) {
    console.log('❌ 文件上传测试失败，跳过后续测试');
    return;
  }

  console.log('');

  // 测试获取上传信息
  await testGetUploadInfo(uploadId);

  console.log('');

  // 测试获取上传列表
  await testListUploads();

  console.log('');

  // 测试无效文件上传
  await testInvalidFileUpload();

  console.log('\n🎉 测试完成！');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };