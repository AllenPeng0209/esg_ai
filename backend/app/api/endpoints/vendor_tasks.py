from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.VendorTask])
def get_vendor_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
):
    """获取所有供应商任务"""
    vendor_tasks = db.query(models.VendorTask).offset(skip).limit(limit).all()
    return vendor_tasks

@router.get("/pending", response_model=List[schemas.VendorTask])
def get_pending_tasks(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """获取当前用户的待处理任务"""
    # 这里只是简单实现，实际应用中可能需要根据用户权限和关联进行更复杂的查询
    vendor_tasks = db.query(models.VendorTask).filter(models.VendorTask.status == "pending").all()
    return vendor_tasks

@router.get("/{task_id}", response_model=schemas.VendorTask)
def get_vendor_task(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """获取特定供应商任务"""
    vendor_task = db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供应商任务未找到")
    return vendor_task

@router.post("/", response_model=schemas.VendorTask, status_code=status.HTTP_201_CREATED)
def create_vendor_task(
    task: schemas.VendorTaskCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """创建新的供应商任务"""
    # 检查工作流是否存在
    workflow = db.query(models.Workflow).filter(models.Workflow.id == task.workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流未找到")
    
    # 检查用户是否有权限创建任务
    if workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限在此工作流中创建任务")
    
    # 创建任务
    vendor_task = models.VendorTask(
        workflow_id=task.workflow_id,
        product_id=task.product_id,
        product_name=task.product_name,
        vendor=task.vendor,
        description=task.description,
        deadline=task.deadline,
    )
    db.add(vendor_task)
    db.commit()
    db.refresh(vendor_task)
    return vendor_task

@router.put("/{task_id}", response_model=schemas.VendorTask)
def update_vendor_task(
    task_id: int,
    task_update: schemas.VendorTaskUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """更新供应商任务"""
    vendor_task = db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供应商任务未找到")
    
    # 检查用户是否有权限更新任务
    workflow = db.query(models.Workflow).filter(models.Workflow.id == vendor_task.workflow_id).first()
    if workflow and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限更新此任务")
    
    # 更新任务
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vendor_task, key, value)
    
    # 检查状态并更新相关字段
    if task_update.status == "completed" and vendor_task.status != "completed":
        vendor_task.updated_at = datetime.now()
    
    db.commit()
    db.refresh(vendor_task)
    return vendor_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor_task(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """删除供应商任务"""
    vendor_task = db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供应商任务未找到")
    
    # 检查用户是否有权限删除任务
    workflow = db.query(models.Workflow).filter(models.Workflow.id == vendor_task.workflow_id).first()
    if workflow and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限删除此任务")
    
    db.delete(vendor_task)
    db.commit()
    return None

@router.post("/{task_id}/submit", response_model=schemas.VendorTask)
def submit_task_result(
    task_id: int,
    task_submit: schemas.VendorTaskSubmit,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """提交供应商任务结果"""
    vendor_task = db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供应商任务未找到")
    
    # 更新任务状态为已完成
    vendor_task.status = "completed"
    vendor_task.updated_at = datetime.now()
    
    # 这里可以添加处理提交数据的逻辑，例如更新相关产品节点的数据
    # 实际应用中可能需要更复杂的处理逻辑
    
    db.commit()
    db.refresh(vendor_task)
    return vendor_task 