from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api import deps
from app.schemas.user import UserResponse
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
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    OpenAI API proxy
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
        raise HTTPException(status_code=500, detail=f"OpenAI API call failed: {str(e)}")


@router.get("/test")
async def test_endpoint():
    """
    Test API endpoint, no authentication required
    """
    return {
        "status": "success",
        "message": "API test successful!",
        "data": {"time": "2023-01-01T00:00:00", "version": "1.0.0"},
    }


@router.post("/bom-standardize")
async def bom_standardize(
    request: Dict[str, Any],
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    BOM data standardization
    """
    try:
        content = request.get("content", "")
        if not content:
            raise ValueError("BOM content cannot be empty")

        standardized_content = await standardize_bom(content)
        return standardized_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BOM standardization failed: {str(e)}")


@router.post("/calculate-carbon-footprint")
async def calculate_carbon_footprint(
    product_data: Dict[str, Any],
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    Calculate product carbon footprint
    """
    try:
        carbon_footprint = await calculate_product_carbon_footprint(product_data)
        return {"carbonFootprint": carbon_footprint}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Carbon footprint calculation failed: {str(e)}")


@router.post("/match-carbon-factors")
async def match_carbon_factors_endpoint(
    nodes: List[Dict[str, Any]],
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    Match carbon emission factors for multiple product nodes
    """
    try:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Received carbon factor matching request for {len(nodes)} nodes")
        logger.info(f"Node data: {nodes}")

        # Preprocess node data to ensure all required fields exist
        for node in nodes:
            # Ensure all nodes have productName field
            if "productName" not in node or not node["productName"]:
                node["productName"] = "Unknown Product"

            # Ensure all nodes have lifecycleStage field
            if "lifecycleStage" not in node or not node["lifecycleStage"]:
                node["lifecycleStage"] = "raw_material"

        updated_nodes = await match_carbon_factors(nodes)

        # Summarize matching results statistics
        match_stats = {
            "total": len(updated_nodes),
            "db_matched": 0,
            "ai_matched": 0,
            "manual_required": 0,
            "match_sources": {},
        }

        for node in updated_nodes:
            data_source = node.get("dataSource", "unknown")

            # Categorize by data source
            if "database_match" in data_source:
                match_stats["db_matched"] += 1
            elif "ai_generated" in data_source:
                match_stats["ai_matched"] += 1
            elif "manual_intervention" in data_source:
                match_stats["manual_required"] += 1

            # Count occurrences of each source
            if data_source not in match_stats["match_sources"]:
                match_stats["match_sources"][data_source] = 0
            match_stats["match_sources"][data_source] += 1

        logger.info(f"Carbon factor matching statistics: {match_stats}")
        logger.info(f"Successfully matched carbon factors for {len(updated_nodes)} nodes")
        logger.info(f"Updated nodes: {updated_nodes}")

        return {"nodes": updated_nodes, "match_stats": match_stats}
    except Exception as e:
        import traceback

        logger.error(f"Carbon factor matching failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Carbon factor matching failed: {str(e)}")


@router.post("/test-openai-proxy", response_model=Dict[str, Any])
async def test_openai_proxy(request: Dict[str, Any]):
    """
    Test OpenAI API proxy endpoint, no authentication required
    """
    try:
        response = await call_openai_api(
            messages=request.get("messages", [{"role": "user", "content": "Test message"}]),
            model=request.get("model", "gpt-3.5-turbo"),
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 500),
        )
        return response
    except Exception as e:
        error_message = str(e)
        return {
            "status": "error",
            "message": f"OpenAI API proxy test failed: {error_message}",
            "detail": {
                "error_type": type(e).__name__,
                "mock_response": {
                    "choices": [{"message": {"content": "This is a mock response because the actual API call failed."}}]
                },
            },
        }


@router.post("/lifecycle-document-standardize")
async def lifecycle_document_standardize(
    request: Dict[str, Any],
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    Lifecycle stage document standardization

    Accepts:
    - content: Original document content
    - stage: Lifecycle stage ('manufacturing', 'distribution', 'usage', 'disposal')

    Returns standardized document content
    """
    try:
        content = request.get("content", "")
        stage = request.get("stage", "")

        if not content:
            raise ValueError("Document content cannot be empty")

        if not stage or stage not in [
            "manufacturing",
            "distribution",
            "usage",
            "disposal",
        ]:
            raise ValueError(
                "Invalid lifecycle stage, must be one of: 'manufacturing', 'distribution', 'usage', 'disposal'"
            )

        standardized_content = await standardize_lifecycle_document(content, stage)
        return standardized_content

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Document standardization failed: {str(e)}")


@router.post("/decompose-product")
async def decompose_product(
    request: Dict[str, Any],
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """
    Decompose product into material components and calculate carbon footprint for each component

    Accepts:
    - product_name: Product name
    - total_weight: Product total weight (grams)
    - unit: Weight unit (default: grams)

    Returns list of decomposed materials with weight distribution and carbon factors
    """
    try:
        product_name = request.get("product_name", "")
        total_weight = request.get("total_weight", 0)
        unit = request.get("unit", "g")

        if not product_name:
            raise ValueError("Product name cannot be empty")

        if not total_weight or total_weight <= 0:
            raise ValueError("Product weight must be greater than zero")

        decomposed_materials = await decompose_product_materials(
            product_name=product_name, total_weight=total_weight, unit=unit
        )

        return {"materials": decomposed_materials}

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Product decomposition failed: {str(e)}")
