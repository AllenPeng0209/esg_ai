from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.VendorTask])
def get_vendor_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
):
    """獲取所有供應商任務"""
    vendor_tasks = db.query(models.VendorTask).offset(skip).limit(limit).all()
    return vendor_tasks


@router.get("/pending", response_model=List[schemas.VendorTask])
def get_pending_tasks(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """獲取當前用戶的待處理任務"""
    # 這裡只是簡單實現，實際應用中可能需要根據用戶權限和關聯進行更複雜的查詢
    vendor_tasks = (
        db.query(models.VendorTask).filter(models.VendorTask.status == "pending").all()
    )
    return vendor_tasks


@router.get("/{task_id}", response_model=schemas.VendorTask)
def get_vendor_task(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """獲取特定供應商任務"""
    vendor_task = (
        db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    )
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供應商任務未找到")
    return vendor_task


@router.post(
    "/", response_model=schemas.VendorTask, status_code=status.HTTP_201_CREATED
)
def create_vendor_task(
    task: schemas.VendorTaskCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """創建新的供應商任務"""
    # 檢查工作流是否存在
    workflow = (
        db.query(models.Workflow).filter(models.Workflow.id == task.workflow_id).first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流未找到")

    # 檢查用戶是否有權限創建任務
    if workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您沒有權限在此工作流中創建任務")

    # 創建任務
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
    """更新供應商任務"""
    vendor_task = (
        db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    )
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供應商任務未找到")

    # 檢查用戶是否有權限更新任務
    workflow = (
        db.query(models.Workflow)
        .filter(models.Workflow.id == vendor_task.workflow_id)
        .first()
    )
    if workflow and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您沒有權限更新此任務")

    # 更新任務
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vendor_task, key, value)

    # 檢查狀態並更新相關字段
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
    """刪除供應商任務"""
    vendor_task = (
        db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    )
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供應商任務未找到")

    # 檢查用戶是否有權限刪除任務
    workflow = (
        db.query(models.Workflow)
        .filter(models.Workflow.id == vendor_task.workflow_id)
        .first()
    )
    if workflow and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您沒有權限刪除此任務")

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
    """提交供應商任務結果"""
    vendor_task = (
        db.query(models.VendorTask).filter(models.VendorTask.id == task_id).first()
    )
    if not vendor_task:
        raise HTTPException(status_code=404, detail="供應商任務未找到")

    # 更新任務狀態為已完成
    vendor_task.status = "completed"
    vendor_task.updated_at = datetime.now()

    # 這裡可以添加處理提交數據的邏輯，例如更新相關產品節點的數據
    # 實際應用中可能需要更複雜的處理邏輯

    db.commit()
    db.refresh(vendor_task)
    return vendor_task
