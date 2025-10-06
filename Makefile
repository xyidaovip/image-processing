.PHONY: help build up down restart logs ps clean test health backup restore

# 默认目标
help:
	@echo "可用命令:"
	@echo "  make build      - 构建所有Docker镜像"
	@echo "  make up         - 启动所有服务"
	@echo "  make down       - 停止所有服务"
	@echo "  make restart    - 重启所有服务"
	@echo "  make logs       - 查看所有服务日志"
	@echo "  make ps         - 查看服务状态"
	@echo "  make clean      - 清理所有容器和卷"
	@echo "  make test       - 运行测试"
	@echo "  make health     - 检查服务健康状态"
	@echo "  make backup     - 备份数据"
	@echo "  make restore    - 恢复数据"

# 构建所有镜像
build:
	@echo "构建Docker镜像..."
	docker-compose build

# 启动所有服务
up:
	@echo "启动服务..."
	docker-compose up -d
	@echo "等待服务启动..."
	@sleep 5
	@make health

# 停止所有服务
down:
	@echo "停止服务..."
	docker-compose down

# 重启所有服务
restart:
	@echo "重启服务..."
	docker-compose restart
	@sleep 5
	@make health

# 查看日志
logs:
	docker-compose logs -f

# 查看服务状态
ps:
	docker-compose ps

# 清理容器和卷
clean:
	@echo "清理容器和卷..."
	docker-compose down -v
	@echo "清理完成"

# 运行测试
test:
	@echo "运行后端测试..."
	docker-compose exec backend npm test
	@echo "运行AI服务测试..."
	docker-compose exec ai-service pytest

# 健康检查
health:
	@echo "检查服务健康状态..."
	@echo -n "后端服务: "
	@curl -s http://localhost:3000/health > /dev/null && echo "✓ 健康" || echo "✗ 不健康"
	@echo -n "AI服务: "
	@curl -s http://localhost:8001/health > /dev/null && echo "✓ 健康" || echo "✗ 不健康"
	@echo -n "前端服务: "
	@curl -s http://localhost:80/health > /dev/null && echo "✓ 健康" || echo "✗ 不健康"

# 备份数据
backup:
	@echo "备份数据..."
	@mkdir -p backups
	@docker run --rm -v image-background-processor_uploads:/data -v $(PWD)/backups:/backup alpine tar czf /backup/uploads-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@docker run --rm -v image-background-processor_processed:/data -v $(PWD)/backups:/backup alpine tar czf /backup/processed-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "备份完成，文件保存在 backups/ 目录"

# 恢复数据（需要指定备份文件）
restore:
	@echo "恢复数据..."
	@if [ -z "$(UPLOADS_BACKUP)" ]; then echo "请指定上传文件备份: make restore UPLOADS_BACKUP=backups/uploads-xxx.tar.gz"; exit 1; fi
	@docker run --rm -v image-background-processor_uploads:/data -v $(PWD)/backups:/backup alpine tar xzf /backup/$(notdir $(UPLOADS_BACKUP)) -C /data
	@if [ -n "$(PROCESSED_BACKUP)" ]; then docker run --rm -v image-background-processor_processed:/data -v $(PWD)/backups:/backup alpine tar xzf /backup/$(notdir $(PROCESSED_BACKUP)) -C /data; fi
	@echo "恢复完成"

# 查看后端日志
logs-backend:
	docker-compose logs -f backend

# 查看AI服务日志
logs-ai:
	docker-compose logs -f ai-service

# 查看前端日志
logs-frontend:
	docker-compose logs -f frontend

# 进入后端容器
shell-backend:
	docker-compose exec backend sh

# 进入AI服务容器
shell-ai:
	docker-compose exec ai-service sh

# 更新部署（零停机）
update:
	@echo "更新部署..."
	@git pull
	@docker-compose build
	@docker-compose up -d --no-deps --build backend
	@docker-compose up -d --no-deps --build ai-service
	@docker-compose up -d --no-deps --build frontend
	@echo "更新完成"
	@make health

# 生产环境部署
deploy-prod:
	@echo "部署到生产环境..."
	@if [ ! -f .env ]; then echo "错误: .env 文件不存在"; exit 1; fi
	@make build
	@make up
	@echo "生产环境部署完成"

# 开发环境启动
dev:
	@echo "启动开发环境..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
