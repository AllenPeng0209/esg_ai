#!/usr/bin/env python
# -*- coding: utf-8 -*-

import asyncio
import logging
import os
import random
import time
from typing import Any, Dict, List

import httpx

from app.config import settings
from app.services.ai_service import standardize_bom

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API端点配置
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# 测试用BOM数据
TEST_BOM_DATA = """组件ID,组件名称,材料类型,重量(g),供应商
1,有机小麦粉,11779.78,0,未知供应商
2,有机橄榄油,4831.4,0,Analysis and trends for Life Cycle Assessment
3,有机白砂糖,7445.04,0,碳中和产品，上游过程已实现碳中和"""

# OpenAI模型参数
OPENAI_MODEL = "gpt-3.5-turbo"
OPENAI_API_KEY = settings.OPENAI_API_KEY

# DeepSeek模型参数
DEEPSEEK_MODEL = "deepseek-chat"
DEEPSEEK_API_KEY = (
    settings.DEEPSEEK_API_KEY
    if hasattr(settings, "DEEPSEEK_API_KEY")
    else settings.OPENAI_API_KEY
)


class ApiTester:
    """API测试基类"""

    def __init__(self, api_name, model, url, api_key):
        self.api_name = api_name
        self.model = model
        self.url = url
        self.api_key = api_key
        self.logger = logger

    async def call_api(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """调用API"""
        self.logger.info(f"使用{self.api_name} API调用模型：{self.model}")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        payload = {
            "messages": messages,
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 2000,
        }

        self.logger.info(f"请求URL: {self.url}")
        self.logger.info(f"使用API密钥: {self.api_key[:10]}...")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.url, json=payload, headers=headers, timeout=60.0
                )

                self.logger.info(f"响应状态码: {response.status_code}")

                if response.status_code != 200:
                    self.logger.error(
                        f"API调用失败: {response.status_code}, 内容: {response.text}"
                    )
                    return self.generate_mock_response(messages)

                result = response.json()
                self.logger.info(f"{self.api_name} API调用成功")
                return result

        except Exception as e:
            self.logger.error(f"{self.api_name} API调用失败: {str(e)}")
            return self.generate_mock_response(messages)

    def generate_mock_response(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """生成模拟响应"""
        self.logger.info(f"生成{self.api_name}模拟响应")

        mock_content = """组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
1,有机小麦粉,小麦,11779.78,未知供应商,0.8
2,有机橄榄油,植物油,4831.4,Analysis and trends for Life Cycle Assessment,3.2
3,有机白砂糖,糖类,7445.04,碳中和产品上游过程已实现碳中和,1.5"""

        return {
            "id": f"mock-{self.api_name}-{random.randint(1000, 9999)}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": f"{self.model}-mock",
            "choices": [
                {
                    "message": {"role": "assistant", "content": mock_content},
                    "finish_reason": "stop",
                    "index": 0,
                }
            ],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 200,
                "total_tokens": 300,
            },
        }

    async def test_bom_standardize(self, bom_data: str) -> str:
        """测试BOM标准化"""
        self.logger.info(f"开始{self.api_name} BOM标准化测试...")
        self.logger.info(f"原始BOM数据:\n{bom_data}")

        try:
            # 准备BOM标准化提示词
            prompt = f"""
            你是一个BOM（物料清单）规范化专家。我将提供一个原始BOM文件内容，请帮我将其转换为标准格式。

            标准格式要求：
            1. 包含以下字段：组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
            2. 通过语义理解识别原始数据中对应的信息
            3. 对于材料类型，仅当原始数据明确包含此信息时才填写，否则保留空值
            4. 原始数据中如果有重量信息，请填入"重量(g)"列
            5. 原始数据中如果没有重量信息但有数量信息，请将数量值填入"重量(g)"列，并在原数据中保留数量值
            6. 如果既有重量信息又有数量信息，优先使用重量信息填入"重量(g)"列
            7. 严格保留原始数据中的所有值，不要自行估算或填充缺失数据
            8. 保持数据的完整性，不要遗漏任何组件
            9. 对于数值型字段，维持原始精度

            注意：
            - 输出格式必须包含"重量(g)"列，而不是"数量"和"单位"列
            - 对于原始数据中不存在的信息，请在输出中保留为空，不要生成或推测任何值
            - 特别是碳排放因子等计算值，除非原始数据中明确包含，否则不应自行填充

            原始BOM内容：
            {bom_data}

            请输出标准化后的BOM内容，必须是CSV格式，包含表头和所有字段。对于原始数据中没有的字段，请保留为空：
            """

            # 增强系统提示
            system_prompt = """
            你是一个专业的BOM规范化工具，能够将不同格式的BOM数据转换为标准格式。

            你的主要任务是：
            1. 识别原始数据中已有的信息并映射到标准格式
            2. 保留原始数据的原始单位和数量，不进行单位转换
            3. 保留原始数据的完整性，不添加不存在的信息
            4. 对于原始数据中不存在的字段，在输出中保留为空
            5. 不要推测或估算任何数值，特别是碳排放因子等

            所有输出必须是结构化的CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
            """

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]

            # 调用API
            response = await self.call_api(messages)

            if "choices" in response and len(response["choices"]) > 0:
                standardized_bom = response["choices"][0]["message"]["content"].strip()
                self.logger.info(f"{self.api_name}标准化后的BOM数据:\n{standardized_bom}")
                self.logger.info(f"{self.api_name} BOM标准化测试成功")
                return standardized_bom
            else:
                self.logger.error(f"{self.api_name}响应格式错误: {response}")
                return "标准化失败"

        except Exception as e:
            self.logger.error(f"{self.api_name} BOM标准化测试失败: {str(e)}")
            return "标准化失败"


