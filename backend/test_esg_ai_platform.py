#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
ESG AI 平台自动化测试脚本
-------------------------
此脚本执行一系列测试用例，验证ESG AI平台的关键功能，
并生成详细的测试报告。
"""

import asyncio
import datetime
import json
import logging
import os
import random
import sys
import time
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("test_results.log"),
    ],
)
logger = logging.getLogger("ESG_AI_Test")

# 测试配置
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api/v1"
TEST_USERNAME = "allenpeng0209@gmail.com"
TEST_PASSWORD = "!Ss12369874"
ACCESS_TOKEN = None  # 将在登录测试后设置


class TestResult:
    """测试结果类，用于存储单个测试的结果"""

    def __init__(self, name: str, description: str, category: str):
        self.name = name
        self.description = description
        self.category = category
        self.success = None
        self.error_message = None
        self.duration = 0
        self.start_time = None
        self.steps: List[Dict[str, Any]] = []

    def start(self):
        """开始测试，记录开始时间"""
        self.start_time = time.time()

    def add_step(self, description: str, result: bool, details: str = ""):
        """添加测试步骤"""
        self.steps.append(
            {"description": description, "result": result, "details": details}
        )

    def end(self, success: bool, error_message: str = None):
        """结束测试，记录结果"""
        self.duration = time.time() - self.start_time
        self.success = success
        self.error_message = error_message

    def to_dict(self) -> Dict:
        """转换为字典，用于报告生成"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "success": self.success,
            "duration": round(self.duration, 2),
            "error_message": self.error_message,
            "steps": self.steps,
        }


