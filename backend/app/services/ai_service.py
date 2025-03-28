import copy
import logging
import random
import re
import time
from typing import Any, Dict, List, Optional

import httpx
import pandas as pd
from fastapi import HTTPException
import numpy as np

from app.core.config import settings

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API端点配置
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# API配置
# 可选值：'openai'、'deepseek'、'mock'
# 如果设置为mock，则始终使用模拟响应
API_SERVICE = "deepseek"  # 默认使用DeepSeek模式

# 是否始终使用模拟响应
ALWAYS_USE_MOCK = False

# 自动降级到模拟模式（当API调用失败时）
AUTO_FALLBACK = True

# 使用的API模型
OPENAI_MODEL = "gpt-3.5-turbo"  # 修正为可用的OpenAI模型
DEEPSEEK_MODEL = "deepseek-chat"


# 根据当前API服务获取URL和模型
def get_api_config():
    if API_SERVICE == "openai":
        return OPENAI_API_URL, OPENAI_MODEL, settings.OPENAI_API_KEY
    elif API_SERVICE == "deepseek":
        # 优先使用DeepSeek API密钥
        if hasattr(settings, "DEEPSEEK_API_KEY") and settings.DEEPSEEK_API_KEY:
            api_key = settings.DEEPSEEK_API_KEY
            return DEEPSEEK_API_URL, DEEPSEEK_MODEL, api_key
        # DeepSeek API密钥不可用时，记录警告并降级到OpenAI
        elif hasattr(settings, "OPENAI_API_KEY") and settings.OPENAI_API_KEY:
            logger.warning("DeepSeek API密钥不可用，降级使用OpenAI API")
            return OPENAI_API_URL, OPENAI_MODEL, settings.OPENAI_API_KEY
        # 两种API密钥都不可用时，返回空
        else:
            logger.error("DeepSeek和OpenAI API密钥都不可用")
            return "", "", ""
    else:  # 默认或mock
        return "", "", ""


# 模拟响应数据
def get_mock_response(prompt: str = None) -> str:
    """获取模拟响应"""
    # 如果是BOM标准化请求
    if prompt and "BOM" in prompt and "物料清单" in prompt:
        return """组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
1,有机小麦粉,小麦,11779.78,未知供应商,0.8
2,有机橄榄油,植物油,4831.4,Analysis and trends for Life Cycle Assessment of olive oil production,3.2
3,有机白砂糖,糖类,7445.04,碳中和产品，上游过程已实现碳中和,1.5
4,有机麦芽糖浆,糖浆,3793.17,实景数据,2.1
5,有机大豆油,植物油,1243.55,实景数据,3.8
6,有机白芸豆,豆类,3381.54,实景数据,0.7
7,有机红芸豆,豆类,1713.61,实景数据,0.7
8,有机南瓜籽仁,坚果,512.09,实景数据,0.9
9,有机芝麻,种子,395.28,实景数据,1.2
10,有机黑芝麻,种子,341.39,实景数据,1.2"""

    # 如果是碳足迹计算请求
    if prompt and "碳足迹" in prompt and "计算" in prompt:
        return str(random.uniform(10.0, 30.0))

    # 通用响应
    responses = [
        "你好！这是一个测试回覆。",
        "你好，我是AI助手，很高兴为您服务。",
        "这是一个模拟的API响应，API调用成功！",
        "测试消息已收到，这是一个自动回覆。",
        "问候！这是来自模拟API的回应。",
    ]
    return random.choice(responses)


