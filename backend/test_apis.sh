#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== ESG AI平台 BOM标准化API测试工具 ===${NC}"
echo

# 检查命令行参数
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "使用方法: $0 [选项]"
  echo "选项:"
  echo "  -m, --mock       使用模拟API"
  echo "  -o, --openai     使用OpenAI API"
  echo "  -d, --deepseek   使用DeepSeek API"
  echo "  -c, --compare    比较所有API结果"
  echo "  -h, --help       显示此帮助信息"
  exit 0
fi

# 根据参数设置API服务
if [ "$1" == "-m" ] || [ "$1" == "--mock" ]; then
  echo -e "${YELLOW}切换到模拟API服务...${NC}"
  docker exec -it esg_ai_backend python /app/switch_api.py --service mock --restart
  
  echo -e "${GREEN}运行模拟API测试...${NC}"
  docker exec -it esg_ai_backend python /app/test_multi_api_bom.py
  
elif [ "$1" == "-o" ] || [ "$1" == "--openai" ]; then
  echo -e "${YELLOW}切换到OpenAI API服务...${NC}"
  docker exec -it esg_ai_backend python /app/switch_api.py --service openai --restart
  
  echo -e "${GREEN}运行OpenAI API测试...${NC}"
  docker exec -it esg_ai_backend python /app/test_multi_api_bom.py
  
elif [ "$1" == "-d" ] || [ "$1" == "--deepseek" ]; then
  echo -e "${YELLOW}切换到DeepSeek API服务...${NC}"
  docker exec -it esg_ai_backend python /app/switch_api.py --service deepseek --restart
  
  echo -e "${GREEN}运行DeepSeek API测试...${NC}"
  docker exec -it esg_ai_backend python /app/test_multi_api_bom.py
  
elif [ "$1" == "-c" ] || [ "$1" == "--compare" ]; then
  echo -e "${GREEN}运行API比较测试...${NC}"
  docker exec -it esg_ai_backend bash -c "export TEST_MODE=COMPARE && python /app/test_multi_api_bom.py"
  
else
  echo -e "${YELLOW}没有指定API服务，使用默认设置运行测试...${NC}"
  docker exec -it esg_ai_backend python /app/test_multi_api_bom.py
fi

echo
echo -e "${BLUE}=== 测试完成 ===${NC}" 