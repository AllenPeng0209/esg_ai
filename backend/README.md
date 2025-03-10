# ESG AI 平台后端

基于 FastAPI 的 ESG AI 平台后端系统，提供会员系统、碳足迹工作流和 OpenAI 集成等功能。

## 功能特点

- 用户认证和授权系统
- 碳足迹工作流管理
- BOM 文件上传和标准化
- 产品碳足迹计算
- OpenAI API 集成

## 安装和运行

### 前提条件

- Python 3.8+
- PostgreSQL 数据库

### 快速启动

我们提供了便捷的启动脚本，可以自动完成环境设置和应用启动：

#### Windows

1. 双击运行 `start.bat` 脚本
2. 首次运行后，双击 `init_db.bat` 初始化数据库

#### Linux/Mac

1. 添加执行权限：`chmod +x start.sh init_db.sh`
2. 运行启动脚本：`./start.sh`
3. 首次运行后，执行 `./init_db.sh` 初始化数据库

### 手动安装步骤

1. 克隆仓库

```bash
git clone <repository-url>
cd esg_ai/backend
```

2. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows
```

3. 安装依赖

```bash
pip install -r requirements.txt
```

4. 配置环境变量

复制 `.env.example` 文件为 `.env` 并填写相应的配置：

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/esg_ai
SECRET_KEY=your-secret-key-for-jwt
OPENAI_API_KEY=your-openai-api-key
```

5. 初始化数据库

```bash
alembic upgrade head
```

6. 运行应用

```bash
uvicorn app.main:app --reload
```

## API 文档

启动应用后，可以通过以下URL访问API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 项目结构

```
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # 主应用入口
│   ├── config.py               # 配置文件
│   ├── database.py             # 数据库连接
│   │
│   ├── models/                 # 数据库模型
│   │   ├── __init__.py
│   │   ├── user.py             # 用户模型
│   │   ├── workflow.py         # 工作流模型
│   │   ├── product.py          # 产品模型
│   │   └── bom.py              # BOM模型
│   │
│   ├── schemas/                # Pydantic模式
│   │   ├── __init__.py
│   │   ├── user.py             # 用户模式
│   │   ├── workflow.py         # 工作流模式
│   │   ├── product.py          # 产品模式
│   │   └── bom.py              # BOM模式
│   │
│   ├── api/                    # API路由
│   │   ├── __init__.py
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # 认证路由
│   │   │   ├── users.py        # 用户路由
│   │   │   ├── workflows.py    # 工作流路由
│   │   │   ├── products.py     # 产品路由
│   │   │   ├── boms.py         # BOM路由
│   │   │   └── ai.py           # AI集成路由
│   │   └── api.py              # 路由注册
│   │
│   ├── core/                   # 核心功能
│   │   ├── __init__.py
│   │   ├── security.py         # 安全相关功能
│   │   ├── dependencies.py     # 依赖注入
│   │   └── exceptions.py       # 异常处理
│   │
│   └── services/               # 业务服务
│       ├── __init__.py
│       ├── user_service.py     # 用户服务
│       ├── workflow_service.py # 工作流服务
│       ├── product_service.py  # 产品服务
│       ├── bom_service.py      # BOM服务
│       └── ai_service.py       # AI服务
│
├── migrations/                 # 数据库迁移
│   ├── versions/               # 迁移版本
│   │   └── initial_migration.py # 初始迁移
│   ├── env.py                  # 迁移环境
│   └── script.py.mako          # 迁移脚本模板
│
├── alembic.ini                 # Alembic配置
├── .env                        # 环境变量
├── .env.example                # 环境变量示例
├── requirements.txt            # 依赖
├── start.bat                   # Windows启动脚本
├── start.sh                    # Linux/Mac启动脚本
├── init_db.bat                 # Windows数据库初始化脚本
├── init_db.sh                  # Linux/Mac数据库初始化脚本
└── README.md                   # 文档
``` 