async def call_openai_api(
    messages: List[Dict[str, str]],
    model: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> Dict[str, Any]:
    """
    调用AI API处理请求
    """
    # 根据配置获取API信息
    api_url, default_model, api_key = get_api_config()

    # 如果未指定模型，使用配置的默认模型
    if model is None:
        model = default_model

    # 如果始终使用模拟响应或API服务设置为mock，直接返回模拟数据
    if ALWAYS_USE_MOCK or API_SERVICE == "mock":
        logger.info("使用模拟响应代替真实API调用")
        user_message = next(
            (msg["content"] for msg in messages if msg["role"] == "user"), ""
        )
        mock_content = get_mock_response(user_message)

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
            "usage": {
                "prompt_tokens": sum(
                    len(msg.get("content", "")) // 4 for msg in messages
                ),
                "completion_tokens": len(mock_content) // 4,
                "total_tokens": sum(
                    len(msg.get("content", "")) // 4 for msg in messages
                )
                + len(mock_content) // 4,
            },
        }

    # 以下是真实API调用逻辑
    url = api_url

    # 记录API密钥是否存在
    if not api_key:
        logger.error(f"{API_SERVICE} API密钥未设置")
        if AUTO_FALLBACK:
            logger.info("由于API密钥未设置，自动降级到模拟模式")
            return get_mock_response_as_json(messages, model)
        raise ValueError(f"{API_SERVICE} API密钥未设置")
    else:
        # 只记录密钥的前10个字符，保护隐私
        logger.info(f"使用API密钥: {api_key[:10]}...")

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    payload = {
        "messages": messages,
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    logger.info(f"发送请求到API: {url}")
    logger.info(f"请求模型: {model}")
    logger.info(f"消息数量: {len(messages)}")

    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"开始调用DeepSeek API - 时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            response = await client.post(
                url, json=payload, headers=headers, timeout=120.0
            )  # 增加到120秒
            logger.info(f"DeepSeek API调用完成 - 时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

            # 记录响应状态
            logger.info(f"API响应状态码: {response.status_code}")

            # 如果响应不成功，记录详细错误并自动降级到模拟模式
            if not response.is_success:
                error_detail = response.text
                logger.error(f"API调用失败: {response.status_code}, 详情: {error_detail}")
                logger.info("由于API调用失败，自动降级到模拟模式")

                # 使用模拟响应
                user_message = next(
                    (msg["content"] for msg in messages if msg["role"] == "user"), ""
                )
                mock_content = get_mock_response(user_message)

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
                    "usage": {
                        "prompt_tokens": sum(
                            len(msg.get("content", "")) // 4 for msg in messages
                        ),
                        "completion_tokens": len(mock_content) // 4,
                        "total_tokens": sum(
                            len(msg.get("content", "")) // 4 for msg in messages
                        )
                        + len(mock_content) // 4,
                    },
                }

            # 解析JSON响应
            json_response = response.json()
            logger.info("API调用成功")
            return json_response
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP错误: {e}")
        # 发生HTTP错误时自动降级到模拟模式
        logger.info("由于HTTP错误，自动降级到模拟模式")
        return get_mock_response_as_json(messages, model)
    except httpx.RequestError as e:
        logger.error(f"网络请求错误: {e}")
        # 发生请求错误时自动降级到模拟模式
        logger.info("由于网络请求错误，自动降级到模拟模式")
        return get_mock_response_as_json(messages, model)
    except Exception as e:
        logger.error(f"其他错误: {e}")
        # 发生任何其他错误时自动降级到模拟模式
        logger.info("由于未知错误，自动降级到模拟模式")
        return get_mock_response_as_json(messages, model)


