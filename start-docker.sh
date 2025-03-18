#!/bin/bash

echo "正在启动 ESG AI 平台 Docker 容器..."

# 停止并删除现有容器
docker compose down

# 清理未使用的网络
docker network prune -f

# 构建并启动容器
docker compose up -d

echo "容器已启动！"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
docker compose ps 