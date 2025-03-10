#!/bin/bash
echo "正在初始化数据库..."

# 激活虚拟环境
source venv/bin/activate

# 运行数据库迁移
echo "运行数据库迁移..."
cd "$(dirname "$0")"
alembic upgrade head

echo "数据库初始化完成！" 