# 辅助函数：生成模拟响应的JSON格式
def get_mock_response_as_json(
    messages: List[Dict[str, str]], model: str
) -> Dict[str, Any]:
    """生成模拟响应的JSON格式"""
    user_message = next(
        (msg["content"] for msg in messages if msg["role"] == "user"), ""
    )
    mock_content = get_mock_response(user_message)

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
        "usage": {
            "prompt_tokens": sum(len(msg.get("content", "")) // 4 for msg in messages),
            "completion_tokens": len(mock_content) // 4,
            "total_tokens": sum(len(msg.get("content", "")) // 4 for msg in messages)
            + len(mock_content) // 4,
        },
    }


async def standardize_bom(original_content: str) -> str:
    """
    使用DeepSeek API标准化BOM内容
    """
    # 检查输入数据大小
    content_size = len(original_content)
    logger.info(f"开始BOM标准化处理 - 输入数据大小: {content_size} 字节")

    # 如果数据过大，可能需要分段处理
    if content_size > 10000:  # 10KB
        logger.warning(f"BOM数据较大 ({content_size} 字节)，处理可能需要较长时间")

    # 更新标准表头，包含重量(g)列和AI估算列
    standard_bom_header = "组件ID,组件名称,材料类型,重量(g),数量,供应商,碳排放因子(kgCO2e/kg),AI估算"

    # 构建增强版的提示词
    prompt = f"""
    你是一个BOM（物料清单）规范化专家。我将提供一个原始BOM文件内容，请帮我将其转换为标准格式。

    标准格式要求：
    1. 包含以下字段：{standard_bom_header}
    2. 通过语义理解识别原始数据中对应的信息
    3. 对于材料类型，仅当原始数据明确包含此信息时才填写，否则保留空值
    4. 原始数据中如果有重量信息，请填入"重量(g)"列
    5. 原始数据中如果没有重量信息但有数量信息，需要执行以下操作：
       a. 根据材料名称和类型，推算出该材料的单位重量(g/单位)
       b. 将单位重量与数量相乘，计算出总重量
       c. 将计算出的总重量填入"重量(g)"列
       d. 在"AI估算"列中注明"单位重量: [估算的单位重量]g/单位, 数量: [数量], 总重量: [单位重量×数量]g, 依据: [估算依据]"
    6. 如果既有重量信息又有数量信息，优先使用重量信息填入"重量(g)"列
    7. 保持数据的完整性，不要遗漏任何组件
    8. 对于数值型字段，维持合理精度（小数点后2位）

    材料重量推算要求：
    1. 基于材料名称和类型（如果有）进行合理的单位重量估算
    2. 使用常见工业标准和材料密度数据作为参考
    3. 对于不确定的情况，提供合理的估计值
    4. 所有重量单位使用克(g)
    5. 提供简短的估算依据，说明推理过程
    6. 必须计算总重量 = 单位重量 × 数量，并将总重量填入"重量(g)"列

    注意：
    - 输出格式必须包含"重量(g)"列和"AI估算"列
    - 对于已有明确重量信息的材料，不需要在"AI估算"列填写内容
    - 对于需要推算重量的材料，必须在"AI估算"列中说明单位重量、数量、总重量和估算依据
    - "重量(g)"列必须填写总重量值，而不是单位重量
    - 对于原始数据中不存在的信息，请在输出中保留为空，不要生成或推测任何值
    - 特别是碳排放因子等计算值，除非原始数据中明确包含，否则不应自行填充

    原始BOM内容：
    {original_content}

    请输出标准化后的BOM内容，必须是CSV格式，包含表头和所有字段。对于原始数据中没有的字段，请保留为空：
    """

    # 增强系统提示
    system_prompt = """
    你是一个专业的BOM规范化和材料科学专家，能够将不同格式的BOM数据转换为标准格式，并能根据材料名称推算其单位重量。

    你的主要任务是：
    1. 识别原始数据中已有的信息并映射到标准格式
    2. 确保输出格式包含"重量(g)"列和"AI估算"列
    3. 如果原始数据中有重量信息，填入"重量(g)"列
    4. 如果原始数据中没有重量信息但有数量信息：
       - 根据材料名称和类型推算单位重量(g/单位)
       - 计算总重量 = 单位重量 × 数量
       - 将总重量填入"重量(g)"列
       - 在"AI估算"列中注明单位重量、数量、总重量和估算依据
    5. 保留原始数据的完整性，不添加不存在的信息
    6. 对于原始数据中不存在的字段，在输出中保留为空
    7. 不要推测或估算碳排放因子等其他数值

    在推算材料重量时，请基于以下原则：
    1. 使用材料科学知识和工业标准
    2. 考虑材料的典型密度和常见规格
    3. 提供合理的单位重量估算
    4. 计算总重量 = 单位重量 × 数量
    5. 简要说明估算依据
    6. 请务必保证重量（g）, 每行都有值, 且推算正确

    所有输出必须是结构化的CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    try:
        start_time = time.time()
        logger.info(f"开始处理BOM标准化和重量推算 - 开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

        # 获取API配置
        api_url, model, api_key = get_api_config()
        logger.info(f"使用API服务: {API_SERVICE}")
        logger.info(f"使用API密钥: {api_key[:10]}...")
        logger.info(f"发送请求到API: {api_url}")
        logger.info(f"请求模型: {model}")
        logger.info(f"消息数量: {len(messages)}")

        # 调用API获取响应
        response = await call_openai_api(messages, temperature=0.2, max_tokens=4000)
        standardized_bom = response["choices"][0]["message"]["content"].strip()

        end_time = time.time()
        logger.info(f"BOM标准化和重量推算成功 - 完成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"处理耗时: {end_time - start_time:.2f} 秒")

        return standardized_bom

    except Exception as e:
        logger.error(f"BOM标准化和重量推算失败: {e}")
        # 返回模拟数据作为回退
        return get_mock_response(prompt)


async def calculate_product_carbon_footprint(product_data: Dict[str, Any]) -> float:
    """
    使用OpenAI API计算产品碳足迹
    """
    # 产品碳足迹计算提示
    prompt = f"""
    你是一个产品碳足迹计算专家。请根据提供的产品信息，计算其碳足迹值（单位：kgCO2e）。

    产品信息：
    - 名称: {product_data.get('name', 'Unknown')}
    - 类型: {product_data.get('product_type', 'Unknown')}
    - 重量: {product_data.get('weight', 'Unknown')}g
    - 材料: {product_data.get('materials', {})}

    请考虑材料生产、制造过程、运输等因素，给出一个合理的碳足迹估算值。
    只需返回一个数字（kgCO2e）。
    """

    messages = [
        {"role": "system", "content": "你是一个碳足迹计算专家，专门计算产品的碳排放。"},
        {"role": "user", "content": prompt},
    ]

    try:
        logger.info("开始计算产品碳足迹")

        # 调用API获取响应
        response = await call_openai_api(messages, temperature=0.2)
        content = response["choices"][0]["message"]["content"].strip()

        # 尝试从响应中提取数值
        import re

        carbon_footprint_match = re.search(r"\d+(?:\.\d+)?", content)
        if carbon_footprint_match:
            return float(carbon_footprint_match.group())
        return 0.0

    except Exception as e:
        logger.error(f"碳足迹计算失败: {e}")
        # 返回随机值作为回退
        return random.uniform(10.0, 30.0)


async def match_carbon_factors(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    为产品节点匹配碳排放因子，使用DeepSeek API
    """
    logger.info(f"开始匹配{len(nodes)}个节点的碳因子，使用DeepSeek API")

    # 创建节点副本以避免修改原始数据
    updated_nodes = copy.deepcopy(nodes)

    # 检查每个节点是否包含必要字段
    for idx, node in enumerate(updated_nodes):
        # 确保节点有id字段
        if "id" not in node:
            node["id"] = f"node_{idx}"

        # 确保节点有productName字段
        if "productName" not in node or not node["productName"]:
            node["productName"] = "Unknown Product"

        # 确保节点有material字段
        if "material" not in node:
            node["material"] = ""

        # 确保节点有lifecycleStage字段
        if "lifecycleStage" not in node or not node["lifecycleStage"]:
            node["lifecycleStage"] = "原材料"

        logger.info(
            f"处理节点: ID={node.get('id')}, 名称={node.get('productName')}, 阶段={node.get('lifecycleStage')}"
        )

    # 按生命週期阶段对节点进行分组处理，以减少API请求次数
    lifecycle_groups = {}
    for idx, node in enumerate(updated_nodes):
        stage = node.get("lifecycleStage", "原材料")
        if stage not in lifecycle_groups:
            lifecycle_groups[stage] = []
        # 添加索引以便之后能找回对应节点
        lifecycle_groups[stage].append((idx, node))

    # 为每个生命週期阶段批量处理节点
    for stage, node_group in lifecycle_groups.items():
        if not node_group:
            continue

        # 准备向DeepSeek发送的产品列表和相关信息
        products_info = []
        for idx, node in node_group:
            product_info = {
                "id": node.get("id"),
                "name": node.get("productName", ""),
                "material": node.get("material", ""),
                "weight": node.get("weight", 0),
                "stage": node.get("lifecycleStage", "原材料"),
            }
            products_info.append(product_info)

        # 构建提示信息
        system_message = {
            "role": "system",
            "content": "你是一位材料科学和碳足迹专家，熟悉各种材料、产品和生产工艺的碳排放因子。请帮助用户确定产品在不同生命週期阶段的碳排放因子。",
        }

        user_message_content = f"""
        请为以下{stage}阶段的产品提供准确的碳排放因子(carbon factor)数据。

        对每个产品，请提供：
        1. 碳排放因子(单位: kg CO2e/kg)
        2. 碳排放因子的数据来源或依据

        产品列表:
        """

        # 添加产品信息到提示中
        for i, (_, product) in enumerate(node_group):
            user_message_content += f"""
            产品 {i+1}:
            - 名称: {product.get('productName', '')}
            - 材料: {product.get('material', '')}
            - 阶段: {product.get('lifecycleStage', '原材料')}
            """

        user_message_content += """
        请以JSON格式回答，格式如下：
        ```json
        [
          {
            "id": "产品ID",
            "carbonFactor": 数值,
            "carbonFactorUnit": "kg CO2e/kg",
            "dataSource": "数据来源描述"
          },
          ...
        ]
        ```

        请确保每个产品都有确切的碳排放因子数值，以及可信的数据来源。如果无法确定精确值，请提供合理的估计值并注明。
        只返回JSON格式的结果，不要添加其他解释。
        """

        user_message = {"role": "user", "content": user_message_content}

        # 调用DeepSeek API
        try:
            logger.info(f"向DeepSeek API发送{len(node_group)}个{stage}阶段的产品信息")
            response = await call_openai_api(
                messages=[system_message, user_message],
                temperature=0.2,  # 降低温度以获得更确定的回答
                max_tokens=4000,  # 增加最大token数以处理多个产品
            )

            # 解析API返回的结果
            if response and "choices" in response and len(response["choices"]) > 0:
                content = response["choices"][0]["message"]["content"]

                # 从回应中提取JSON部分
                import json
                import re

                # 尝试找到JSON部分
                json_match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
                json_str = json_match.group(1) if json_match else content

                # 尝试解析JSON
                try:
                    results = json.loads(json_str)
                    logger.info(f"成功解析DeepSeek API返回的JSON数据，包含{len(results)}个产品")

                    # 更新节点数据
                    for result in results:
                        # 查找对应节点
                        node_id = result.get("id")
                        original_indices = [
                            idx
                            for idx, node in node_group
                            if str(node.get("id")) == str(node_id)
                        ]

                        if original_indices:
                            original_index = original_indices[0]

                            # 更新产品碳排放因子
                            updated_nodes[original_index]["carbonFactor"] = float(
                                result.get("carbonFactor", 0)
                            )
                            updated_nodes[original_index][
                                "carbonFactorUnit"
                            ] = result.get("carbonFactorUnit", "kg CO2e/kg")
                            updated_nodes[original_index][
                                "dataSource"
                            ] = f"AI生成 - DeepSeek ({result.get('dataSource', '专家估算')})"

                            logger.info(
                                f"节点 {node_id} 已更新碳因子为 {updated_nodes[original_index]['carbonFactor']} 来源: {updated_nodes[original_index]['dataSource']}"
                            )
                        else:
                            # 尝试使用索引匹配
                            for i, (idx, node) in enumerate(node_group):
                                if i < len(results):
                                    updated_nodes[idx]["carbonFactor"] = float(
                                        results[i].get("carbonFactor", 0)
                                    )
                                    updated_nodes[idx]["carbonFactorUnit"] = results[
                                        i
                                    ].get("carbonFactorUnit", "kg CO2e/kg")
                                    updated_nodes[idx][
                                        "dataSource"
                                    ] = f"AI生成 - DeepSeek ({results[i].get('dataSource', '专家估算')})"

                                    logger.info(
                                        f"节点 {node.get('id')} 已通过索引匹配更新碳因子为 {updated_nodes[idx]['carbonFactor']}"
                                    )

                except json.JSONDecodeError as e:
                    logger.error(f"解析DeepSeek API返回的JSON时出错: {str(e)}")
                    # 如果JSON解析失败，尝试从文本中提取信息
                    pattern = r"产品\s*\d+\s*[：:]\s*(\d+\.\d+)"
                    matches = re.findall(pattern, content)

                    if matches and len(matches) <= len(node_group):
                        for i, (idx, _) in enumerate(node_group):
                            if i < len(matches):
                                try:
                                    carbon_factor = float(matches[i])
                                    updated_nodes[idx]["carbonFactor"] = carbon_factor
                                    updated_nodes[idx][
                                        "carbonFactorUnit"
                                    ] = "kg CO2e/kg"
                                    updated_nodes[idx][
                                        "dataSource"
                                    ] = "AI生成 - DeepSeek (文本提取)"
                                    logger.info(
                                        f"从文本中提取节点 {updated_nodes[idx].get('id')} 的碳因子: {carbon_factor}"
                                    )
                                except ValueError:
                                    logger.error(f"将提取的值转换为浮点数时出错: {matches[i]}")
                                    updated_nodes[idx]["carbonFactor"] = 0
                                    updated_nodes[idx][
                                        "carbonFactorUnit"
                                    ] = "kg CO2e/kg"
                                    updated_nodes[idx][
                                        "dataSource"
                                    ] = "需要人工介入 - API返回解析失败"
                    else:
                        # 如果文本提取也失败，标记所有节点需要人工介入
                        for idx, _ in node_group:
                            updated_nodes[idx]["carbonFactor"] = 0
                            updated_nodes[idx]["carbonFactorUnit"] = "kg CO2e/kg"
                            updated_nodes[idx]["dataSource"] = "需要人工介入 - API返回解析失败"
            else:
                logger.error(f"DeepSeek API返回的响应格式不正确: {response}")
                # 标记所有节点需要人工介入
                for idx, _ in node_group:
                    updated_nodes[idx]["carbonFactor"] = 0
                    updated_nodes[idx]["carbonFactorUnit"] = "kg CO2e/kg"
                    updated_nodes[idx]["dataSource"] = "需要人工介入 - API响应格式错误"

        except Exception as e:
            logger.error(f"调用DeepSeek API时出错: {str(e)}")
            # 标记所有节点需要人工介入
            for idx, _ in node_group:
                updated_nodes[idx]["carbonFactor"] = 0
                updated_nodes[idx]["carbonFactorUnit"] = "kg CO2e/kg"
                updated_nodes[idx]["dataSource"] = f"需要人工介入 - API调用失败: {str(e)[:50]}"

    return updated_nodes


async def standardize_lifecycle_document(content: str, stage: str) -> str:
    """
    标准化与生命週期阶段相关的文件

    参数:
    - content: 文件内容
    - stage: 生命週期阶段 ('manufacturing', 'distribution', 'usage', 'disposal')

    返回:
    - 标准化后的文件内容
    """
    # 检查输入数据
    content_size = len(content)
    logger.info(f"开始{stage}阶段文件标准化处理 - 输入数据大小: {content_size} 字节")

    # 根据生命週期阶段选择对应的标准化提示词和表头
    if stage == "manufacturing":
        # 生产制造阶段
        standard_header = (
            "工序ID,工序名称,能源类型,能源消耗(kWh),工艺效率(%),废物产生量(kg),水资源消耗(L),回收材料使用比例(%),设备利用率(%)"
        )
        system_prompt = """
        你是一个专业的生产制造数据标准化专家。你的任务是将各种格式的生产数据转换为标准格式。

        你需要从原始数据中识别以下信息:
        1. 工序ID - 每个制造工序的唯一标识符
        2. 工序名称 - 制造工序的名称
        3. 能源类型 - 使用的能源类型(电力、天然气、煤等)
        4. 能源消耗(kWh) - 每个工序的能源消耗量
        5. 工艺效率(%) - 工艺效率百分比
        6. 废物产生量(kg) - 产生的废物重量
        7. 水资源消耗(L) - 使用的水资源量
        8. 回收材料使用比例(%) - 使用回收材料的百分比
        9. 设备利用率(%) - 设备的使用效率

        请严格按照标准表头格式输出，对于原始数据中不存在的字段，请在输出中保留为空，不要生成或推测任何值。
        输出必须是CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
        """

    elif stage == "distribution":
        # 分销存储阶段
        standard_header = "物流ID,运输物品, 运输方式, 重量(kg), 起点,终点,运输距离(km),车辆类型,燃料类型,燃油效率(km/L),装载因子(%),是否冷藏,包装材料,包装重量(kg),仓库能源消耗(kWh),存储时间(天)"
        system_prompt = """
        你是一个专业的物流与分销数据标准化专家。你的任务是将各种格式的物流数据转换为标准格式。

        你需要从原始数据中识别以下信息:
        1. 物流ID - 每个物流环节的唯一标识符
        2. 运输物品 - 运输的物品
        3. 运输方式 - 运输模式(公路、铁路、海运、空运)
        4. 重量(kg) - 运输物品的重量
        4. 起点 - 运输起始位置
        5. 终点 - 运输目的地
        6. 运输距离(km) - 运输距离
        7. 车辆类型 - 使用的车辆类型
        8. 燃料类型 - 使用的燃料类型
        9. 燃油效率(km/L) - 车辆的燃油效率
        10. 装载因子(%) - 车辆的装载比例
        11. 是否冷藏 - 是/否
        12. 包装材料 - 使用的包装材料
        13. 包装重量(kg) - 包装材料的重量
        14. 仓库能源消耗(kWh) - 仓储过程中的能源消耗
        15. 存储时间(天) - 产品的存储时间

        特别注意：
        - 如果原始数据只提供起点和终点，但没有运输距离，请保留为空，不要推算距离
        - 如果原始数据只提供运输距离，但没有起点和终点，请保留为空，不要推测位置

        请严格按照标准表头格式输出，对于原始数据中不存在的字段，请在输出中保留为空，不要生成或推测任何值。
        输出必须是CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
        """

    elif stage == "usage":
        # 产品使用阶段
        standard_header = "使用ID,产品寿命(年),每次使用能源消耗(kWh),每次使用水资源消耗(L),消耗品,消耗品重量(kg),使用频率(次/年),维护频率(次/年),维修率(%),用户行为影响(1-10),效率降级率(%/年)"
        system_prompt = """
        你是一个专业的产品使用阶段数据标准化专家。你的任务是将各种格式的产品使用数据转换为标准格式。

        你需要从原始数据中识别以下信息:
        1. 使用ID - 每个使用场景的唯一标识符
        2. 产品寿命(年) - 产品的使用寿命
        3. 每次使用能源消耗(kWh) - 每次使用产品消耗的能源
        4. 每次使用水资源消耗(L) - 每次使用产品消耗的水资源
        5. 消耗品 - 使用过程中需要的消耗品
        6. 消耗品重量(kg) - 消耗品的重量
        7. 使用频率(次/年) - 产品的使用频率
        8. 维护频率(次/年) - 产品需要维护的频率
        9. 维修率(%) - 产品需要维修的可能性
        10. 用户行为影响(1-10) - 用户行为对产品影响的程度
        11. 效率降级率(%/年) - 产品效率每年下降的比率

        请严格按照标准表头格式输出，对于原始数据中不存在的字段，请在输出中保留为空，不要生成或推测任何值。
        输出必须是CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
        """

    elif stage == "disposal":
        # 废弃处置阶段
        standard_header = "处置ID,回收率(%),填埋比例(%),焚烧比例(%),堆肥比例(%),重复使用比例(%),有害废物含量(%),生物降解性(%),处置能源回收(kWh/kg),到处置设施的运输距离(km),处置方法"
        system_prompt = """
        你是一个专业的废弃处置数据标准化专家。你的任务是将各种格式的废弃处置数据转换为标准格式。

        你需要从原始数据中识别以下信息:
        1. 处置ID - 每个处置环节的唯一标识符
        2. 回收率(%) - 产品被回收的比例
        3. 填埋比例(%) - 产品被填埋的比例
        4. 焚烧比例(%) - 产品被焚烧的比例
        5. 堆肥比例(%) - 产品被堆肥的比例
        6. 重复使用比例(%) - 产品被重复使用的比例
        7. 有害废物含量(%) - 有害废物的含量
        8. 生物降解性(%) - 产品的生物降解性
        9. 处置能源回收(kWh/kg) - 处置过程中回收的能源
        10. 到处置设施的运输距离(km) - 运输到处置设施的距离
        11. 处置方法 - 使用的处置方法

        请严格按照标准表头格式输出，对于原始数据中不存在的字段，请在输出中保留为空，不要生成或推测任何值。
        输出必须是CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
        """
    else:
        # 默认情况 - 通用标准化
        standard_header = "ID,名称,类型,数值,单位,备注"
        system_prompt = """
        你是一个专业的数据标准化专家。你的任务是将各种格式的数据转换为标准格式。

        你需要从原始数据中识别以下信息:
        1. ID - 每个项目的唯一标识符
        2. 名称 - 项目名称
        3. 类型 - 项目类型
        4. 数值 - 相关数值
        5. 单位 - 数值的单位
        6. 备注 - 其他相关信息

        请严格按照标准表头格式输出，对于原始数据中不存在的字段，请在输出中保留为空，不要生成或推测任何值。
        输出必须是CSV格式，只返回处理后的数据，不要添加任何解释或额外文本。
        """

    # 构建用户提示词
    user_prompt = f"""
    我将提供一个与{get_stage_name(stage)}阶段相关的原始数据文件内容，请帮我将其转换为标准格式。

    标准格式要求：
    1. 包含以下字段：{standard_header}
    2. 通过语义理解识别原始数据中对应的信息
    3. 严格保留原始数据中的所有值，不要自行估算或填充缺失数据
    4. 保持数据的完整性，不要遗漏任何项目
    5. 对于数值型字段，维持原始精度

    注意：
    - 对于原始数据中不存在的信息，请在输出中保留为空，不要生成或推测任何值
    - 只返回处理后的数据，不要添加任何解释或额外文本

    原始文件内容：
    {content}

    请输出标准化后的内容，必须是CSV格式，包含表头和所有字段：
    """

    # 构建API请求
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        start_time = time.time()
        logger.info(f"开始处理{stage}阶段文件标准化 - 开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

        # 获取API配置
        api_url, model, api_key = get_api_config()
        logger.info(f"使用API服务: {API_SERVICE}")
        logger.info(f"使用API模型: {model}")

        # 调用API获取响应
        response = await call_openai_api(messages, temperature=0.2)
        standardized_content = response["choices"][0]["message"]["content"].strip()

        end_time = time.time()
        logger.info(f"{stage}阶段文件标准化成功 - 完成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"处理耗时: {end_time - start_time:.2f} 秒")

        return standardized_content

    except Exception as e:
        logger.error(f"{stage}阶段文件标准化失败: {e}")
        # 返回模拟数据作为回退
        return f"{standard_header}\n[标准化处理失败 - 请稍后重试]"


def get_stage_name(stage: str) -> str:
    """
    获取生命週期阶段的中文名称
    """
    stage_names = {
        "manufacturing": "生产制造",
        "distribution": "分销存储",
        "usage": "产品使用",
        "disposal": "废弃处置",
    }
    return stage_names.get(stage, "未知阶段")


async def decompose_product_materials(product_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将产品拆解为可计算碳足迹的子材料

    参数:
    - product_data: 产品数据，包含名称、重量等信息

    返回:
    - 拆解后的子材料列表，每个子材料包含名称、重量、碳因子等
    """
    product_name = product_data.get("productName", "")
    if not product_name:
        product_name = product_data.get("label", "未知产品")

    product_weight = product_data.get("weight", 0)
    if not product_weight or product_weight <= 0:
        raise ValueError("产品重量必须大于0")

    logger.info(f"开始拆解产品: {product_name}, 重量: {product_weight}g")

    # 构建提示词
    system_prompt = """
    你是一个专业的产品材料拆解与碳足迹计算专家。你的任务是将一个复杂产品拆解成基础材料组件，以便计算其碳足迹。

    请基于以下原则进行拆解:
    1. 识别产品的主要组成材料
    2. 为每种材料估算在总重量中的比例
    3. 为每种材料提供合理的碳排放因子(kgCO2e/kg)
    4. 确保所有比例加起来等于100%
    5. 优先使用有确切碳因子数据的常见材料
    6. 对于复杂材料，进一步拆解为基础材料

    你的拆解结果将被用于计算产品的总碳足迹，请确保数据合理且专业。
    """

    user_prompt = f"""
    请分析并拆解以下产品成基础材料组件:

    产品名称: {product_name}
    产品总重量: {product_weight}g

    请提供拆解后的各材料组件，包括:
    1. 每种组件材料名称
    2. 每种组件所占比例(%)
    3. 每种组件的重量(g)
    4. 每种组件的碳排放因子(kgCO2e/kg)
    5. 每种组件的碳足迹贡献(kg CO2e)
    6. 数据来源或参考依据

    请确保比例总和为100%，且所有重量加起来等于产品总重量。
    请使用表格格式回答，并在表格下方简要说明你的拆解逻辑和依据。
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        # 调用AI获取拆解结果
        response = await call_openai_api(messages, temperature=0.2)
        ai_response = response["choices"][0]["message"]["content"].strip()

        # 解析AI回应，提取拆解后的子材料
        materials = parse_decomposed_materials(ai_response, product_weight)

        # 计算总碳足迹
        total_carbon_footprint = sum(m["carbon_footprint"] for m in materials)

        # 返回拆解结果
        result = {
            "product_name": product_name,
            "product_weight": product_weight,
            "materials": materials,
            "total_carbon_footprint": total_carbon_footprint,
            "raw_response": ai_response,
        }

        return result

    except Exception as e:
        logger.error(f"产品拆解失败: {str(e)}")
        raise ValueError(f"产品拆解失败: {str(e)}")


def parse_decomposed_materials(
    ai_response: str, total_weight: float
) -> List[Dict[str, Any]]:
    """
    解析AI回应，提取拆解后的子材料信息

    参数:
    - ai_response: AI回应文本
    - total_weight: 产品总重量

    返回:
    - 拆解后的子材料列表
    """
    materials = []

    try:
        # 从回应中提取表格数据
        # 这里使用一个简单的方法来解析表格，实际应用中可能需要更强大的解析能力
        lines = ai_response.split("\n")
        data_lines = []
        in_table = False

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 检测表格开始
            if "|" in line and ("-" in line or "材料名称" in line or "组件" in line):
                in_table = True
                continue

            # 提取表格数据行
            if in_table and "|" in line:
                # 忽略纯分隔线
                if not all(c in "-|" for c in line):
                    data_lines.append(line)

        # 处理提取的数据行
        for line in data_lines:
            # 分割表格行并去除空白
            cells = [cell.strip() for cell in line.split("|")]
            cells = [c for c in cells if c]  # 去除空单元格

            if len(cells) < 4:
                continue  # 跳过格式不符的行

            try:
                # 提取材料信息
                material_name = cells[0]

                # 提取百分比(如果有)
                percentage = 0
                for cell in cells:
                    percentage_match = re.search(r"(\d+(?:\.\d+)?)%", cell)
                    if percentage_match:
                        percentage = float(percentage_match.group(1))
                        break

                # 提取重量
                weight = 0
                for cell in cells:
                    weight_match = re.search(r"(\d+(?:\.\d+)?)\s*g", cell)
                    if weight_match:
                        weight = float(weight_match.group(1))
                        break

                # 如果没有明确重量但有百分比，计算重量
                if weight == 0 and percentage > 0:
                    weight = total_weight * (percentage / 100)

                # 提取碳因子
                carbon_factor = 0
                for cell in cells:
                    # 寻找类似 "2.5 kgCO2e/kg" 的模式
                    carbon_factor_match = re.search(
                        r"(\d+(?:\.\d+)?)\s*(?:kgCO2e/kg|kg\s*CO2e/kg)", cell
                    )
                    if carbon_factor_match:
                        carbon_factor = float(carbon_factor_match.group(1))
                        break

                # 计算碳足迹贡献
                carbon_footprint = (weight / 1000) * carbon_factor  # 转换克为千克

                # 获取数据来源
                data_source = ""
                if len(cells) >= 6:
                    data_source = cells[5]
                elif len(cells) >= 5:
                    data_source = cells[4]

                # 添加材料到列表
                materials.append(
                    {
                        "material_name": material_name,
                        "percentage": percentage,
                        "weight": weight,
                        "carbon_factor": carbon_factor,  # kgCO2e/kg
                        "carbon_footprint": carbon_footprint,  # kg CO2e
                        "data_source": data_source,
                    }
                )

            except Exception as e:
                logger.warning(f"解析材料行失败: {line}, 错误: {str(e)}")
                continue

        # 如果没有成功解析任何材料，使用备用解析方法
        if not materials:
            # 尝试直接从文本中提取信息
            material_matches = re.finditer(
                r"([a-zA-Z\u4e00-\u9fa5]+[\w\s\/\u4e00-\u9fa5-]*)\s*[,:]?\s*(\d+(?:\.\d+)?)%\s*[,:]?\s*(\d+(?:\.\d+)?)\s*g\s*[,:]?\s*(\d+(?:\.\d+)?)\s*kgCO2e/kg",
                ai_response,
            )

            for match in material_matches:
                material_name = match.group(1).strip()
                percentage = float(match.group(2))
                weight = float(match.group(3))
                carbon_factor = float(match.group(4))
                carbon_footprint = (weight / 1000) * carbon_factor

                materials.append(
                    {
                        "material_name": material_name,
                        "percentage": percentage,
                        "weight": weight,
                        "carbon_factor": carbon_factor,
                        "carbon_footprint": carbon_footprint,
                        "data_source": "AI分析",
                    }
                )

        # 确保总重量正确
        if materials:
            current_total = sum(m["weight"] for m in materials)
            if abs(current_total - total_weight) > 1:  # 允许1克的误差
                # 比例调整
                ratio = total_weight / current_total
                for material in materials:
                    material["weight"] *= ratio
                    material["carbon_footprint"] = (
                        material["weight"] / 1000
                    ) * material["carbon_factor"]

        return materials

    except Exception as e:
        logger.error(f"解析拆解材料失败: {str(e)}")
        # 返回一个基本估计
        return [
            {
                "material_name": "估算材料",
                "percentage": 100,
                "weight": total_weight,
                "carbon_factor": 2.5,  # 通用估算值
                "carbon_footprint": (total_weight / 1000) * 2.5,
                "data_source": "无法解析原始回应，使用估算值",
            }
        ]
