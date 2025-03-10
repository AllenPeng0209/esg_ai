#!/bin/bash
echo "正在启动 ESG AI 平台 Docker 容器..."

# 构建并启动容器
docker-compose up -d --build

echo "容器已启动！"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs" 