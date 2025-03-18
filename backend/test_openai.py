import asyncio
import json
import os
import random

import httpx

# 您当前的API密钥
API_KEY = "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"

# 测试不同的API端点
ENDPOINTS = [
    "https://api.openai.com/v1/chat/completions",
    "https://api.openai-proxy.com/v1/chat/completions",
]


# 模拟响应数据
def get_mock_response():
    responses = [
        "你好！这是一个测试回复。",
        "你好，我是AI助手，很高兴为您服务。",
        "这是一个模拟的API响应，API调用成功！",
        "测试消息已收到，这是一个自动回复。",
        "问候！这是来自模拟API的回应。",
    ]
    return random.choice(responses)


async def test_openai_api(endpoint, api_key, use_mock=False):
    """测试OpenAI API连接"""
    print(f"\n测试 API 端点: {endpoint}")

    # 如果使用模拟数据，直接返回
    if use_mock:
        print("使用模拟数据...")
        mock_content = get_mock_response()
        print(f"模拟响应: {mock_content}")
        return True

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": "你好，这是一个测试消息。请简短回复。"}],
        "max_tokens": 50,
    }

    try:
        print("发送请求...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)

            print(f"状态码: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"成功! 响应: {content}")
                return True
            else:
                print(f"错误: {response.text}")
                return False
    except Exception as e:
        print(f"异常: {str(e)}")
        return False


async def mock_openai_response():
    """创建一个模拟的OpenAI API响应"""
    mock_content = get_mock_response()

    return {
        "id": "mock-response-" + str(random.randint(1000, 9999)),
        "object": "chat.completion",
        "created": 1677858242,
        "model": "gpt-3.5-turbo-mock",
        "choices": [
            {
                "message": {"role": "assistant", "content": mock_content},
                "finish_reason": "stop",
                "index": 0,
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": len(mock_content) // 4,
            "total_tokens": 10 + (len(mock_content) // 4),
        },
    }


async def main():
    """测试多个端点和配置"""
    print("=== OpenAI API 诊断工具 ===")

    # 1. 打印当前环境
    print("\n环境变量检查:")
    env_api_key = os.environ.get("OPENAI_API_KEY", "未设置")
    print(f"环境变量中的API密钥: {env_api_key[:8]}..." if len(env_api_key) > 8 else env_api_key)

    # 2. 测试硬编码的API密钥
    print("\n使用脚本中的API密钥:")
    for endpoint in ENDPOINTS:
        await test_openai_api(endpoint, API_KEY)

    # 3. 如果环境变量中有不同的API密钥，也测试一下
    if env_api_key != "未设置" and env_api_key != API_KEY:
        print("\n使用环境变量中的API密钥:")
        for endpoint in ENDPOINTS:
            await test_openai_api(endpoint, env_api_key)

    # 4. 测试模拟响应
    print("\n测试模拟响应:")
    mock_response = await mock_openai_response()
    print(json.dumps(mock_response, indent=2, ensure_ascii=False))

    # 5. 使用模拟数据测试
    print("\n使用模拟数据测试API调用:")
    await test_openai_api("模拟API端点", API_KEY, use_mock=True)


if __name__ == "__main__":
    asyncio.run(main())
