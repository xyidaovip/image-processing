# 故障排除指南 (Troubleshooting Guide)

## 目录

- [常见问题分类](#常见问题分类)
- [安装和部署问题](#安装和部署问题)
- [服务运行问题](#服务运行问题)
- [上传和处理问题](#上传和处理问题)
- [性能问题](#性能问题)
- [网络和连接问题](#网络和连接问题)
- [数据和存储问题](#数据和存储问题)
- [诊断工具](#诊断工具)
- [日志分析](#日志分析)
- [获取支持](#获取支持)

---

## 常见问题分类

### 快速诊断

根据症状快速定位问题类型：

| 症状 | 可能原因 | 快速解决 |
|------|----------|----------|
| 服务无法启动 | 端口占用、配置错误 | 检查端口、查看日志 |
| 上传失败 | 文件格式、大小、网络 | 检查文件、测试网络 |
| 处理超时 | 系统负载、模型问题 | 重启服务、检查资源 |
| 结果质量差 | 图片质量、AI识别 | 优化原图、调整参数 |
| 下载失败 | 网络问题、文件丢失 | 检查网络、重新处理 |

---

## 安装和部署问题

### Docker相关问题

#### 问题：Docker命令找不到

**症状：**
```bash
$ docker --version
bash: docker: command not found
```

**原因：** Docker未安装或未添加到PATH

**解决方案：**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# macOS
brew install --cask docker

# 验证安装
docker --version
docker compose version
```

#### 问题：Docker权限被拒绝

**症状：**
```bash
$ docker ps
permission denied while trying to connect to the Docker daemon socket
```

**原因：** 当前用户没有Docker权限

**解决方案：**
```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 验证
docker ps
```

#### 问题：Docker Compose版本不兼容

**症状：**
```bash
$ docker-compose up
ERROR: Version in "./docker-compose.yml" is unsupported
```

**原因：** Docker Compose版本过旧

**解决方案：**
```bash
# 升级Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证版本
docker-compose --version
```

#### 问题：镜像构建失败

**症状：**
```bash
$ docker compose build
ERROR: failed to solve: process "/bin/sh -c npm install" did not complete successfully
```

**原因：** 网络问题、依赖问题、缓存问题

**解决方案：**
```bash
# 清理Docker缓存
docker system prune -a

# 使用国内镜像源（中国用户）
# 编辑 backend/Dockerfile
RUN npm config set registry https://registry.npmmirror.com

# 编辑 ai-service/requirements.txt 安装命令
RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 重新构建（不使用缓存）
docker compose build --no-cache

# 如果仍然失败，逐个服务构建
docker compose build backend
docker compose build ai-service
docker compose build frontend
```

### 端口冲突问题

#### 问题：端口已被占用

**症状：**
```bash
$ docker compose up
Error starting userland proxy: listen tcp 0.0.0.0:3000: bind: address already in use
```

**原因：** 端口被其他程序占用

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000
# 或
netstat -tlnp | grep 3000

# 终止进程
kill -9 <PID>

# 或修改配置使用其他端口
# 编辑 .env 文件
BACKEND_PORT=3001
AI_SERVICE_PORT=8002
FRONTEND_PORT=8080

# 重启服务
docker compose down
docker compose up -d
```

### 模型文件问题

#### 问题：AI模型文件缺失

**症状：**
```bash
$ docker compose logs ai-service
FileNotFoundError: [Errno 2] No such file or directory: '/app/models/rmbg-1.4.onnx'
```

**原因：** 模型文件未下载或路径错误

**解决方案：**
```bash
# 创建模型目录
mkdir -p ai-service/models

# 下载模型文件
cd ai-service/models
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx

# 验证文件
ls -lh rmbg-1.4.onnx
# 应该显示约176MB

# 如果wget不可用，使用curl
curl -L https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -o rmbg-1.4.onnx

# 重启AI服务
cd ../..
docker compose restart ai-service
```

#### 问题：模型加载失败

**症状：**
```bash
$ curl http://localhost:8001/health
{"status": "unhealthy", "model_loaded": false}
```

**原因：** 模型文件损坏或格式错误

**解决方案：**
```bash
# 检查文件完整性
cd ai-service/models
md5sum rmbg-1.4.onnx

# 如果MD5不匹配，重新下载
rm rmbg-1.4.onnx
wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4.onnx

# 检查文件权限
chmod 644 rmbg-1.4.onnx

# 重启服务
cd ../..
docker compose restart ai-service

# 查看详细日志
docker compose logs -f ai-service
```

---

## 服务运行问题

### 服务启动失败

#### 问题：后端服务无法启动

**症状：**
```bash
$ docker compose ps
NAME                          STATUS
image-processor-backend       Exited (1)
```

**诊断步骤：**
```bash
# 查看详细日志
docker compose logs backend

# 常见错误及解决方案：

# 1. 环境变量缺失
# 检查 .env 文件是否存在
ls -la .env

# 2. 依赖安装失败
# 重新构建
docker compose build backend

# 3. 端口冲突
# 修改端口配置
nano .env

# 4. 文件权限问题
# 修复权限
chmod -R 755 backend/
```

#### 问题：AI服务启动慢

**症状：** AI服务启动需要很长时间

**原因：** 模型加载需要时间（正常现象）

**解决方案：**
```bash
# 这是正常现象，首次加载需要30-60秒
# 查看加载进度
docker compose logs -f ai-service

# 如果超过2分钟仍未启动，检查：
# 1. 内存是否足够（至少2GB）
docker stats

# 2. 模型文件是否正确
docker compose exec ai-service ls -lh /app/models/

# 3. 增加内存限制
# 编辑 docker-compose.yml
services:
  ai-service:
    deploy:
      resources:
        limits:
          memory: 4G
```

### 健康检查失败

#### 问题：服务健康检查不通过

**症状：**
```bash
$ make health
后端服务: ✗ 不健康
```

**诊断步骤：**
```bash
# 1. 检查服务是否运行
docker compose ps

# 2. 检查端口是否监听
netstat -tlnp | grep 3000

# 3. 手动测试健康检查
curl -v http://localhost:3000/health

# 4. 查看服务日志
docker compose logs backend

# 5. 进入容器检查
docker compose exec backend sh
wget -O- http://localhost:3000/health
```

**常见原因及解决：**

1. **服务未完全启动**
   ```bash
   # 等待30秒后重试
   sleep 30
   make health
   ```

2. **防火墙阻止**
   ```bash
   # 检查防火墙规则
   sudo ufw status
   
   # 允许端口
   sudo ufw allow 3000
   sudo ufw allow 8001
   sudo ufw allow 80
   ```

3. **配置错误**
   ```bash
   # 检查环境变量
   docker compose exec backend env | grep PORT
   
   # 重新加载配置
   docker compose down
   docker compose up -d
   ```

### 服务崩溃重启

#### 问题：服务频繁重启

**症状：**
```bash
$ docker compose ps
NAME                          STATUS
image-processor-backend       Restarting (1) 5 seconds ago
```

**诊断步骤：**
```bash
# 查看崩溃日志
docker compose logs --tail=100 backend

# 常见原因：

# 1. 内存不足
docker stats
# 解决：增加内存限制或释放系统内存

# 2. 未捕获的异常
# 查看错误堆栈
docker compose logs backend | grep -A 10 "Error"

# 3. 依赖服务不可用
# 检查AI服务是否正常
curl http://localhost:8001/health

# 4. 文件系统问题
# 检查磁盘空间
df -h

# 5. 配置错误
# 验证环境变量
docker compose config
```

---

## 上传和处理问题

### 文件上传问题

#### 问题：文件上传失败

**症状：** 前端显示"上传失败"错误

**诊断步骤：**
```bash
# 1. 检查文件格式和大小
# 支持：JPG, PNG, WEBP
# 最大：10MB

# 2. 测试后端上传接口
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-image.jpg"

# 3. 检查上传目录权限
ls -ld uploads/
chmod 755 uploads/

# 4. 检查磁盘空间
df -h

# 5. 查看后端日志
docker compose logs backend | grep -i upload
```

**常见错误及解决：**

1. **文件大小超限**
   ```json
   {
     "error": {
       "type": "FILE_SIZE_ERROR",
       "message": "文件大小超过限制"
     }
   }
   ```
   解决：压缩图片或增加限制
   ```bash
   # 编辑 .env
   MAX_FILE_SIZE=20971520  # 20MB
   
   # 重启服务
   docker compose restart backend
   ```

2. **文件格式不支持**
   ```json
   {
     "error": {
       "type": "FORMAT_ERROR",
       "message": "不支持的文件格式"
     }
   }
   ```
   解决：转换文件格式
   ```bash
   # 使用ImageMagick转换
   convert input.bmp output.jpg
   ```

3. **网络超时**
   解决：增加超时时间
   ```javascript
   // 前端代码
   const response = await fetch(url, {
     method: 'POST',
     body: formData,
     timeout: 60000  // 60秒
   });
   ```

#### 问题：上传速度慢

**症状：** 上传进度条长时间停滞

**原因及解决：**

1. **网络带宽限制**
   ```bash
   # 测试网络速度
   speedtest-cli
   
   # 压缩图片减小文件大小
   # 使用在线工具或命令行
   convert input.jpg -quality 85 output.jpg
   ```

2. **服务器负载高**
   ```bash
   # 检查服务器负载
   docker stats
   
   # 如果CPU/内存使用率高，等待或增加资源
   ```

3. **代理或VPN影响**
   ```bash
   # 临时禁用代理测试
   # 或配置代理例外
   ```

### 图片处理问题

#### 问题：处理超时

**症状：** 处理进度停在某个百分比不动

**诊断步骤：**
```bash
# 1. 检查处理状态
curl http://localhost:3000/api/process/status/<processId>

# 2. 查看AI服务日志
docker compose logs -f ai-service

# 3. 检查系统资源
docker stats

# 4. 查看队列状态
curl http://localhost:3000/api/process/queue
```

**解决方案：**
```bash
# 1. 重启AI服务
docker compose restart ai-service

# 2. 如果是资源不足，增加限制
# 编辑 docker-compose.yml
services:
  ai-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

# 3. 清理队列
docker compose restart backend

# 4. 重新提交处理请求
```

#### 问题：处理结果质量差

**症状：** 背景移除不干净或产品边缘粗糙

**原因分析：**
1. 原图质量问题
2. 产品与背景对比度低
3. AI模型置信度低

**解决方案：**
```bash
# 1. 检查置信度分数
# 如果 confidence < 0.7，说明识别不准确

# 2. 优化原图
# - 提高分辨率
# - 增加对比度
# - 使用纯色背景重新拍摄

# 3. 调整AI参数（如果支持）
# 编辑 ai-service/.env
CONFIDENCE_THRESHOLD=0.6

# 4. 重新处理
```

#### 问题：AI识别错误

**症状：** 产品主体识别错误，背景被保留或产品被移除

**诊断：**
```bash
# 查看AI服务日志
docker compose logs ai-service | grep -i confidence

# 检查模型版本
docker compose exec ai-service python -c "import onnxruntime; print(onnxruntime.__version__)"
```

**解决方案：**
1. **优化输入图片**
   - 确保产品清晰
   - 增加产品与背景对比
   - 避免复杂背景

2. **调整预处理参数**
   ```python
   # 编辑 ai-service/src/utils/image_processing.py
   # 调整图片预处理参数
   ```

3. **更新模型**
   ```bash
   # 下载最新模型
   cd ai-service/models
   wget https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx -O rmbg-1.4-new.onnx
   
   # 更新配置
   # 编辑 .env
   MODEL_PATH=/app/models/rmbg-1.4-new.onnx
   
   # 重启服务
   docker compose restart ai-service
   ```

---

## 性能问题

### 处理速度慢

#### 问题：处理时间超过预期

**正常处理时间：** 20-30秒  
**可接受范围：** 最多60秒

**诊断步骤：**
```bash
# 1. 检查系统资源使用
docker stats

# 2. 查看性能统计
curl http://localhost:3000/api/performance/stats

# 3. 检查队列长度
curl http://localhost:3000/api/process/queue

# 4. 查看处理日志
docker compose logs backend | grep "Processing time"
```

**优化方案：**

1. **增加资源分配**
   ```yaml
   # 编辑 docker-compose.yml
   services:
     ai-service:
       deploy:
         resources:
           limits:
             cpus: '4'
             memory: 8G
           reservations:
             cpus: '2'
             memory: 4G
   ```

2. **优化图片大小**
   ```bash
   # 处理前压缩图片
   convert input.jpg -resize 2000x2000\> -quality 90 output.jpg
   ```

3. **启用GPU加速**（如果有GPU）
   ```yaml
   # docker-compose.yml
   services:
     ai-service:
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: 1
                 capabilities: [gpu]
   ```

4. **扩展服务实例**
   ```bash
   # 启动多个AI服务实例
   docker compose up -d --scale ai-service=3
   ```

### 内存使用过高

#### 问题：服务内存占用持续增长

**症状：**
```bash
$ docker stats
CONTAINER              MEM USAGE / LIMIT
ai-service             3.8GiB / 4GiB
```

**诊断：**
```bash
# 1. 监控内存使用趋势
watch -n 1 'docker stats --no-stream'

# 2. 检查是否有内存泄漏
docker compose logs ai-service | grep -i memory

# 3. 查看进程内存
docker compose exec ai-service ps aux
```

**解决方案：**

1. **定期重启服务**
   ```bash
   # 添加cron任务每天重启
   0 3 * * * cd /path/to/project && docker compose restart ai-service
   ```

2. **增加内存限制**
   ```yaml
   # docker-compose.yml
   services:
     ai-service:
       deploy:
         resources:
           limits:
             memory: 6G
   ```

3. **优化代码**
   ```python
   # 在处理完成后显式释放内存
   import gc
   gc.collect()
   ```

### CPU使用率高

#### 问题：CPU持续高负载

**诊断：**
```bash
# 查看CPU使用
docker stats

# 查看进程
docker compose exec backend top
docker compose exec ai-service top
```

**解决方案：**

1. **限制并发处理**
   ```javascript
   // backend/src/services/taskManagerService.ts
   const MAX_CONCURRENT = 2;  // 减少并发数
   ```

2. **优化AI推理**
   ```python
   # 使用更少的线程
   session_options.intra_op_num_threads = 2
   session_options.inter_op_num_threads = 2
   ```

3. **添加请求队列**
   ```bash
   # 已实现，检查队列配置
   curl http://localhost:3000/api/process/queue
   ```

---

## 网络和连接问题

### CORS错误

#### 问题：前端无法访问后端API

**症状：**
```
Access to fetch at 'http://localhost:3000/api/upload' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**解决方案：**
```bash
# 编辑 backend/.env
CORS_ORIGIN=http://localhost:5173

# 或允许所有源（仅开发环境）
CORS_ORIGIN=*

# 重启后端服务
docker compose restart backend
```

### 连接超时

#### 问题：请求超时

**症状：** 前端显示"网络连接超时"

**诊断：**
```bash
# 1. 测试后端连接
curl -v http://localhost:3000/health

# 2. 测试AI服务连接
curl -v http://localhost:8001/health

# 3. 检查防火墙
sudo ufw status

# 4. 检查网络
ping localhost
```

**解决方案：**
```bash
# 1. 增加超时时间
# 前端配置
const response = await fetch(url, {
  timeout: 60000  // 60秒
});

# 2. 检查服务状态
docker compose ps

# 3. 重启网络
docker compose down
docker compose up -d
```

### 代理问题

#### 问题：通过代理无法访问

**解决方案：**
```bash
# 配置Docker代理
# 创建 /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"

# 重启Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 数据和存储问题

### 磁盘空间不足

#### 问题：磁盘空间耗尽

**症状：**
```bash
$ docker compose up
Error: No space left on device
```

**诊断：**
```bash
# 检查磁盘使用
df -h

# 检查Docker占用
docker system df

# 查找大文件
du -sh uploads/* | sort -h
```

**解决方案：**
```bash
# 1. 清理Docker资源
docker system prune -a --volumes

# 2. 清理旧文件
find uploads/ -mtime +7 -delete
find processed/ -mtime +7 -delete

# 3. 清理日志
docker compose logs --tail=0 > /dev/null

# 4. 增加磁盘空间或挂载新磁盘
```

### 文件丢失

#### 问题：处理后的文件找不到

**诊断：**
```bash
# 检查文件是否存在
docker compose exec backend ls -la /app/uploads/
docker compose exec backend ls -la /app/processed/

# 检查卷挂载
docker volume ls
docker volume inspect image-background-processor_uploads
```

**解决方案：**
```bash
# 1. 检查卷配置
docker compose config | grep volumes

# 2. 重新创建卷
docker compose down -v
docker compose up -d

# 3. 从备份恢复
make restore UPLOADS_BACKUP=backups/uploads-xxx.tar.gz
```

### 数据备份和恢复

#### 备份数据

```bash
# 使用Makefile命令
make backup

# 或手动备份
docker run --rm \
  -v image-background-processor_uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

#### 恢复数据

```bash
# 使用Makefile命令
make restore UPLOADS_BACKUP=backups/uploads-20251006.tar.gz

# 或手动恢复
docker run --rm \
  -v image-background-processor_uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/uploads-20251006.tar.gz -C /data
```

---

## 诊断工具

### 健康检查脚本

创建 `scripts/health-check.sh`:
```bash
#!/bin/bash

echo "=== 系统健康检查 ==="

# 检查Docker
echo -n "Docker: "
docker --version > /dev/null 2>&1 && echo "✓" || echo "✗"

# 检查服务状态
echo -n "后端服务: "
curl -s http://localhost:3000/health > /dev/null && echo "✓" || echo "✗"

echo -n "AI服务: "
curl -s http://localhost:8001/health > /dev/null && echo "✓" || echo "✗"

echo -n "前端服务: "
curl -s http://localhost:80/ > /dev/null && echo "✓" || echo "✗"

# 检查资源
echo "=== 资源使用 ==="
docker stats --no-stream

# 检查磁盘
echo "=== 磁盘空间 ==="
df -h | grep -E "Filesystem|/$"

# 检查队列
echo "=== 处理队列 ==="
curl -s http://localhost:3000/api/process/queue | jq .
```

### 日志收集脚本

创建 `scripts/collect-logs.sh`:
```bash
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="logs-$TIMESTAMP"

mkdir -p $LOG_DIR

echo "收集日志到 $LOG_DIR/"

# 收集Docker日志
docker compose logs --tail=1000 backend > $LOG_DIR/backend.log
docker compose logs --tail=1000 ai-service > $LOG_DIR/ai-service.log
docker compose logs --tail=1000 frontend > $LOG_DIR/frontend.log

# 收集系统信息
docker compose ps > $LOG_DIR/services.txt
docker stats --no-stream > $LOG_DIR/stats.txt
df -h > $LOG_DIR/disk.txt

# 打包
tar czf logs-$TIMESTAMP.tar.gz $LOG_DIR/
rm -rf $LOG_DIR/

echo "日志已保存到 logs-$TIMESTAMP.tar.gz"
```

---

## 日志分析

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务
docker compose logs -f backend
docker compose logs -f ai-service

# 查看最近N行
docker compose logs --tail=100 backend

# 搜索错误
docker compose logs backend | grep -i error

# 按时间过滤
docker compose logs --since 30m backend
docker compose logs --until 2025-10-06T12:00:00 backend
```

### 常见错误模式

#### 后端错误

```bash
# 文件上传错误
docker compose logs backend | grep "UPLOAD_ERROR"

# 处理错误
docker compose logs backend | grep "PROCESSING_ERROR"

# 网络错误
docker compose logs backend | grep "ECONNREFUSED"
```

#### AI服务错误

```bash
# 模型加载错误
docker compose logs ai-service | grep "model"

# 内存错误
docker compose logs ai-service | grep -i "memory"

# 推理错误
docker compose logs ai-service | grep "inference"
```

---

## 获取支持

### 提交问题前的准备

1. **收集信息**
   ```bash
   # 运行健康检查
   bash scripts/health-check.sh > health-report.txt
   
   # 收集日志
   bash scripts/collect-logs.sh
   
   # 记录错误信息
   # - 错误消息
   # - 重现步骤
   # - 系统环境
   ```

2. **尝试基本排查**
   - 查看本文档相关章节
   - 检查日志文件
   - 尝试重启服务
   - 搜索类似问题

3. **准备问题描述**
   - 问题症状
   - 重现步骤
   - 预期行为
   - 实际行为
   - 环境信息
   - 日志片段

### 提交Issue

在GitHub上提交Issue时，请包含：

```markdown
## 问题描述
[简要描述问题]

## 环境信息
- 操作系统: [e.g., Ubuntu 22.04]
- Docker版本: [e.g., 24.0.0]
- Docker Compose版本: [e.g., 2.20.0]

## 重现步骤
1. [第一步]
2. [第二步]
3. [...]

## 预期行为
[描述预期发生什么]

## 实际行为
[描述实际发生了什么]

## 日志
```
[粘贴相关日志]
```

## 已尝试的解决方案
[列出已经尝试的解决方法]
```

### 联系支持

- **GitHub Issues**: [项目地址]/issues
- **邮件支持**: support@example.com
- **文档**: 查看其他文档文件

---

## 预防性维护

### 定期检查清单

**每日：**
- [ ] 检查服务健康状态
- [ ] 查看错误日志
- [ ] 监控资源使用

**每周：**
- [ ] 清理旧文件
- [ ] 备份重要数据
- [ ] 审查性能指标
- [ ] 更新依赖包

**每月：**
- [ ] 系统安全更新
- [ ] 容量规划评估
- [ ] 性能优化审查
- [ ] 文档更新

### 监控建议

```bash
# 设置监控告警
# 1. CPU使用率 > 80%
# 2. 内存使用率 > 90%
# 3. 磁盘使用率 > 85%
# 4. 错误率 > 5%
# 5. 响应时间 > 30秒
```

---

**记住：大多数问题都可以通过查看日志和重启服务解决！** 🔧
