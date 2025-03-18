from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.schemas.user import User
from app.services.ai_service import (
    calculate_product_carbon_footprint,
    call_openai_api,
    decompose_product_materials,
    match_carbon_factors,
    standardize_bom,
    standardize_lifecycle_document,
)

router = APIRouter()


@router.post("/openai-proxy")
async def openai_proxy(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    OpenAI API代理
    """
    try:
        response = await call_openai_api(
            messages=request.get("messages", []),
            model=request.get("model", "gpt-3.5-turbo"),
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 2000),
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API调用失败: {str(e)}")


@router.get("/test")
async def test_endpoint():
    """
    测试API端点，无需认证
    """
    return {
        "status": "success",
        "message": "API测试成功！",
        "data": {"time": "2023-01-01T00:00:00", "version": "1.0.0"},
    }


@router.post("/bom-standardize")
async def bom_standardize(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    BOM数据标准化
    """
    try:
        content = request.get("content", "")
        if not content:
            raise ValueError("BOM数据内容不能为空")

        standardized_content = await standardize_bom(content)
        return standardized_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BOM标准化失败: {str(e)}")


@router.post("/calculate-carbon-footprint")
async def calculate_carbon_footprint(
    product_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    计算产品碳足迹
    """
    try:
        carbon_footprint = await calculate_product_carbon_footprint(product_data)
        return {"carbonFootprint": carbon_footprint}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"碳足迹计算失败: {str(e)}")


@router.post("/match-carbon-factors")
async def match_carbon_factors_endpoint(
    nodes: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    為多個產品節點匹配碳排放因子
    """
    try:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"接收到{len(nodes)}個節點的碳因子匹配請求")
        logger.info(f"節點數據: {nodes}")

        # 預處理節點數據，確保所有必要字段存在
        for node in nodes:
            # 確保所有節點都有productName字段
            if "productName" not in node or not node["productName"]:
                node["productName"] = "Unknown Product"

            # 確保所有節點都有lifecycleStage字段
            if "lifecycleStage" not in node or not node["lifecycleStage"]:
                node["lifecycleStage"] = "原材料"

        updated_nodes = await match_carbon_factors(nodes)

        # 匯總匹配結果的統計信息
        match_stats = {
            "total": len(updated_nodes),
            "db_matched": 0,
            "ai_matched": 0,
            "manual_required": 0,
            "match_sources": {},
        }

        for node in updated_nodes:
            data_source = node.get("dataSource", "未知")

            # 根据数据来源分类
            if "數據庫匹配" in data_source:
                match_stats["db_matched"] += 1
            elif "AI生成" in data_source:
                match_stats["ai_matched"] += 1
            elif "需要人工介入" in data_source:
                match_stats["manual_required"] += 1

            # 統計各種來源的數量
            if data_source not in match_stats["match_sources"]:
                match_stats["match_sources"][data_source] = 0
            match_stats["match_sources"][data_source] += 1

        logger.info(f"碳因子匹配結果統計: {match_stats}")
        logger.info(f"成功匹配{len(updated_nodes)}個節點的碳因子")
        logger.info(f"更新後的節點: {updated_nodes}")

        return {"nodes": updated_nodes, "match_stats": match_stats}
    except Exception as e:
        import traceback

        logger.error(f"碳因子匹配失敗: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"碳因子匹配失敗: {str(e)}")


@router.post("/test-openai-proxy", response_model=Dict[str, Any])
async def test_openai_proxy(request: Dict[str, Any]):
    """
    测试OpenAI API代理接口，无需认证
    """
    try:
        response = await call_openai_api(
            messages=request.get("messages", [{"role": "user", "content": "测试消息"}]),
            model=request.get("model", "gpt-3.5-turbo"),
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 500),
        )
        return response
    except Exception as e:
        error_message = str(e)
        return {
            "status": "error",
            "message": f"测试OpenAI API代理失败: {error_message}",
            "detail": {
                "error_type": type(e).__name__,
                "mock_response": {
                    "choices": [{"message": {"content": "这是一个模拟的响应，因为实际API调用失败。"}}]
                },
            },
        }


@router.post("/lifecycle-document-standardize")
async def lifecycle_document_standardize(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    生命週期階段文件標準化

    接受:
    - content: 原始文件內容
    - stage: 生命週期階段 ('manufacturing', 'distribution', 'usage', 'disposal')

    返回標準化後的文件內容
    """
    try:
        content = request.get("content", "")
        stage = request.get("stage", "")

        if not content:
            raise ValueError("文件內容不能為空")

        if not stage or stage not in [
            "manufacturing",
            "distribution",
            "usage",
            "disposal",
        ]:
            raise ValueError(
                "無效的生命週期階段，必須是 'manufacturing', 'distribution', 'usage', 'disposal' 之一"
            )

        standardized_content = await standardize_lifecycle_document(content, stage)
        return standardized_content

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"文件標準化失敗: {str(e)}")


@router.post("/decompose-product")
async def decompose_product(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    分解產品為材料組件，並計算每個組件的碳足跡

    接受:
    - product_name: 產品名稱
    - total_weight: 產品總重量（克）
    - unit: 重量單位（默認為克）

    返回分解後的材料列表，包含重量分配和碳因子
    """
    try:
        product_name = request.get("product_name", "")
        total_weight = request.get("total_weight", 0)
        unit = request.get("unit", "g")

        if not product_name:
            raise ValueError("產品名稱不能為空")

        if not total_weight or total_weight <= 0:
            raise ValueError("產品重量必須大於零")

        decomposed_materials = await decompose_product_materials(
            product_name=product_name, total_weight=total_weight, unit=unit
        )

        return {"materials": decomposed_materials}

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"產品分解失敗: {str(e)}")