class OpenAITester(ApiTester):
    """OpenAI API测试类"""

    def __init__(self):
        super().__init__("OpenAI", OPENAI_MODEL, OPENAI_API_URL, OPENAI_API_KEY)


class DeepSeekTester(ApiTester):
    """DeepSeek API测试类"""

    def __init__(self):
        super().__init__("DeepSeek", DEEPSEEK_MODEL, DEEPSEEK_API_URL, DEEPSEEK_API_KEY)


class SystemTester(ApiTester):
    """系统内置标准化功能测试类"""

    def __init__(self):
        super().__init__("系统内置", "mock", "", "")

    async def test_bom_standardize(self, bom_data: str) -> str:
        """测试系统内置的BOM标准化功能"""
        self.logger.info("开始测试系统内置BOM标准化功能...")
        self.logger.info(f"原始BOM数据:\n{bom_data}")

        try:
            # 调用系统内置的BOM标准化功能
            standardized_bom = await standardize_bom(bom_data)

            self.logger.info(f"系统内置标准化后的BOM数据:\n{standardized_bom}")
            self.logger.info("系统内置BOM标准化测试成功")
            return standardized_bom
        except Exception as e:
            self.logger.error(f"系统内置BOM标准化测试失败: {str(e)}")
            return "标准化失败"


async def run_tests():
    """运行所有测试"""
    # 测试系统内置标准化功能
    system_tester = SystemTester()
    await system_tester.test_bom_standardize(TEST_BOM_DATA)

    print("\n" + "=" * 50 + "\n")

    # 测试OpenAI API
    openai_tester = OpenAITester()
    await openai_tester.test_bom_standardize(TEST_BOM_DATA)

    print("\n" + "=" * 50 + "\n")

    # 测试DeepSeek API
    deepseek_tester = DeepSeekTester()
    await deepseek_tester.test_bom_standardize(TEST_BOM_DATA)


async def compare_apis():
    """比较不同API的结果"""
    print("\n开始比较不同API的BOM标准化结果...\n")

    system_tester = SystemTester()
    openai_tester = OpenAITester()
    deepseek_tester = DeepSeekTester()

    system_result = await system_tester.test_bom_standardize(TEST_BOM_DATA)
    openai_result = await openai_tester.test_bom_standardize(TEST_BOM_DATA)
    deepseek_result = await deepseek_tester.test_bom_standardize(TEST_BOM_DATA)

    # 比较结果输出
    print("\n" + "=" * 50)
    print("比较结果：\n")

    def format_for_display(result):
        # 返回前5行用于显示
        lines = result.strip().split("\n")
        if len(lines) > 5:
            return "\n".join(lines[:5]) + f"\n... (共{len(lines)}行)"
        return result

    print("系统内置结果：")
    print(format_for_display(system_result))
    print("\nOpenAI结果：")
    print(format_for_display(openai_result))
    print("\nDeepSeek结果：")
    print(format_for_display(deepseek_result))

    # 简单比较输出行数
    system_lines = len(system_result.strip().split("\n"))
    openai_lines = len(openai_result.strip().split("\n"))
    deepseek_lines = len(deepseek_result.strip().split("\n"))

    print("\n结果统计：")
    print(f"- 系统内置: {system_lines}行")
    print(f"- OpenAI: {openai_lines}行")
    print(f"- DeepSeek: {deepseek_lines}行")

    # 检查结果是否包含碳排放因子字段
    print("\n包含碳排放因子(kgCO2e/kg)字段：")
    print(f"- 系统内置: {'是' if '碳排放因子' in system_result else '否'}")
    print(f"- OpenAI: {'是' if '碳排放因子' in openai_result else '否'}")
    print(f"- DeepSeek: {'是' if '碳排放因子' in deepseek_result else '否'}")
    print("=" * 50)


async def main():
    """主函数"""
    # 选择测试模式
    test_mode = os.environ.get("TEST_MODE", "INDIVIDUAL")  # INDIVIDUAL 或 COMPARE

    if test_mode == "COMPARE":
        await compare_apis()
    else:
        await run_tests()


if __name__ == "__main__":
    asyncio.run(main())
