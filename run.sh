#!/bin/bash

echo "🚀 图片背景处理工具 - 启动脚本"
echo "================================"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建"
else
    echo "✅ .env 文件已存在"
fi

# 检查模型文件
if [ ! -f ai-service/models/rmbg-1.4.onnx ]; then
    echo "❌ 错误: AI模型文件不存在"
    echo "请先下载模型文件到 ai-service/models/rmbg-1.4.onnx"
    echo "下载地址: https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"
    exit 1
else
    echo "✅ AI模型文件已存在 ($(ls -lh ai-service/models/rmbg-1.4.onnx | awk '{print $5}'))"
fi

echo ""
echo "🔨 开始构建 Docker 镜像..."
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

docker compose build

if [ $? -ne 0 ]; then
    echo "❌ Docker 构建失败"
    exit 1
fi

echo ""
echo "✅ Docker 镜像构建完成"
echo ""
echo "🚀 启动所有服务..."
echo ""

docker compose up -d

if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败"
    exit 1
fi

echo ""
echo "⏳ 等待服务启动..."
sleep 10

echo ""
echo "🔍 检查服务状态..."
echo ""

docker compose ps

echo ""
echo "🏥 健康检查..."
echo ""

# 检查后端
echo -n "后端服务 (http://localhost:3000): "
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "⚠️  未就绪（可能还在启动中）"
fi

# 检查AI服务
echo -n "AI服务 (http://localhost:8001): "
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "⚠️  未就绪（可能还在启动中）"
fi

# 检查前端
echo -n "前端服务 (http://localhost:80): "
if curl -s http://localhost:80/ > /dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "⚠️  未就绪（可能还在启动中）"
fi

echo ""
echo "================================"
echo "🎉 启动完成！"
echo ""
echo "📱 访问应用:"
echo "   前端: http://localhost:80"
echo "   后端API: http://localhost:3000"
echo "   AI服务: http://localhost:8001"
echo ""
echo "📊 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   查看状态: docker compose ps"
echo "   停止服务: docker compose down"
echo "   重启服务: docker compose restart"
echo ""
echo "📚 文档:"
echo "   用户指南: USER_GUIDE.md"
echo "   API文档: API_DOCUMENTATION.md"
echo "   故障排除: TROUBLESHOOTING.md"
echo ""
echo "💡 提示: 如果服务显示未就绪，请等待30-60秒后再次检查"
echo "   运行: make health"
echo ""
