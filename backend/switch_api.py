#!/usr/bin/env python
# -*- coding: utf-8 -*-

import argparse
import logging
import os
import re
import subprocess
import sys

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 目标文件
TARGET_FILE = os.path.join(
    os.path.dirname(__file__), "app", "services", "ai_service.py"
)


def switch_api_service(service):
    """切换API服务"""
    valid_services = ["openai", "deepseek", "mock"]
    if service not in valid_services:
        logger.error(f"无效的API服务: {service}，有效选项: {', '.join(valid_services)}")
        return False

    try:
        # 读取文件内容
        with open(TARGET_FILE, "r", encoding="utf-8") as file:
            content = file.read()

        # 使用正则表达式替换API_SERVICE的值
        pattern = r"API_SERVICE\s*=\s*\"[^\"]*\""
        replacement = f'API_SERVICE = "{service}"'
        new_content = re.sub(pattern, replacement, content)

        # 写入文件
        with open(TARGET_FILE, "w", encoding="utf-8") as file:
            file.write(new_content)

        logger.info(f"已成功将API服务切换为: {service}")
        return True
    except Exception as e:
        logger.error(f"切换API服务时出错: {str(e)}")
        return False


def toggle_mock_mode(enable):
    """启用或禁用始终使用模拟响应"""
    try:
        # 读取文件内容
        with open(TARGET_FILE, "r", encoding="utf-8") as file:
            content = file.read()

        # 使用正则表达式替换ALWAYS_USE_MOCK的值
        pattern = r"ALWAYS_USE_MOCK\s*=\s*(True|False)"
        replacement = f'ALWAYS_USE_MOCK = {"True" if enable else "False"}'
        new_content = re.sub(pattern, replacement, content)

        # 写入文件
        with open(TARGET_FILE, "w", encoding="utf-8") as file:
            file.write(new_content)

        logger.info(f"已{'启用' if enable else '禁用'}始终使用模拟响应模式")
        return True
    except Exception as e:
        logger.error(f"切换模拟模式时出错: {str(e)}")
        return False


def toggle_auto_fallback(enable):
    """启用或禁用自动降级到模拟模式"""
    try:
        # 读取文件内容
        with open(TARGET_FILE, "r", encoding="utf-8") as file:
            content = file.read()

        # 使用正则表达式替换AUTO_FALLBACK的值
        pattern = r"AUTO_FALLBACK\s*=\s*(True|False)"
        replacement = f'AUTO_FALLBACK = {"True" if enable else "False"}'
        new_content = re.sub(pattern, replacement, content)

        # 写入文件
        with open(TARGET_FILE, "w", encoding="utf-8") as file:
            file.write(new_content)

        logger.info(f"已{'启用' if enable else '禁用'}自动降级到模拟模式")
        return True
    except Exception as e:
        logger.error(f"切换自动降级模式时出错: {str(e)}")
        return False


def get_current_settings():
    """获取当前设置"""
    try:
        # 读取文件内容
        with open(TARGET_FILE, "r", encoding="utf-8") as file:
            content = file.read()

        # 提取API_SERVICE的值
        api_service_match = re.search(r"API_SERVICE\s*=\s*\"([^\"]*)\"", content)
        api_service = api_service_match.group(1) if api_service_match else "未知"

        # 提取ALWAYS_USE_MOCK的值
        always_mock_match = re.search(r"ALWAYS_USE_MOCK\s*=\s*(True|False)", content)
        always_mock = always_mock_match.group(1) if always_mock_match else "未知"

        # 提取AUTO_FALLBACK的值
        auto_fallback_match = re.search(r"AUTO_FALLBACK\s*=\s*(True|False)", content)
        auto_fallback = auto_fallback_match.group(1) if auto_fallback_match else "未知"

        return {
            "api_service": api_service,
            "always_mock": always_mock,
            "auto_fallback": auto_fallback,
        }
    except Exception as e:
        logger.error(f"获取当前设置时出错: {str(e)}")
        return {"api_service": "未知", "always_mock": "未知", "auto_fallback": "未知"}


def restart_backend_service():
    """重启后端服务"""
    try:
        logger.info("正在重启后端服务...")
        result = subprocess.run(
            ["docker-compose", "restart", "backend"],
            capture_output=True,
            text=True,
            check=True,
        )
        logger.info("后端服务已重启")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"重启后端服务失败: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"重启后端服务时出错: {str(e)}")
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="ESG AI平台API服务切换工具")

    parser.add_argument(
        "--service",
        choices=["openai", "deepseek", "mock"],
        help="切换API服务 (openai, deepseek, mock)",
    )

    parser.add_argument("--mock", choices=["on", "off"], help="启用或禁用始终使用模拟响应")

    parser.add_argument("--fallback", choices=["on", "off"], help="启用或禁用自动降级到模拟模式")

    parser.add_argument("--status", action="store_true", help="显示当前设置")

    parser.add_argument("--restart", action="store_true", help="重启后端服务")

    args = parser.parse_args()

    # 没有参数时显示帮助
    if len(sys.argv) == 1:
        parser.print_help()
        return

    # 显示当前设置
    if args.status:
        settings = get_current_settings()
        print("\n当前API服务设置：")
        print(f"API服务: {settings['api_service']}")
        print(f"始终使用模拟响应: {settings['always_mock']}")
        print(f"自动降级到模拟模式: {settings['auto_fallback']}")
        return

    changes_made = False

    # 切换API服务
    if args.service:
        changes_made = switch_api_service(args.service) or changes_made

    # 启用或禁用始终使用模拟响应
    if args.mock:
        changes_made = toggle_mock_mode(args.mock == "on") or changes_made

    # 启用或禁用自动降级到模拟模式
    if args.fallback:
        changes_made = toggle_auto_fallback(args.fallback == "on") or changes_made

    # 显示更新后的设置
    if changes_made or args.restart:
        settings = get_current_settings()
        print("\n更新后的API服务设置：")
        print(f"API服务: {settings['api_service']}")
        print(f"始终使用模拟响应: {settings['always_mock']}")
        print(f"自动降级到模拟模式: {settings['auto_fallback']}")

        # 如果有更改或明确要求重启，则重启后端服务
        if args.restart or changes_made:
            print("\n需要重启后端服务以应用更改...")
            if restart_backend_service():
                print("后端服务已成功重启，新设置已生效")
            else:
                print("后端服务重启失败，请手动重启以应用更改")


if __name__ == "__main__":
    main()
