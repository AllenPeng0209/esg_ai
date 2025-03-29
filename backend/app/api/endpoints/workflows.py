from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.user import UserResponse
from app.schemas.workflow import Workflow, WorkflowCreate, WorkflowUpdate
from app.services.workflow_service import (
    calculate_carbon_footprint,
    create_workflow,
    delete_workflow,
    get_user_workflows,
    get_workflow_by_id,
    update_workflow,
)

router = APIRouter()


@router.get("/", response_model=List[Workflow])
async def read_workflows(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(get_current_user),
) -> List[dict]:
    """
    Get all workflows for current user
    """
    workflows = get_user_workflows(current_user.id, skip, limit)
    # Ensure each workflow has the required fields with proper types
    for workflow in workflows:
        workflow["id"] = str(workflow["id"]) if workflow.get("id") else None
        workflow["user_id"] = (
            str(workflow["user_id"]) if workflow.get("user_id") else None
        )
        workflow["data"] = workflow.get("data", {})
        workflow["nodes"] = workflow.get("nodes", [])
        workflow["edges"] = workflow.get("edges", [])
    return workflows


@router.get("/{workflow_id}", response_model=Workflow)
async def read_workflow(
    workflow_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """
    Get specific workflow
    """
    workflow = get_workflow_by_id(workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Ensure the workflow has the required fields with proper types
    workflow["id"] = str(workflow["id"]) if workflow.get("id") else None
    workflow["user_id"] = str(workflow["user_id"]) if workflow.get("user_id") else None
    workflow["data"] = workflow.get("data", {})
    workflow["nodes"] = workflow.get("nodes", [])
    workflow["edges"] = workflow.get("edges", [])

    return workflow


@router.post("/", response_model=Workflow, status_code=status.HTTP_201_CREATED)
async def create_workflow_endpoint(
    workflow: WorkflowCreate,
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """
    Create new workflow
    """
    result = create_workflow(workflow, current_user.id)
    # Ensure the result has the required fields with proper types
    result["id"] = str(result["id"]) if result.get("id") else None
    result["user_id"] = str(result["user_id"]) if result.get("user_id") else None
    result["data"] = result.get("data", {})
    result["nodes"] = result.get("nodes", [])
    result["edges"] = result.get("edges", [])
    return result


@router.put("/{workflow_id}", response_model=Workflow)
async def update_workflow_endpoint(
    workflow_id: UUID,
    workflow_data: WorkflowUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """
    Update workflow
    """
    workflow = update_workflow(workflow_id, workflow_data, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Ensure the workflow has the required fields with proper types
    workflow["id"] = str(workflow["id"]) if workflow.get("id") else None
    workflow["user_id"] = str(workflow["user_id"]) if workflow.get("user_id") else None
    workflow["data"] = workflow.get("data", {})
    workflow["nodes"] = workflow.get("nodes", [])
    workflow["edges"] = workflow.get("edges", [])

    return workflow


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow_endpoint(
    workflow_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Delete workflow
    """
    result = delete_workflow(workflow_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")


@router.post("/{workflow_id}/calculate-carbon-footprint")
async def calculate_carbon_footprint_endpoint(
    workflow_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Calculate workflow's carbon footprint
    """
    workflow = get_workflow_by_id(workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    total_carbon_footprint = calculate_carbon_footprint(workflow_id)
    return {
        "workflow_id": str(workflow_id),
        "total_carbon_footprint": total_carbon_footprint,
    }