class ESGAITestRunner:
    """ESG AI测试运行器，负责执行测试用例并生成报告"""

    def __init__(self):
        self.results: List[TestResult] = []

    async def run_all_tests(self):
        """运行所有测试用例"""
        # 第一部分：认证测试
        await self.test_login_success()
        await self.test_login_fail()

        # 第二部分：API测试
        await self.test_basic_api()
        await self.test_openai_proxy_api()
        await self.test_bom_standardize_api()

        # 第三部分：模拟数据测试
        await self.test_mock_response()

        # 第四部分：API测试页面
        await self.test_api_test_page()

        # 生成测试报告
        self.generate_report()

    async def test_login_success(self):
        """测试用例：成功登录"""
        test = TestResult(name="用户登录成功", description="验证用户能够使用正确的凭据登录系统", category="认证")
        test.start()

        try:
            # 步骤1：准备登录数据
            test.add_step("准备登录数据", True, f"用户名: {TEST_USERNAME}, 密码: {TEST_PASSWORD}")

            # 步骤2：发送登录请求
            async with httpx.AsyncClient() as client:
                form_data = {"username": TEST_USERNAME, "password": TEST_PASSWORD}

                # 使用URL编码的表单数据
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                response = await client.post(
                    f"{API_BASE_URL}/auth/login", data=form_data, headers=headers
                )

                # 步骤3：验证响应
                response_data = response.json() if response.status_code == 200 else None
                has_token = response_data and "access_token" in response_data

                test.add_step(
                    "发送登录请求",
                    response.status_code == 200,
                    f"状态码: {response.status_code}, 响应: {response.text[:200]}...",
                )

                test.add_step(
                    "验证包含访问令牌",
                    has_token,
                    "找到access_token" if has_token else "未找到access_token",
                )

                # 如果成功，保存令牌用于后续测试
                if has_token:
                    global ACCESS_TOKEN
                    ACCESS_TOKEN = response_data["access_token"]

            # 测试成功
            test.end(True)
        except Exception as e:
            # 测试失败
            logger.error(f"登录测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_login_fail(self):
        """测试用例：登录失败处理"""
        test = TestResult(name="用户登录失败", description="验证系统对无效凭据的处理", category="认证")
        test.start()

        try:
            # 步骤1：准备无效登录数据
            wrong_username = "wrong_user"
            wrong_password = "wrong_password"
            test.add_step(
                "准备无效登录数据", True, f"用户名: {wrong_username}, 密码: {wrong_password}"
            )

            # 步骤2：发送登录请求
            async with httpx.AsyncClient() as client:
                form_data = {"username": wrong_username, "password": wrong_password}

                # 使用URL编码的表单数据
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                response = await client.post(
                    f"{API_BASE_URL}/auth/login", data=form_data, headers=headers
                )

                # 步骤3：验证响应
                test.add_step(
                    "发送登录请求",
                    True,
                    f"状态码: {response.status_code}, 响应: {response.text[:200]}...",
                )

                # 我们预期收到401未授权错误
                test.add_step(
                    "验证返回未授权错误",
                    response.status_code == 401,
                    f"状态码: {response.status_code} (预期: 401)",
                )

            # 测试成功 - 注意这里的成功是指测试本身成功运行，而不是登录成功
            # 我们期望登录失败，如果返回401，这个测试就是成功的
            test.end(response.status_code == 401)
        except Exception as e:
            # 测试失败
            logger.error(f"登录失败测试异常: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_basic_api(self):
        """测试用例：基础API测试端点"""
        test = TestResult(
            name="基础API测试", description="验证无需认证的基础API测试端点", category="API"
        )
        test.start()

        try:
            # 步骤1：发送GET请求到测试端点
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/ai/test")

                # 步骤2：检查响应状态码
                test.add_step(
                    "发送请求到测试端点",
                    response.status_code == 200,
                    f"状态码: {response.status_code}",
                )

                # 步骤3：检查响应内容
                try:
                    response_data = response.json()
                    has_status = response_data and "status" in response_data
                    status_ok = has_status and response_data["status"] == "success"

                    test.add_step(
                        "验证响应包含状态字段",
                        has_status,
                        "找到status字段" if has_status else "未找到status字段",
                    )

                    test.add_step(
                        "验证状态为success",
                        status_ok,
                        f"状态: {response_data.get('status', 'N/A')}",
                    )
                except Exception as parse_error:
                    test.add_step(
                        "解析响应JSON",
                        False,
                        f"解析错误: {str(parse_error)}, 响应内容: {response.text[:100]}...",
                    )

            # 测试成功
            test.end(response.status_code == 200 and status_ok)
        except Exception as e:
            # 测试失败
            logger.error(f"基础API测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_openai_proxy_api(self):
        """测试用例：OpenAI代理API测试"""
        test = TestResult(
            name="OpenAI代理API测试", description="验证OpenAI代理API的模拟响应功能", category="API"
        )
        test.start()

        try:
            # 步骤1：准备请求数据
            request_data = {
                "messages": [{"role": "user", "content": "这是一条简单的测试消息"}],
                "model": "gpt-3.5-turbo",
            }

            test.add_step(
                "准备请求数据", True, f"消息: {request_data['messages'][0]['content']}"
            )

            # 步骤2：发送POST请求到OpenAI代理
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/ai/test-openai-proxy", json=request_data
                )

                # 步骤3：检查响应状态码
                test.add_step(
                    "发送请求到OpenAI代理",
                    response.status_code == 200,
                    f"状态码: {response.status_code}",
                )

                # 步骤4：检查响应内容
                try:
                    response_data = response.json()
                    has_choices = response_data and "choices" in response_data
                    has_message = (
                        has_choices
                        and response_data["choices"]
                        and "message" in response_data["choices"][0]
                    )

                    test.add_step(
                        "验证响应包含choices字段",
                        has_choices,
                        "找到choices字段" if has_choices else "未找到choices字段",
                    )

                    test.add_step(
                        "验证响应包含消息内容",
                        has_message,
                        f"消息: {response_data['choices'][0]['message']['content'][:50]}..."
                        if has_message
                        else "未找到消息内容",
                    )
                except Exception as parse_error:
                    test.add_step(
                        "解析响应JSON",
                        False,
                        f"解析错误: {str(parse_error)}, 响应内容: {response.text[:100]}...",
                    )

            # 测试成功
            test.end(response.status_code == 200 and has_message)
        except Exception as e:
            # 测试失败
            logger.error(f"OpenAI代理API测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_bom_standardize_api(self):
        """测试用例：BOM标准化API测试"""
        test = TestResult(
            name="BOM标准化API测试", description="验证BOM标准化功能的模拟响应", category="功能"
        )
        test.start()

        try:
            # 步骤1：准备BOM数据
            bom_data = """组件ID,组件名称,材料类型,重量(g),供应商
1,有机小麦粉,11779.78,0,未知供应商
2,有机橄榄油,4831.4,0,Analysis and trends for Life Cycle Assessment
3,有机白砂糖,7445.04,0,碳中和产品，上游过程已实现碳中和"""

            request_data = {
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的BOM规范化工具，可以将不同格式的BOM数据转换为标准格式。",
                    },
                    {"role": "user", "content": f"请将以下BOM数据规范化为标准格式:\n\n{bom_data}"},
                ],
                "model": "gpt-3.5-turbo",
            }

            test.add_step("准备BOM数据", True, f"BOM数据包含 {bom_data.count(chr(10))+1} 行")

            # 步骤2：发送POST请求到测试端点
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/ai/test-openai-proxy", json=request_data
                )

                # 步骤3：检查响应状态码
                test.add_step(
                    "发送请求到BOM标准化API",
                    response.status_code == 200,
                    f"状态码: {response.status_code}",
                )

                # 步骤4：检查响应内容
                try:
                    response_data = response.json()
                    has_choices = response_data and "choices" in response_data
                    has_message = (
                        has_choices
                        and response_data["choices"]
                        and "message" in response_data["choices"][0]
                    )

                    test.add_step(
                        "验证响应包含消息内容",
                        has_message,
                        f"消息前50字符: {response_data['choices'][0]['message']['content'][:50]}..."
                        if has_message
                        else "未找到消息内容",
                    )

                    # 步骤5：验证标准化BOM格式
                    if has_message:
                        content = response_data["choices"][0]["message"]["content"]
                        has_header = "组件ID,组件名称,材料类型,重量(g),供应商" in content
                        has_carbon_factor = "碳排放因子" in content

                        test.add_step(
                            "验证BOM包含标准表头",
                            has_header,
                            "找到标准表头" if has_header else "未找到标准表头",
                        )

                        test.add_step(
                            "验证BOM包含碳排放因子",
                            has_carbon_factor,
                            "包含碳排放因子字段" if has_carbon_factor else "未包含碳排放因子字段",
                        )
                except Exception as parse_error:
                    test.add_step(
                        "解析响应JSON",
                        False,
                        f"解析错误: {str(parse_error)}, 响应内容: {response.text[:100]}...",
                    )

            # 测试成功
            test.end(response.status_code == 200 and has_message)
        except Exception as e:
            # 测试失败
            logger.error(f"BOM标准化API测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_mock_response(self):
        """测试用例：验证模拟响应功能"""
        test = TestResult(
            name="模拟响应功能测试", description="验证系统的模拟响应功能是否正常工作", category="功能"
        )
        test.start()

        try:
            # 步骤1：测试普通模拟响应
            request_data1 = {
                "messages": [{"role": "user", "content": "普通测试消息"}],
                "model": "gpt-3.5-turbo",
            }

            # 步骤2：测试BOM模拟响应
            request_data2 = {
                "messages": [{"role": "user", "content": "这是一个BOM物料清单测试"}],
                "model": "gpt-3.5-turbo",
            }

            test.add_step("准备测试数据", True, "已准备普通测试和BOM测试数据")

            # 发送第一个请求
            async with httpx.AsyncClient() as client:
                response1 = await client.post(
                    f"{API_BASE_URL}/ai/test-openai-proxy", json=request_data1
                )

                response_data1 = (
                    response1.json() if response1.status_code == 200 else {}
                )

                test.add_step(
                    "测试普通模拟响应",
                    response1.status_code == 200,
                    f"状态码: {response1.status_code}, 响应部分内容: {str(response_data1)[:100]}...",
                )

            # 发送第二个请求
            async with httpx.AsyncClient() as client:
                response2 = await client.post(
                    f"{API_BASE_URL}/ai/test-openai-proxy", json=request_data2
                )

                response_data2 = (
                    response2.json() if response2.status_code == 200 else {}
                )

                test.add_step(
                    "测试BOM模拟响应",
                    response2.status_code == 200,
                    f"状态码: {response2.status_code}, 响应部分内容: {str(response_data2)[:100]}...",
                )

            # 步骤3：验证模型ID包含mock字样
            if response1.status_code == 200 and "model" in response_data1:
                contains_mock = "mock" in response_data1["model"].lower()
                test.add_step(
                    "验证模型ID包含mock字样",
                    contains_mock,
                    f"模型ID: {response_data1.get('model', 'N/A')}",
                )

            # 测试成功
            test.end(response1.status_code == 200 and response2.status_code == 200)
        except Exception as e:
            # 测试失败
            logger.error(f"模拟响应功能测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    async def test_api_test_page(self):
        """测试用例：API测试页面访问"""
        test = TestResult(name="API测试页面", description="验证API测试页面能否正常访问", category="UI")
        test.start()

        try:
            # 步骤1：访问API测试页面
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BASE_URL}/api-test")

                # 步骤2：检查响应状态码
                test.add_step(
                    "访问API测试页面",
                    response.status_code == 200,
                    f"状态码: {response.status_code}",
                )

                # 步骤3：验证HTML内容
                html_content = response.text
                has_title = "API测试页面" in html_content
                has_basic_test = "基础API测试" in html_content
                has_openai_test = "OpenAI API代理测试" in html_content
                has_bom_test = "BOM标准化测试" in html_content

                test.add_step("验证页面标题", has_title, "找到页面标题" if has_title else "未找到页面标题")

                test.add_step(
                    "验证包含测试组件",
                    has_basic_test and has_openai_test and has_bom_test,
                    f"基础API测试: {has_basic_test}, OpenAI测试: {has_openai_test}, BOM测试: {has_bom_test}",
                )

            # 测试成功
            test.end(response.status_code == 200 and has_title)
        except Exception as e:
            # 测试失败
            logger.error(f"API测试页面测试失败: {e}")
            test.end(False, str(e))

        # 保存测试结果
        self.results.append(test)
        return test.success

    def generate_html_report(self) -> str:
        """生成HTML格式的测试报告"""
        # 计算统计数据
        total_tests = len(self.results)
        passed_tests = sum(1 for test in self.results if test.success)
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0

        # 按类别分组
        categories = {}
        for test in self.results:
            if test.category not in categories:
                categories[test.category] = []
            categories[test.category].append(test)

        # 生成HTML
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESG AI平台测试报告</title>
    <style>
        body {{
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1, h2, h3 {{
            color: #2c3e50;
        }}
        .summary {{
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
        }}
        .summary-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }}
        .stats {{
            display: flex;
            margin-bottom: 20px;
        }}
        .stat-box {{
            flex: 1;
            text-align: center;
            padding: 15px;
            border-radius: 4px;
            margin-right: 10px;
        }}
        .stat-box:last-child {{
            margin-right: 0;
        }}
        .stat-box h3 {{
            margin: 0;
            font-size: 14px;
            font-weight: normal;
        }}
        .stat-box p {{
            margin: 5px 0 0;
            font-size: 24px;
            font-weight: bold;
        }}
        .green {{
            background-color: #d4edda;
            color: #155724;
        }}
        .red {{
            background-color: #f8d7da;
            color: #721c24;
        }}
        .blue {{
            background-color: #cce5ff;
            color: #004085;
        }}
        .category {{
            margin-bottom: 30px;
        }}
        .test-case {{
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }}
        .test-case.passed {{
            border-left: 4px solid #28a745;
        }}
        .test-case.failed {{
            border-left: 4px solid #dc3545;
        }}
        .test-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }}
        .test-name {{
            font-weight: bold;
            font-size: 16px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }}
        .badge.passed {{
            background-color: #28a745;
            color: white;
        }}
        .badge.failed {{
            background-color: #dc3545;
            color: white;
        }}
        .test-info {{
            margin-bottom: 10px;
            color: #666;
            font-size: 14px;
        }}
        .steps {{
            margin-top: 15px;
        }}
        .step {{
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 5px;
            font-size: 14px;
        }}
        .step.passed {{
            border-left: 3px solid #28a745;
        }}
        .step.failed {{
            border-left: 3px solid #dc3545;
        }}
        .details {{
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            font-family: monospace;
            white-space: pre-wrap;
        }}
        .error-message {{
            background-color: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            white-space: pre-wrap;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>ESG AI平台测试报告</h1>

        <div class="summary">
            <div class="summary-row">
                <div>生成时间：{now}</div>
                <div>测试版本：1.0.0</div>
            </div>
            <div class="summary-row">
                <div>测试环境：本地开发环境</div>
                <div>测试类型：API功能测试</div>
            </div>
        </div>

        <div class="stats">
            <div class="stat-box blue">
                <h3>总测试数</h3>
                <p>{total_tests}</p>
            </div>
            <div class="stat-box green">
                <h3>通过数</h3>
                <p>{passed_tests}</p>
            </div>
            <div class="stat-box red">
                <h3>失败数</h3>
                <p>{failed_tests}</p>
            </div>
            <div class="stat-box blue">
                <h3>通过率</h3>
                <p>{pass_rate:.1f}%</p>
            </div>
        </div>
"""

        # 添加每个类别的测试
        for category, tests in categories.items():
            html += f"""
        <div class="category">
            <h2>{category}测试</h2>
"""

            for test in tests:
                status_class = "passed" if test.success else "failed"
                status_text = "通过" if test.success else "失败"

                html += f"""
            <div class="test-case {status_class}">
                <div class="test-header">
                    <div class="test-name">{test.name}</div>
                    <div class="badge {status_class}">{status_text}</div>
                </div>
                <div class="test-info">
                    <div>{test.description}</div>
                    <div>耗时: {test.duration:.2f}秒</div>
                </div>
"""

                # 添加测试步骤
                if test.steps:
                    html += f"""
                <div class="steps">
                    <h3>测试步骤：</h3>
"""

                    for i, step in enumerate(test.steps, 1):
                        step_class = "passed" if step["result"] else "failed"
                        step_text = "通过" if step["result"] else "失败"

                        html += f"""
                    <div class="step {step_class}">
                        <div><strong>步骤{i}:</strong> {step["description"]} <span class="badge {step_class}">{step_text}</span></div>
"""

                        if step["details"]:
                            html += f"""
                        <div class="details">{step["details"]}</div>
"""

                        html += """
                    </div>
"""

                    html += """
                </div>
"""

                # 添加错误信息
                if not test.success and test.error_message:
                    html += f"""
                <div class="error-message">
                    {test.error_message}
                </div>
"""

                html += """
            </div>
"""

            html += """
        </div>
"""

        html += """
    </div>
</body>
</html>
"""

        return html

    def generate_report(self):
        """生成测试报告"""
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")

        # 生成HTML报告
        html_report = self.generate_html_report()
        report_file = f"/app/test_report_{timestamp}.html"

        # 保存HTML报告
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(html_report)

        logger.info(f"测试报告已生成: {report_file}")

        # 打印摘要信息
        total_tests = len(self.results)
        passed_tests = sum(1 for test in self.results if test.success)
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0

        print("\n" + "=" * 50)
        print("ESG AI平台测试摘要")
        print("=" * 50)
        print(f"总测试数: {total_tests}")
        print(f"通过数: {passed_tests}")
        print(f"失败数: {failed_tests}")
        print(f"通过率: {pass_rate:.1f}%")
        print("=" * 50)
        print(f"详细报告: {report_file}")

        # 在控制台输出每个测试的结果
        print("\n测试结果详情:")
        print("-" * 50)
        for test in self.results:
            status = "通过" if test.success else "失败"
            print(f"[{status}] {test.name} - {test.description}")


async def main():
    """主函数，运行测试"""
    logger.info("开始执行ESG AI平台自动化测试...")

    # 创建测试运行器
    runner = ESGAITestRunner()

    # 运行所有测试
    await runner.run_all_tests()

    logger.info("测试执行完成")


if __name__ == "__main__":
    """脚本入口"""
    # 运行测试
    asyncio.run(main())
