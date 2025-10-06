# 监控指南 (Monitoring Guide)

## 概述

本文档描述如何监控图片背景处理系统的运行状态和性能指标。

## 健康检查端点

### 后端服务

```bash
curl http://localhost:3000/health
```

响应示例：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-05T12:00:00.000Z",
    "uptime": 3600,
    "environment": "production"
  }
}
```

### AI服务

```bash
curl http://localhost:8001/health
```

响应示例：
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### 前端服务

```bash
curl http://localhost:80/health
```

## 性能指标

### 获取性能统计

```bash
curl http://localhost:3000/api/performance/stats
```

响应示例：
```json
{
  "success": true,
  "data": {
    "totalProcessed": 1234,
    "averageProcessingTime": 2500,
    "successRate": 0.98,
    "queueLength": 5,
    "activeProcessing": 2
  }
}
```

### 关键指标说明

- **totalProcessed**: 总处理数量
- **averageProcessingTime**: 平均处理时间（毫秒）
- **successRate**: 成功率（0-1）
- **queueLength**: 当前队列长度
- **activeProcessing**: 正在处理的任务数

## Docker监控

### 查看容器状态

```bash
docker-compose ps
```

### 查看资源使用

```bash
docker stats
```

输出示例：
```
CONTAINER ID   NAME                    CPU %     MEM USAGE / LIMIT     MEM %
abc123         image-processor-backend  2.5%     256MiB / 2GiB        12.5%
def456         image-processor-ai       15.3%    1.2GiB / 4GiB        30.0%
ghi789         image-processor-frontend 0.1%     32MiB / 512MiB       6.25%
```

### 查看容器日志

```bash
# 实时查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近100行日志
docker-compose logs --tail=100 backend
```

## Prometheus监控（可选）

### 启动监控服务

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 访问Prometheus

打开浏览器访问: http://localhost:9090

### 常用查询

#### 请求率
```promql
rate(http_requests_total[5m])
```

#### 错误率
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

#### 响应时间（95分位）
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### CPU使用率
```promql
rate(container_cpu_usage_seconds_total[5m])
```

#### 内存使用率
```promql
container_memory_usage_bytes / container_spec_memory_limit_bytes
```

## Grafana仪表板（可选）

### 访问Grafana

打开浏览器访问: http://localhost:3001

默认登录信息：
- 用户名: admin
- 密码: admin

### 配置数据源

1. 登录Grafana
2. 进入 Configuration > Data Sources
3. 添加Prometheus数据源
4. URL: http://prometheus:9090
5. 保存并测试

### 导入仪表板

推荐的仪表板ID：
- Docker监控: 893
- Node Exporter: 1860
- 自定义应用监控: 创建自定义仪表板

## 告警配置

### Prometheus告警规则

告警规则定义在 `monitoring/alerts.yml` 中：

- **ServiceDown**: 服务停止超过1分钟
- **HighErrorRate**: 错误率超过5%
- **HighResponseTime**: 95分位响应时间超过5秒
- **HighCPUUsage**: CPU使用率超过80%
- **HighMemoryUsage**: 内存使用率超过90%
- **LowDiskSpace**: 磁盘可用空间少于10%

### 配置告警通知

编辑 `monitoring/alertmanager.yml` 配置告警接收方式：

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
```

## 日志管理

### 日志级别

- **ERROR**: 错误信息
- **WARN**: 警告信息
- **INFO**: 一般信息
- **DEBUG**: 调试信息

### 配置日志级别

在 `.env` 文件中设置：
```
LOG_LEVEL=info
```

### 日志轮转

配置 `/etc/logrotate.d/docker-containers`:

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

### 集中日志管理（可选）

使用ELK Stack或其他日志聚合工具：

```bash
# 使用Filebeat收集日志
docker run -d \
  --name=filebeat \
  --user=root \
  --volume="$(pwd)/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro" \
  --volume="/var/lib/docker/containers:/var/lib/docker/containers:ro" \
  --volume="/var/run/docker.sock:/var/run/docker.sock:ro" \
  docker.elastic.co/beats/filebeat:8.0.0
```

## 性能优化建议

### 监控指标阈值

| 指标 | 正常 | 警告 | 严重 |
|------|------|------|------|
| CPU使用率 | < 60% | 60-80% | > 80% |
| 内存使用率 | < 70% | 70-90% | > 90% |
| 磁盘使用率 | < 80% | 80-90% | > 90% |
| 响应时间 | < 1s | 1-3s | > 3s |
| 错误率 | < 1% | 1-5% | > 5% |

### 优化建议

1. **高CPU使用率**
   - 增加容器CPU限制
   - 扩展服务实例
   - 优化代码性能

2. **高内存使用率**
   - 增加容器内存限制
   - 检查内存泄漏
   - 优化数据处理

3. **高响应时间**
   - 优化数据库查询
   - 添加缓存层
   - 增加服务实例

4. **高错误率**
   - 检查应用日志
   - 验证依赖服务
   - 增加错误处理

## 故障排查

### 服务无响应

1. 检查容器状态：
```bash
docker-compose ps
```

2. 查看容器日志：
```bash
docker-compose logs backend
```

3. 检查资源使用：
```bash
docker stats
```

### 性能下降

1. 查看性能指标：
```bash
curl http://localhost:3000/api/performance/stats
```

2. 检查队列长度
3. 查看处理时间趋势
4. 检查系统资源

### 内存泄漏

1. 监控内存使用趋势
2. 使用Node.js内存分析工具
3. 定期重启服务（临时方案）

## 定期维护

### 每日检查

- 查看服务健康状态
- 检查错误日志
- 监控资源使用

### 每周检查

- 审查性能趋势
- 清理旧日志文件
- 备份重要数据

### 每月检查

- 更新依赖包
- 审查安全漏洞
- 优化系统配置
- 容量规划

## 监控最佳实践

1. **设置合理的告警阈值**
   - 避免告警疲劳
   - 关注关键指标

2. **保留历史数据**
   - 至少保留30天数据
   - 用于趋势分析

3. **定期审查监控数据**
   - 识别性能瓶颈
   - 优化系统配置

4. **文档化异常情况**
   - 记录故障原因
   - 建立知识库

5. **自动化响应**
   - 自动扩展
   - 自动重启
   - 自动告警
