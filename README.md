# 图片背景处理工具

一个自动化的图片处理应用，用于处理用户上传的产品照片。该工具能够自动识别并提取产品主体，移除原始背景，添加纯白色背景，并将最终图片调整为标准的1200x1200像素尺寸。

## ✨ 功能特性

- ✅ 支持JPG、PNG、WEBP格式图片上传
- ✅ AI自动背景移除（基于RMBG-1.4模型）
- ✅ 纯白色背景替换
- ✅ 1200x1200像素标准化输出
- ✅ 实时处理进度显示
- ✅ 处理前后对比预览
- ✅ 高质量图片下载
- ✅ 批量处理支持
- ✅ 性能监控和统计

## 🚀 快速开始

### 使用Docker（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd image-background-processor

# 配置环境
cp .env.example .env

# 下载AI模型
mkdir -p ai-service/models
cd ai-service/models
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx
cd ../..

# 启动服务
make up

# 验证部署
make health
```

访问应用：http://localhost:80

详细安装说明请查看 [安装指南](INSTALLATION.md)

## 📚 文档

### 用户文档
- **[快速开始指南](QUICKSTART.md)** - 5分钟快速部署
- **[安装指南](INSTALLATION.md)** - 详细的安装和配置说明
- **[用户指南](USER_GUIDE.md)** - 完整的使用教程和最佳实践
- **[API文档](API_DOCUMENTATION.md)** - API接口详细说明和使用示例

### 运维文档
- **[部署指南](DEPLOYMENT.md)** - 生产环境部署配置
- **[监控指南](MONITORING.md)** - 系统监控和性能分析
- **[故障排除](TROUBLESHOOTING.md)** - 常见问题和解决方案

### 开发文档
- **[后端README](backend/README.md)** - 后端服务开发说明
- **[AI服务README](ai-service/README.md)** - AI服务开发说明

## 🏗️ 项目结构

```
image-background-processor/
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── utils/        # 工具函数
│   │   └── types/        # TypeScript类型
│   └── package.json
├── backend/              # Node.js后端服务
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── services/     # 业务逻辑
│   │   ├── middleware/   # 中间件
│   │   └── routes/       # 路由
│   └── package.json
├── ai-service/           # Python AI推理服务
│   ├── src/
│   │   ├── services/     # AI服务
│   │   ├── utils/        # 工具函数
│   │   └── tests/        # 测试
│   ├── models/           # AI模型文件
│   └── requirements.txt
├── shared/               # 共享类型定义
├── uploads/              # 上传文件目录
├── .kiro/                # Kiro规范文档
│   └── specs/
│       └── image-background-processor/
├── docker-compose.yml    # Docker编排配置
├── Makefile             # 常用命令
└── README.md
```

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **HTTP客户端**: Axios
- **测试**: Vitest + Testing Library

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **图像处理**: Sharp.js
- **文件上传**: Multer
- **测试**: Jest

### AI服务
- **语言**: Python 3.9+
- **框架**: FastAPI
- **AI运行时**: ONNX Runtime
- **图像处理**: OpenCV, Pillow
- **模型**: RMBG-1.4 (BRIA AI)
- **测试**: Pytest

### 基础设施
- **容器化**: Docker + Docker Compose
- **监控**: Prometheus + Grafana (可选)
- **反向代理**: Nginx

## 📋 系统要求

### 最低配置
- CPU: 2核心
- 内存: 4GB RAM
- 磁盘: 10GB 可用空间
- Docker 20.10+
- Docker Compose 2.0+

### 推荐配置
- CPU: 4核心或更多
- 内存: 8GB RAM 或更多
- 磁盘: 20GB 可用空间（SSD推荐）
- GPU: 可选，用于加速AI推理

## 🔧 开发环境设置

### 前端开发
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 后端开发
```bash
cd backend
npm install
cp .env.example .env
npm run dev
# 访问 http://localhost:3000
```

### AI服务开发
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python src/main.py
# 访问 http://localhost:8001
```

## 🧪 测试

```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend
npm test

# AI服务测试
cd ai-service
pytest

# 端到端测试
make test
```

## 📊 API接口

### 健康检查
```bash
GET /health
```

### 文件上传
```bash
POST /api/upload
Content-Type: multipart/form-data
Body: file (图片文件)
```

### 图片处理
```bash
POST /api/process
Content-Type: application/json
Body: { "uploadId": "uuid" }
```

### 处理状态
```bash
GET /api/process/status/:processId
```

### 性能统计
```bash
GET /api/performance/stats
```

完整API文档请查看 [API文档](API_DOCUMENTATION.md)

## 🔍 常用命令

```bash
# 启动所有服务
make up

# 停止所有服务
make down

# 重启服务
make restart

# 查看日志
make logs

# 查看服务状态
make ps

# 健康检查
make health

# 备份数据
make backup

# 运行测试
make test

# 清理资源
make clean

# 查看所有命令
make help
```

## 🐛 故障排除

遇到问题？查看 [故障排除指南](TROUBLESHOOTING.md)

常见问题：
- [服务无法启动](TROUBLESHOOTING.md#服务启动失败)
- [上传失败](TROUBLESHOOTING.md#文件上传问题)
- [处理超时](TROUBLESHOOTING.md#处理超时)
- [结果质量差](TROUBLESHOOTING.md#处理结果质量差)

## 🤝 贡献

欢迎贡献！请查看贡献指南。

## 📄 许可证

MIT License

## 🙏 致谢

- [BRIA AI](https://huggingface.co/briaai) - RMBG-1.4背景移除模型
- [ONNX Runtime](https://onnxruntime.ai/) - 高性能AI推理引擎
- 所有开源项目贡献者

## 📞 支持

- **文档**: 查看上述文档链接
- **Issues**: [GitHub Issues](https://github.com/your-org/image-background-processor/issues)
- **邮件**: support@example.com

---

**开始使用：** 查看 [快速开始指南](QUICKSTART.md) 或 [用户指南](USER_GUIDE.md)
