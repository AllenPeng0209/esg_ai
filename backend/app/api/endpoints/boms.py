from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.bom import BOMFile as BOMFileSchema
from app.services.bom_service import (
    delete_bom_file,
    get_bom_file_by_id,
    get_user_bom_files,
    standardize_bom_file,
    upload_bom_file,
)

router = APIRouter()


@router.get("/", response_model=List[BOMFileSchema])
async def read_bom_files(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取当前用户的所有BOM文件
    """
    bom_files = get_user_bom_files(db, current_user.id, skip, limit)
    return bom_files


@router.get("/{bom_id}", response_model=BOMFileSchema)
async def read_bom_file(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取指定BOM文件
    """
    bom_file = get_bom_file_by_id(db, bom_id, current_user.id)
    if not bom_file:
        raise HTTPException(status_code=404, detail="BOM文件未找到")
    return bom_file


@router.post("/upload", response_model=BOMFileSchema)
async def create_bom_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    上传BOM文件
    """
    # 检查文件类型
    if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="只支持CSV和Excel文件")

    return await upload_bom_file(db, file, current_user.id)


@router.post("/{bom_id}/standardize", response_model=BOMFileSchema)
async def standardize_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    标准化BOM文件
    """
    bom_file = await standardize_bom_file(db, bom_id, current_user.id)
    if not bom_file:
        raise HTTPException(status_code=404, detail="BOM文件未找到")
    return bom_file


@router.delete("/{bom_id}")
async def delete_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    删除BOM文件
    """
    result = delete_bom_file(db, bom_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="BOM文件未找到")
    return {"message": "BOM文件已删除"}
