# 安装指南 (Installation Guide)

## 目录

- [系统要求](#系统要求)
- [安装方式](#安装方式)
  - [Docker部署（推荐）](#docker部署推荐)
  - [本地开发环境](#本地开发环境)
- [配置说明](#配置说明)
- [验证安装](#验证安装)
- [常见问题](#常见问题)

---

## 系统要求

### 硬件要求

**最低配置：**
- CPU: 2核心
- 内存: 4GB RAM
- 磁盘: 10GB 可用空间
- 网络: 稳定的互联网连接（用于下载依赖和模型）

**推荐配置：**
- CPU: 4核心或更多
- 内存: 8GB RAM 或更多
- 磁盘: 20GB 可用空间（SSD推荐）
- GPU: 可选，用于加速AI推理

### 软件要求

**Docker部署：**
- Docker 20.10 或更高版本
- Docker Compose 2.0 或更高版本
- Git（用于克隆仓库）

**本地开发：**
- Node.js 18.x 或更高版本
- Python 3.9 或更高版本
- npm 或 yarn
- Git

### 操作系统支持

- ✅ Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- ✅ macOS 11+ (Big Sur或更高)
- ✅ Windows 10/11 (使用WSL2推荐)

---

## 安装方式

### Docker部署（推荐）

Docker部署是最简单、最可靠的方式，适合生产环境和快速体验。

#### 步骤1: 安装Docker

**Ubuntu/Debian:**
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加Docker官方GPG密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
sudo docker --version
sudo docker compose version
```

**macOS:**
```bash
# 使用Homebrew安装
brew install --cask docker

# 或者下载Docker Desktop
# https://www.docker.com/products/docker-desktop
```

**Windows:**
1. 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. 启用WSL2后端（推荐）
3. 重启计算机

#### 步骤2: 克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-org/image-background-processor.git
cd image-background-processor

# 查看项目结构
ls -la
```

#### 步骤3: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件（可选，默认配置即可使用）
nano .env
```

**基本配置示例：**
```env
# 后端配置
NODE_ENV=production
BACKEND_PORT=3000
MAX_FILE_SIZE=10485760

# AI服务配置
AI_SERVICE_PORT=8001
MODEL_PATH=/app/models/rmbg-1.4.onnx
CONFIDENCE_THRESHOLD=0.5

# 前端配置
FRONTEND_PORT=80
VITE_API_URL=http://localhost:3000

# 性能配置
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

#### 步骤4: 下载AI模型

AI服务需要预训练的背景移除模型。

**选项A: 自动下载（推荐）**
```bash
# 创建模型目录
mkdir -p ai-service/models

# 下载RMBG-1.4模型
cd ai-service/models
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx
cd ../..
```

**选项B: 手动下载**
1. 访问 https://huggingface.co/briaai/RMBG-1.4
2. 下载 `model.onnx` 文件
3. 将文件重命名为 `rmbg-1.4.onnx`
4. 放置到 `ai-service/models/` 目录

#### 步骤5: 构建和启动服务

```bash
# 构建Docker镜像
docker compose build

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
```

预期输出：
```
NAME                          STATUS              PORTS
image-processor-backend       Up 30 seconds       0.0.0.0:3000->3000/tcp
image-processor-ai-service    Up 30 seconds       0.0.0.0:8001->8001/tcp
image-processor-frontend      Up 30 seconds       0.0.0.0:80->80/tcp
```

#### 步骤6: 验证安装

```bash
# 使用Makefile命令检查健康状态
make health

# 或手动检查各服务
curl http://localhost:3000/health
curl http://localhost:8001/health
curl http://localhost:80/
```

---

### 本地开发环境

适合开发人员进行功能开发和调试。

#### 步骤1: 安装Node.js

**使用nvm（推荐）:**
```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载shell配置
source ~/.bashrc  # 或 ~/.zshrc

# 安装Node.js 18
nvm install 18
nvm use 18

# 验证安装
node --version
npm --version
```

**使用包管理器:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18

# 验证安装
node --version
npm --version
```

#### 步骤2: 安装Python

**Ubuntu/Debian:**
```bash
# 安装Python 3.9+
sudo apt-get update
sudo apt-get install -y python3.9 python3.9-venv python3-pip

# 验证安装
python3 --version
pip3 --version
```

**macOS:**
```bash
# 使用Homebrew
brew install python@3.9

# 验证安装
python3 --version
pip3 --version
```

**Windows:**
1. 下载 [Python 3.9+](https://www.python.org/downloads/)
2. 运行安装程序，勾选"Add Python to PATH"
3. 验证安装：`python --version`

#### 步骤3: 克隆项目

```bash
git clone https://github.com/your-org/image-background-processor.git
cd image-background-processor
```

#### 步骤4: 设置后端服务

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 编辑配置
nano .env
```

**后端 .env 配置：**
```env
PORT=3000
NODE_ENV=development
UPLOAD_DIR=../uploads
MAX_FILE_SIZE=10485760
AI_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:5173
```

```bash
# 启动开发服务器
npm run dev
```

#### 步骤5: 设置AI服务

```bash
cd ../ai-service

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env

# 下载模型（参考Docker部署步骤4）
mkdir -p models
cd models
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx
cd ..

# 启动服务
python src/main.py
```

#### 步骤6: 设置前端应用

```bash
cd ../frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 编辑配置
nano .env
```

**前端 .env 配置：**
```env
VITE_API_URL=http://localhost:3000
```

```bash
# 启动开发服务器
npm run dev
```

#### 步骤7: 访问应用

打开浏览器访问：
- 前端: http://localhost:5173
- 后端API: http://localhost:3000
- AI服务: http://localhost:8001

---

## 配置说明

### 环境变量详解

#### 后端服务环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `development` | 否 |
| `BACKEND_PORT` | 服务端口 | `3000` | 否 |
| `UPLOAD_DIR` | 上传目录 | `../uploads` | 否 |
| `MAX_FILE_SIZE` | 最大文件大小（字节） | `10485760` | 否 |
| `AI_SERVICE_URL` | AI服务地址 | `http://localhost:8001` | 是 |
| `CORS_ORIGIN` | CORS允许源 | `*` | 否 |
| `RATE_LIMIT_WINDOW` | 速率限制窗口（毫秒） | `60000` | 否 |
| `RATE_LIMIT_MAX` | 窗口内最大请求数 | `100` | 否 |

#### AI服务环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `AI_SERVICE_PORT` | 服务端口 | `8001` | 否 |
| `MODEL_PATH` | 模型文件路径 | `models/rmbg-1.4.onnx` | 是 |
| `CONFIDENCE_THRESHOLD` | 置信度阈值 | `0.5` | 否 |
| `MAX_IMAGE_SIZE` | 最大图片尺寸 | `4096` | 否 |

#### 前端环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_API_URL` | 后端API地址 | `http://localhost:3000` | 是 |
| `FRONTEND_PORT` | 服务端口 | `80` | 否 |

### 端口配置

如果默认端口被占用，可以修改配置：

```env
# .env 文件
BACKEND_PORT=3001
AI_SERVICE_PORT=8002
FRONTEND_PORT=8080
```

修改后需要重启服务：
```bash
# Docker部署
docker compose down
docker compose up -d

# 本地开发
# 重启各个服务
```

---

## 验证安装

### 1. 检查服务状态

**Docker部署：**
```bash
# 查看容器状态
docker compose ps

# 所有容器应该显示 "Up"
```

**本地开发：**
```bash
# 检查进程
ps aux | grep node
ps aux | grep python
```

### 2. 健康检查

```bash
# 后端服务
curl http://localhost:3000/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-06T12:00:00.000Z",
    "uptime": 123.456,
    "environment": "production"
  }
}

# AI服务
curl http://localhost:8001/health

# 预期响应
{
  "status": "healthy",
  "model_loaded": true
}
```

### 3. 功能测试

```bash
# 测试文件上传
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/test-image.jpg"

# 预期响应包含 uploadId 和 metadata
```

### 4. 前端访问

打开浏览器访问前端地址：
- Docker: http://localhost:80
- 本地开发: http://localhost:5173

应该看到图片上传界面。

---

## 常见问题

### 端口被占用

**问题：** 启动服务时提示端口已被占用

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :8001
lsof -i :80

# 终止进程
kill -9 <PID>

# 或修改配置使用其他端口
```

### Docker镜像构建失败

**问题：** `docker compose build` 失败

**解决方案：**
```bash
# 清理Docker缓存
docker system prune -a

# 重新构建
docker compose build --no-cache
```

### AI模型加载失败

**问题：** AI服务启动失败，提示找不到模型文件

**解决方案：**
```bash
# 检查模型文件是否存在
ls -lh ai-service/models/rmbg-1.4.onnx

# 如果不存在，重新下载
cd ai-service/models
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx

# 检查文件大小（应该约176MB）
ls -lh rmbg-1.4.onnx
```

### 内存不足

**问题：** 服务运行时内存不足

**解决方案：**
```bash
# 增加Docker内存限制
# 编辑 docker-compose.yml
services:
  ai-service:
    deploy:
      resources:
        limits:
          memory: 4G

# 或关闭其他应用释放内存
```

### 网络连接问题

**问题：** 前端无法连接后端API

**解决方案：**
```bash
# 检查CORS配置
# 编辑 backend/.env
CORS_ORIGIN=http://localhost:5173

# 检查防火墙设置
sudo ufw allow 3000
sudo ufw allow 8001
sudo ufw allow 80

# 检查服务是否监听正确的地址
netstat -tlnp | grep 3000
```

### Python依赖安装失败

**问题：** `pip install -r requirements.txt` 失败

**解决方案：**
```bash
# 升级pip
pip install --upgrade pip

# 使用国内镜像源（中国用户）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或使用conda
conda create -n image-processor python=3.9
conda activate image-processor
pip install -r requirements.txt
```

### Node.js依赖安装失败

**问题：** `npm install` 失败

**解决方案：**
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 或使用yarn
yarn install
```

### 文件上传失败

**问题：** 上传图片时返回错误

**解决方案：**
```bash
# 检查上传目录权限
ls -ld uploads/
chmod 755 uploads/

# 检查磁盘空间
df -h

# 检查文件大小限制
# 编辑 backend/.env
MAX_FILE_SIZE=10485760  # 10MB
```

### 服务启动慢

**问题：** 首次启动服务需要很长时间

**原因：** AI模型加载需要时间

**解决方案：**
- 这是正常现象，首次加载模型需要30-60秒
- 后续启动会更快
- 可以查看日志确认加载进度：
```bash
docker compose logs -f ai-service
```

---

## 下一步

安装完成后，您可以：

1. 阅读 [API_DOCUMENTATION.md](API_DOCUMENTATION.md) 了解API使用方法
2. 阅读 [USER_GUIDE.md](USER_GUIDE.md) 了解如何使用应用
3. 阅读 [DEPLOYMENT.md](DEPLOYMENT.md) 了解生产环境部署
4. 阅读 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) 了解故障排除

## 获取帮助

如果遇到问题：
1. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. 查看项目日志：`docker compose logs -f`
3. 提交 GitHub Issue
4. 联系技术支持
