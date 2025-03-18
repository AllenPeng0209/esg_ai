# ESG AI 平台

基于 FastAPI 和 React 的 ESG AI 平台，提供会员系统、碳足迹工作流和 OpenAI 集成等功能。

## 功能特点

- 用户认证和授权系统
- 碳足迹工作流管理
- BOM 文件上传和标准化
- 产品碳足迹计算
- OpenAI API 集成

## 项目结构

```
esg_ai/
│
├── frontend/                # React 前端
│   ├── src/                 # 源代码
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   └── services/        # API 服务
│   └── public/              # 静态资源
│
├── backend/                 # FastAPI 后端
│   ├── app/                 # 应用代码
│   │   ├── api/             # API 路由
│   │   ├── core/            # 核心功能
│   │   ├── models/          # 数据库模型
│   │   ├── schemas/         # Pydantic 模式
│   │   └── services/        # 业务服务
│   └── migrations/          # 数据库迁移
│
├── docker-compose.yml       # Docker Compose 配置
├── start-docker.bat         # Windows Docker 启动脚本
└── start-docker.sh          # Linux/Mac Docker 启动脚本
```

## 快速开始

### 使用 Docker（推荐）

1. 确保已安装 [Docker](https://www.docker.com/get-started) 和 [Docker Compose](https://docs.docker.com/compose/install/)

2. 克隆仓库
   ```bash
   git clone <repository-url>
   cd esg_ai
   ```

3. 设置 OpenAI API 密钥（可选）
   ```bash
   # Windows
   set OPENAI_API_KEY=your-openai-api-key

   # Linux/Mac
   export OPENAI_API_KEY=your-openai-api-key
   ```

4. 启动容器
   ```bash
   # Windows
   start-docker.bat

   # Linux/Mac
   chmod +x start-docker.sh
   ./start-docker.sh
   ```

5. 访问应用
   - 前端: http://localhost:3000
   - 后端 API: http://localhost:8000
   - API 文档: http://localhost:8000/docs

### 手动安装

#### 后端

1. 进入后端目录
   ```bash
   cd backend
   ```

2. 创建虚拟环境
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   ```

3. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

4. 配置环境变量
   ```bash
   # 复制示例配置
   cp .env.example .env
   # 编辑 .env 文件，填写数据库和 OpenAI API 密钥
   ```

5. 初始化数据库
   ```bash
   alembic upgrade head
   ```

6. 启动应用
   ```bash
   uvicorn app.main:app --reload
   ```

#### 前端

1. 进入前端目录
   ```bash
   cd frontend
   ```

2. 安装依赖
   ```bash
   npm install
   # 或使用 yarn
   yarn install
   ```

3. 启动应用
   ```bash
   npm start
   # 或使用 yarn
   yarn start
   ```

## API 文档

启动后端后，可以通过以下URL访问API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
