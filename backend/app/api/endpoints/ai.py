from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import copy
from app.database import get_db
from app.schemas.user import User
from app.api import deps
from app.services.ai_service import (
    call_ai_service_api, 
    standardize_bom, 
    calculate_product_carbon_footprint, 
    match_carbon_factors, 
    standardize_lifecycle_document, 
    decompose_product_materials,
    optimize_distribution_nodes,
    optimize_manufacturing_nodes,
    optimize_usage_nodes,
    optimize_disposal_nodes,
    optimize_raw_material_nodes,
    carbon_consulting_chat
)

router = APIRouter()

@router.post("/carbon-consulting-chat")
async def carbon_consulting_chat_endpoint(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    碳諮詢AI对话接口
    
    接受:
    - message: 用户当前消息
    - history: 对话历史记录
    - workflow_data: 工作流数据
    
    返回:
    - response: AI回复内容
    """
    try:
        message = request.get("message", "")
        history = request.get("history", [])
        workflow_data = request.get("workflow_data")
        
        if not message:
            raise ValueError("消息内容不能为空")
        
        # 调用服务层函数处理对话
        result = await carbon_consulting_chat(message=message, history=history, workflow_data=workflow_data)
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # 返回友好的错误信息，并提供默认回复
        fallback_response = "抱歉，我当前遇到了技术问题，无法正常回答您的问题。请稍后再试。"
        
        # 在开发环境可以返回详细错误，生产环境返回友好消息
        if isinstance(e, ValueError):
            return {"response": str(e)}
        else:
            return {"response": fallback_response}

@router.post("/openai-proxy")
async def openai_proxy(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    OpenAI API代理
    """
    try:
        response = await call_ai_service_api(
            messages=request.get("messages", []),
            model=request.get("model", "gpt-3.5-turbo"),
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 2000)
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
        "data": {
            "time": "2023-01-01T00:00:00",
            "version": "1.0.0"
        }
    }

@router.post("/bom-standardize")
async def bom_standardize(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
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
    current_user: User = Depends(deps.get_current_user)
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
    current_user: User = Depends(deps.get_current_user)
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
            if 'productName' not in node or not node['productName']:
                node['productName'] = 'Unknown Product'
            
            # 確保所有節點都有lifecycleStage字段
            if 'lifecycleStage' not in node or not node['lifecycleStage']:
                # 从 node.data 中获取 lifecycleStage
                node['lifecycleStage'] = node.get("data", {}).get("lifecycleStage", "原材料")
                
        updated_nodes = await match_carbon_factors(nodes)
        
        # 匯總匹配結果的統計信息
        match_stats = {
            'total': len(updated_nodes),
            'db_matched': 0,
            'ai_matched': 0,
            'manual_required': 0,
            'match_sources': {}
        }
        
        for node in updated_nodes:
            data_source = node.get('dataSource', '未知')
            
            # 根据数据来源分类
            if '數據庫匹配' in data_source:
                match_stats['db_matched'] += 1
            elif 'AI生成' in data_source:
                match_stats['ai_matched'] += 1
            elif '需要人工介入' in data_source:
                match_stats['manual_required'] += 1
                
            # 統計各種來源的數量
            if data_source not in match_stats['match_sources']:
                match_stats['match_sources'][data_source] = 0
            match_stats['match_sources'][data_source] += 1
        
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
        response = await call_ai_service_api(
            messages=request.get("messages", [{"role": "user", "content": "测试消息"}]),
            model=request.get("model", "gpt-3.5-turbo"),
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 500)
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
                    "choices": [
                        {
                            "message": {
                                "content": "这是一个模拟的响应，因为实际API调用失败。"
                            }
                        }
                    ]
                }
            }
        }

@router.post("/lifecycle-document-standardize")
async def lifecycle_document_standardize(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
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
            
        if not stage or stage not in ['manufacturing', 'distribution', 'usage', 'disposal']:
            raise ValueError("無效的生命週期階段，必須是 'manufacturing', 'distribution', 'usage', 'disposal' 之一")
        
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
    current_user: User = Depends(deps.get_current_user)
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
            product_name=product_name, 
            total_weight=total_weight,
            unit=unit
        )
        
        return {"materials": decomposed_materials}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"產品分解失敗: {str(e)}")

