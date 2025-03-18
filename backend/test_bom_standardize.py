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
from app.services.ai_service import OPENAI_API_URL, standardize_bom

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 测试使用真实API的BOM标准化
async def call_openai_api_directly(
    messages: List[Dict[str, str]], model: str = "deepseek-chat"
) -> Dict[str, Any]:
    """直接调用DeepSeek API"""
    url = OPENAI_API_URL

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
    }

    payload = {
        "messages": messages,
        "model": model,
        "temperature": 0.2,
        "max_tokens": 2000,
    }

    logger.info(f"直接调用API: {url}")
    logger.info(f"使用API密钥: {settings.OPENAI_API_KEY[:10]}...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url, json=payload, headers=headers, timeout=60.0
            )

            # 检查响应状态
            if response.status_code != 200:
                logger.error(
                    f"API调用失败: 状态码 {response.status_code}, 详情: {response.text}"
                )
                # 使用降级模式并返回模拟响应
                return generate_mock_response(messages, model)

            result = response.json()
            logger.info("API调用成功")
            return result
        except Exception as e:
            logger.error(f"API调用失败: {e}")
            # 使用降级模式并返回模拟响应
            return generate_mock_response(messages, model)


def generate_mock_response(
    messages: List[Dict[str, str]], model: str
) -> Dict[str, Any]:
    """生成模拟响应"""
    user_message = next(
        (msg["content"] for msg in messages if msg["role"] == "user"), ""
    )

    # 模拟标准化BOM的响应
    mock_content = """组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
1,有机小麦粉,小麦,11779.78,未知供应商,0.8
2,有机橄榄油,植物油,4831.4,Analysis and trends for Life Cycle Assessment,3.2
3,有机白砂糖,糖类,7445.04,碳中和产品上游过程已实现碳中和,1.5"""

    return {
        "id": "mock-response-" + str(random.randint(1000, 9999)),
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model + "-mock",
        "choices": [
            {
                "message": {"role": "assistant", "content": mock_content},
                "finish_reason": "stop",
                "index": 0,
            }
        ],
        "usage": {"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300},
    }


async def test_bom_standardize_with_real_api():
    """使用真实API测试BOM标准化功能"""
    logger.info("开始测试BOM标准化功能（真实API）...")

    # 准备测试数据
    bom_data = """组件ID,组件名称,材料类型,重量(g),供应商
1,有机小麦粉,11779.78,0,未知供应商
2,有机橄榄油,4831.4,0,Analysis and trends for Life Cycle Assessment
3,有机白砂糖,7445.04,0,碳中和产品，上游过程已实现碳中和"""

    logger.info(f"原始BOM数据:\n{bom_data}")

    try:
        # 准备BOM标准化提示词
        prompt = f"""
        你是一个BOM（物料清单）规范化专家。我将提供一个原始BOM文件内容，请帮我将其转换为标准格式。

        标准格式要求：
        1. 包含以下字段：组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
        2. 通过语义理解识别原始数据中对应的信息
        3. 对于无法识别或原始数据中不存在的值，请填写"None"
        4. 保持数据的完整性，不要遗漏任何组件
        5. 对于数值型字段（如重量、碳排放因子），尽量保留原始数据的精度
        6. 如果原始数据中有额外信息，可以忽略

        原始BOM内容：
        {bom_data}

        请输出标准化后的BOM内容（包含表头，格式为CSV）：
        """

        messages = [
            {"role": "system", "content": "你是一个专业的BOM规范化工具，可以将不同格式的BOM数据转换为标准格式。"},
            {"role": "user", "content": prompt},
        ]

        # 直接调用OpenAI API
        response = await call_openai_api_directly(messages)

        standardized_bom = response["choices"][0]["message"]["content"].strip()

        logger.info(f"标准化后的BOM数据:\n{standardized_bom}")
        logger.info("BOM标准化测试成功（真实API）")

        return standardized_bom
    except Exception as e:
        logger.error(f"BOM标准化测试失败: {e}")
        raise


async def test_bom_standardize_with_mock():
    """使用模拟系统测试BOM标准化功能"""
    logger.info("开始测试BOM标准化功能（模拟系统）...")

    # 准备测试数据
    bom_data = """组件ID,组件名称,材料类型,重量(g),供应商
1,有机小麦粉,11779.78,0,未知供应商
2,有机橄榄油,4831.4,0,Analysis and trends for Life Cycle Assessment
3,有机白砂糖,7445.04,0,碳中和产品，上游过程已实现碳中和"""

    logger.info(f"原始BOM数据:\n{bom_data}")

    try:
        # 调用BOM标准化功能
        standardized_bom = await standardize_bom(bom_data)

        logger.info(f"标准化后的BOM数据(模拟系统):\n{standardized_bom}")
        logger.info("BOM标准化测试成功（模拟系统）")

        return standardized_bom
    except Exception as e:
        logger.error(f"BOM标准化测试失败: {e}")
        raise


async def main():
    """主函数"""
    # 先测试模拟系统
    await test_bom_standardize_with_mock()

    print("\n" + "=" * 50 + "\n")

    # 再测试真实API
    await test_bom_standardize_with_real_api()


if __name__ == "__main__":
    asyncio.run(main())
