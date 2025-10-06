# 🚀 快速启动指南

## 恭喜！所有开发任务已完成 ✅

现在按照以下步骤启动应用：

## 方式一：使用 Docker（推荐）⭐

### 第1步：准备环境配置

```bash
# 复制环境变量文件
cp .env.example .env
```

### 第2步：下载 AI 模型（重要！）

```bash
# 创建模型目录
mkdir -p ai-service/models

# 下载 RMBG-1.4 模型（约176MB）
curl -L https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -o ai-service/models/rmbg-1.4.onnx

# 验证文件大小（应该约176MB）
ls -lh ai-service/models/rmbg-1.4.onnx
```

**注意：** 如果 curl 下载失败，可以手动访问 https://huggingface.co/briaai/RMBG-1.4 下载模型文件。

### 第3步：启动所有服务

```bash
# 使用 Makefile 命令（最简单）
make up

# 或者使用 docker compose 命令
docker compose build
docker compose up -d
```

### 第4步：验证服务状态

```bash
# 检查所有服务健康状态
make health

# 或手动检查
curl http://localhost:3000/health  # 后端
curl http://localhost:8001/health  # AI服务
curl http://localhost:80/          # 前端
```

### 第5步：访问应用

打开浏览器访问：**http://localhost:80**

---

## 方式二：本地开发模式

如果你想在本地开发环境运行（不使用Docker）：

### 1. 启动后端服务

```bash
cd backend
npm install
cp .env.example .env
npm run dev
# 运行在 http://localhost:3000
```

### 2. 启动 AI 服务

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# 下载模型
mkdir -p models
curl -L https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -o models/rmbg-1.4.onnx

# 启动服务
python src/main.py
# 运行在 http://localhost:8001
```

### 3. 启动前端应用

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# 运行在 http://localhost:5173
```

---

## 📊 常用命令

```bash
# 查看服务状态
make ps
docker compose ps

# 查看日志
make logs
docker compose logs -f

# 重启服务
make restart
docker compose restart

# 停止服务
make down
docker compose down

# 查看所有可用命令
make help
```

---

## 🧪 测试应用

### 1. 上传测试图片

准备一张产品图片（JPG/PNG/WEBP格式，最大10MB）

### 2. 访问前端界面

打开 http://localhost:80

### 3. 上传并处理

- 点击上传区域或拖拽图片
- 等待处理完成（约20-30秒）
- 查看处理结果
- 下载处理后的图片

---

## ❗ 常见问题

### 问题1：端口被占用

```bash
# 修改 .env 文件中的端口
BACKEND_PORT=3001
AI_SERVICE_PORT=8002
FRONTEND_PORT=8080

# 重启服务
make down
make up
```

### 问题2：AI 模型加载失败

```bash
# 检查模型文件
ls -lh ai-service/models/rmbg-1.4.onnx

# 如果文件不存在或大小不对，重新下载
rm ai-service/models/rmbg-1.4.onnx
curl -L https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -o ai-service/models/rmbg-1.4.onnx
```

### 问题3：Docker 构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
make build
```

### 问题4：服务启动慢

AI 服务首次启动需要加载模型，可能需要30-60秒，这是正常现象。

---

## 📚 更多文档

- **[安装指南](INSTALLATION.md)** - 详细安装说明
- **[用户指南](USER_GUIDE.md)** - 使用教程
- **[API文档](API_DOCUMENTATION.md)** - API接口说明
- **[故障排除](TROUBLESHOOTING.md)** - 问题解决方案
- **[部署指南](DEPLOYMENT.md)** - 生产环境部署

---

## 🎉 开始使用

一切准备就绪！现在你可以：

1. ✅ 上传产品图片
2. ✅ 自动移除背景
3. ✅ 获得标准化的白底图片
4. ✅ 下载处理结果

**祝你使用愉快！** 🚀

如有问题，请查看 [故障排除指南](TROUBLESHOOTING.md) 或提交 Issue。