@router.post("/optimize/raw_material")
async def optimize_raw_material(
    node: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    优化原材料阶段的节点参数
    
    参数:
    - node: 原材料节点，包含所有传入的字段
    
    返回:
    - 优化后的节点，保留所有原始字段并添加优化结果
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"接收到原材料节点优化请求")
        logger.info(f"原始节点数据: {node}")
        
        # 创建节点的深拷贝，保留所有原始数据

        processed_node = copy.deepcopy(node)
        
        # 只为必要字段添加默认值，不修改或删除任何现有字段
        if 'productName' not in processed_node:
            processed_node['productName'] = 'Unknown Product'
            
        if 'material' not in processed_node:
            processed_node['material'] = 'Unknown Material'
            
        if 'weight' not in processed_node:
            processed_node['weight'] = 0
            
        if 'lifecycleStage' not in processed_node:
            # 从 node.data 中获取 lifecycleStage
            processed_node['lifecycleStage'] = processed_node.get("data", {}).get("lifecycleStage", "原材料")
            
        # 调用优化函数，传入完整的节点数据
        optimized_nodes = await optimize_raw_material_nodes([processed_node])
        
        if not optimized_nodes or len(optimized_nodes) == 0:
            raise ValueError("优化结果为空")
            
        # 确保优化结果保留原始节点的所有字段
        optimized_node = optimized_nodes[0]
        

        logger.info(f"原材料节点优化完成")
        logger.info(f"优化后的节点（包含所有原始字段）: {optimized_node}")
        
        return {
            "status": "success", 
            "data": optimized_node,  # 返回包含所有字段的优化结果
        }
    except Exception as e:
        import traceback
        logger.error(f"原材料节点优化失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"原材料节点优化失败: {str(e)}")

@router.post("/optimize/distribution")
async def optimize_distribution(
    node: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    优化配送阶段的节点参数
    
    参数:
    - node: 配送节点，包含:
        - startPoint: 起始点
        - endPoint: 终点
        - productName: 产品名称
        - weight: 重量(kg)
        - transportMode: 运输方式
        - distance: 距离(km)
        - carbonFactor: 碳排放因子
        - fuelType: 燃料类型
    
    返回:
    - 优化后的节点，包含:
        - 优化后的参数
        - 优化说明
        - 不确定性评分
        - 不确定性因素
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"接收到分销节点优化请求")
        logger.info(f"节点数据: {node}")
        
       
            
        # 调用优化函数
        optimized_node = await optimize_distribution_nodes([node])
        
        if not optimized_node or len(optimized_node) == 0:
            raise ValueError("优化结果为空")
            

        
        logger.info(f"分销节点优化完成")
        logger.info(f"优化后的节点: {optimized_node[0]}")
        
        return {"status": "success", "data": optimized_node[0]}
    except Exception as e:
        import traceback
        logger.error(f"分销节点优化失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"分销节点优化失败: {str(e)}")

@router.post("/optimize/manufacturing")
async def optimize_manufacturing(
    node: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    优化制造阶段的节点参数
    
    参数:
    - node: 制造节点，包含:
        - productName: 产品名称
        - energyType: 能源类型
        - energyConsumption: 能源消耗(kWh)
        - processEfficiency: 工艺效率(%)
        - wasteRate: 废品率(%)
        - carbonFactor: 碳排放因子
    
    返回:
    - 优化后的节点，包含:
        - 优化后的参数
        - 优化说明
        - 不确定性评分
        - 不确定性因素
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"接收到生产制造节点优化请求")
        logger.info(f"节点数据: {node}")
      
            
        # 调用优化函数
        optimized_node = await optimize_manufacturing_nodes([node])
        
        if not optimized_node or len(optimized_node) == 0:
            raise ValueError("优化结果为空")
            
        
        
        logger.info(f"生产制造节点优化完成")
        logger.info(f"优化后的节点: {optimized_node[0]}")
        
        return {"status": "success", "data": optimized_node[0]}
    except Exception as e:
        import traceback
        logger.error(f"生产制造节点优化失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"制造节点优化失败: {str(e)}")

@router.post("/optimize/usage")
async def optimize_usage(
    node: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    优化使用阶段的节点参数
    
    参数:
    - node: 使用节点，包含:
        - productName: 产品名称
        - usageFrequency: 使用频率(次/天)
        - energyConsumption: 能源消耗(kWh)
        - waterConsumption: 水资源消耗(m³)
        - maintenanceFrequency: 维护频率(次/年)
        - repairRate: 维修率(%)
    
    返回:
    - 优化后的节点，包含:
        - 优化后的参数
        - 优化说明
        - 不确定性评分
        - 不确定性因素
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"接收到产品使用节点优化请求")
        logger.info(f"节点数据: {node}")
        
   
            
        # 调用优化函数
        optimized_node = await optimize_usage_nodes([node])
        
        if not optimized_node or len(optimized_node) == 0:
            raise ValueError("优化结果为空")
            
     
        
        logger.info(f"产品使用节点优化完成")
        logger.info(f"优化后的节点: {optimized_node[0]}")
        
        return {"status": "success", "data": optimized_node[0]}
    except Exception as e:
        import traceback
        logger.error(f"产品使用节点优化失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"使用节点优化失败: {str(e)}")

@router.post("/optimize/disposal")
async def optimize_disposal(
    node: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    优化处置阶段的节点参数
    
    参数:
    - node: 处置节点，包含:
        - productName: 产品名称
        - recyclingRate: 回收率(%)
        - landfillRate: 填埋率(%)
        - incinerationRate: 焚烧率(%)
        - hazardousWasteContent: 危险废物含量(%)
        - biodegradability: 生物降解性(%)
    
    返回:
    - 优化后的节点，包含:
        - 优化后的参数
        - 优化说明
        - 不确定性评分
        - 不确定性因素
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"接收到废弃处置节点优化请求")
        logger.info(f"节点数据: {node}")
        
     
            
        # 调用优化函数
        optimized_node = await optimize_disposal_nodes([node])
        
        if not optimized_node or len(optimized_node) == 0:
            raise ValueError("优化结果为空")
            

        
        logger.info(f"废弃处置节点优化完成")
        logger.info(f"优化后的节点: {optimized_node[0]}")
        
        return {"status": "success", "data": optimized_node[0]}
    except Exception as e:
        import traceback
        logger.error(f"废弃处置节点优化失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"处置节点优化失败: {str(e)}") 