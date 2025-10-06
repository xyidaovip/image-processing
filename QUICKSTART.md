# 快速开始指南 (Quick Start Guide)

## 5分钟快速部署

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

### 步骤1: 克隆项目
```bash
git clone <repository-url>
cd image-background-processor
```

### 步骤2: 配置环境
```bash
cp .env.example .env
# 使用默认配置即可快速启动
```

### 步骤3: 启动服务
```bash
make up
```

### 步骤4: 验证部署
```bash
make health
```

### 步骤5: 访问应用
- 前端: http://localhost:80
- 后端API: http://localhost:3000
- AI服务: http://localhost:8001

## 常用命令

```bash
# 查看服务状态
make ps

# 查看日志
make logs

# 重启服务
make restart

# 停止服务
make down

# 备份数据
make backup

# 运行测试
make test
```

## 故障排查

### 端口被占用
```bash
# 修改 .env 文件中的端口配置
BACKEND_PORT=3001
FRONTEND_PORT=8080
AI_SERVICE_PORT=8002
```

### 服务启动失败
```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs frontend
```

### 清理并重新开始
```bash
make clean
make build
make up
```

## 下一步

- 阅读 [DEPLOYMENT.md](DEPLOYMENT.md) 了解详细部署配置
- 阅读 [MONITORING.md](MONITORING.md) 了解监控配置
- 查看 API 文档了解接口使用

## 获取帮助

```bash
# 查看所有可用命令
make help
```
