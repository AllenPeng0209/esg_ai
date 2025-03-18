-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 创建Block类型表
CREATE TABLE IF NOT EXISTS "blockTypes" (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  "defaultConfig" JSONB DEFAULT '{}',
  "inputSchema" JSONB DEFAULT '{}',
  "outputSchema" JSONB DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 创建初始管理员用户
INSERT INTO users (id, username, email, password, "fullName", role, "isActive", "createdAt", "updatedAt")
VALUES (
  uuid_generate_v4(),
  'admin',
  'admin@example.com',
  -- 密码: admin123 (已使用bcrypt加密)
  '$2a$10$rQnpe.2LS0Qx5vLqXV2Xz.Yg4YpCLdGl7Zrfw5oJXwvUVUY4.PSHe',
  '系统管理员',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 创建初始Block类型
INSERT INTO "blockTypes" (id, name, category, description, icon, "defaultConfig", "inputSchema", "outputSchema", "isActive", "createdAt", "updatedAt")
VALUES
  -- 数据源类型
  (
    uuid_generate_v4(),
    'csvDataSource',
    '数据源',
    'CSV文件数据源',
    'file',
    '{"filePath": "", "delimiter": ",", "headers": true}',
    '{}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'apiDataSource',
    '数据源',
    'API数据源',
    'api',
    '{"url": "", "method": "GET", "headers": {}, "params": {}}',
    '{}',
    '{"data": "any", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'databaseDataSource',
    '数据源',
    '数据库数据源',
    'database',
    '{"connection": {"type": "postgres", "host": "", "port": 5432, "database": "", "username": "", "password": ""}, "query": ""}',
    '{}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),

  -- 数据处理类型
  (
    uuid_generate_v4(),
    'dataClean',
    '数据处理',
    '数据清洗',
    'filter',
    '{"steps": []}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'dataTransform',
    '数据处理',
    '数据转换',
    'transform',
    '{"transformations": []}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'dataNormalize',
    '数据处理',
    '数据标准化',
    'normalize',
    '{"columns": [], "method": "minmax"}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),

  -- AI分析类型
  (
    uuid_generate_v4(),
    'nlpAnalysis',
    'AI分析',
    'NLP文本分析',
    'robot',
    '{"analysisType": "sentiment", "targetColumn": "", "language": "zh"}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'predictionModel',
    'AI分析',
    '预测模型',
    'thunderbolt',
    '{"modelType": "regression", "targetColumn": "", "featureColumns": []}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'recommendationGenerator',
    'AI分析',
    '建议生成',
    'bulb',
    '{"recommendationType": "esg", "targetColumns": []}',
    '{"data": "array"}',
    '{"data": "array", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),

  -- 可视化类型
  (
    uuid_generate_v4(),
    'chartGenerator',
    '可视化',
    '图表生成',
    'bar-chart',
    '{"chartType": "bar", "xAxis": "", "yAxis": []}',
    '{"data": "array"}',
    '{"data": "any", "config": "object", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'reportGenerator',
    '可视化',
    '报告生成',
    'file-text',
    '{"title": "ESG分析报告", "sections": [], "format": "html"}',
    '{"data": "array", "charts": "array", "recommendations": "array"}',
    '{"data": "object", "output": "string", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'dashboardGenerator',
    '可视化',
    '仪表盘生成',
    'dashboard',
    '{"title": "ESG仪表盘", "layout": [], "theme": "light"}',
    '{"charts": "array", "kpis": "array"}',
    '{"config": "object", "metadata": "object"}',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;
