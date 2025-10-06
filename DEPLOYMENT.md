# 部署指南 (Deployment Guide)

## 概述

本文档描述如何在生产环境中部署图片背景处理系统。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB RAM
- 至少 10GB 磁盘空间

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd image-background-processor
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，根据需要修改配置
```

### 3. 构建和启动服务

```bash
# 构建所有服务
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 检查AI服务健康状态
curl http://localhost:8001/health

# 检查前端
curl http://localhost:80/health
```

## 环境变量配置

### 后端服务 (Backend)

- `NODE_ENV`: 运行环境 (production/development)
- `BACKEND_PORT`: 后端服务端口 (默认: 3000)
- `AI_SERVICE_URL`: AI服务URL
- `MAX_FILE_SIZE`: 最大文件大小 (字节)
- `RATE_LIMIT_WINDOW`: 速率限制时间窗口 (毫秒)
- `RATE_LIMIT_MAX`: 时间窗口内最大请求数

### AI服务 (AI Service)

- `AI_SERVICE_PORT`: AI服务端口 (默认: 8001)
- `MODEL_PATH`: 模型文件路径
- `CONFIDENCE_THRESHOLD`: 置信度阈值 (0-1)

### 前端服务 (Frontend)

- `FRONTEND_PORT`: 前端服务端口 (默认: 80)
- `VITE_API_URL`: 后端API URL

## 服务管理

### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d backend
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近100行日志
docker-compose logs --tail=100 backend
```

### 扩展服务

```bash
# 扩展后端服务到3个实例
docker-compose up -d --scale backend=3
```

## 健康检查

所有服务都配置了健康检查：

- **后端**: 每30秒检查一次 `/health` 端点
- **AI服务**: 每30秒检查一次 `/health` 端点
- **前端**: 每30秒检查一次根路径

查看健康状态：

```bash
docker-compose ps
```

## 数据持久化

系统使用Docker卷来持久化数据：

- `uploads`: 上传的原始图片
- `processed`: 处理后的图片
- `models`: AI模型文件

### 备份数据

```bash
# 备份上传文件
docker run --rm -v image-background-processor_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# 备份处理文件
docker run --rm -v image-background-processor_processed:/data -v $(pwd):/backup alpine tar czf /backup/processed-backup.tar.gz -C /data .
```

### 恢复数据

```bash
# 恢复上传文件
docker run --rm -v image-background-processor_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data

# 恢复处理文件
docker run --rm -v image-background-processor_processed:/data -v $(pwd):/backup alpine tar xzf /backup/processed-backup.tar.gz -C /data
```

## 监控

### 查看资源使用

```bash
# 查看所有容器资源使用
docker stats

# 查看特定容器资源使用
docker stats image-processor-backend
```

### 性能指标

访问后端性能统计端点：

```bash
curl http://localhost:3000/api/performance/stats
```

## 故障排查

### 服务无法启动

1. 检查端口是否被占用：
```bash
lsof -i :3000
lsof -i :8001
lsof -i :80
```

2. 检查Docker日志：
```bash
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs frontend
```

3. 检查磁盘空间：
```bash
df -h
```

### 服务健康检查失败

```bash
# 进入容器检查
docker-compose exec backend sh
docker-compose exec ai-service sh

# 手动测试健康检查
curl http://localhost:3000/health
curl http://localhost:8001/health
```

### 性能问题

1. 检查资源使用：
```bash
docker stats
```

2. 增加资源限制：
编辑 `docker-compose.yml`，添加资源限制：
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 安全建议

1. **使用HTTPS**: 在生产环境中使用反向代理（如Nginx）配置SSL/TLS
2. **限制CORS**: 设置具体的允许源，而不是使用 `*`
3. **环境变量**: 不要在代码中硬编码敏感信息
4. **定期更新**: 保持Docker镜像和依赖包更新
5. **网络隔离**: 使用Docker网络隔离服务
6. **日志管理**: 配置日志轮转，避免磁盘空间耗尽

## 生产环境优化

### 使用反向代理

推荐使用Nginx作为反向代理：

```nginx
upstream backend {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
    }
}
```

### 配置日志轮转

创建 `/etc/logrotate.d/docker-containers`:

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务（零停机时间）
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build ai-service
docker-compose up -d --no-deps --build frontend
```

## 支持

如有问题，请查看：
- 项目文档
- GitHub Issues
- 日志文件
