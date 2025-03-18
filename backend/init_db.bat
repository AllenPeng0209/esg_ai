@echo off
echo 正在初始化数据库...

REM 激活虚拟环境
call venv\Scripts\activate

REM 运行数据库迁移
echo 运行数据库迁移...
cd %~dp0
alembic upgrade head

echo 数据库初始化完成！
pause
