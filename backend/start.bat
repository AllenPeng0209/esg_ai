@echo off
echo 正在启动 ESG AI 平台后端...

REM 检查虚拟环境是否存在
if not exist venv (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate

REM 安装依赖
echo 安装依赖...
pip install -r requirements.txt

REM 启动应用
echo 启动应用...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause 