from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.workflow import Workflow as WorkflowSchema, WorkflowCreate, WorkflowUpdate
from app.services.workflow_service import (
    get_workflow_by_id, get_user_workflows, create_workflow,
    update_workflow, delete_workflow, calculate_carbon_footprint
)
from app.core.security import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[WorkflowSchema])
async def read_workflows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取当前用户的所有工作流
    """
    workflows = get_user_workflows(db, current_user.id, skip, limit)
    return workflows

@router.get("/{workflow_id}", response_model=WorkflowSchema)
async def read_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取指定工作流
    """
    workflow = get_workflow_by_id(db, workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流未找到")
    return workflow

@router.post("/", response_model=WorkflowSchema)
async def create_workflow_endpoint(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    创建新工作流
    """
    return create_workflow(db, workflow, current_user.id)

@router.put("/{workflow_id}", response_model=WorkflowSchema)
async def update_workflow_endpoint(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    更新工作流
    """
    workflow = update_workflow(db, workflow_id, workflow_data, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流未找到")
    return workflow

@router.delete("/{workflow_id}")
async def delete_workflow_endpoint(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    删除工作流
    """
    result = delete_workflow(db, workflow_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="工作流未找到")
    return {"message": "工作流已删除"}

@router.post("/{workflow_id}/calculate-carbon-footprint")
async def calculate_carbon_footprint_endpoint(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    计算工作流的碳足迹
    """
    workflow = get_workflow_by_id(db, workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流未找到")
    
    total_carbon_footprint = calculate_carbon_footprint(db, workflow_id)
    return {
        "workflow_id": workflow_id,
        "total_carbon_footprint": total_carbon_footprint
    } 