import os
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import UploadFile
import pandas as pd
import uuid

from app.models.bom import BOMFile
from app.schemas.bom import BOMFileCreate, BOMFileUpdate
from app.services.ai_service import standardize_bom

def get_bom_file_by_id(db: Session, bom_id: int, user_id: Optional[int] = None) -> Optional[BOMFile]:
    """获取BOM文件，可选择只获取特定用户的文件"""
    query = db.query(BOMFile).filter(BOMFile.id == bom_id)
    if user_id:
        query = query.filter(BOMFile.user_id == user_id)
    return query.first()

def get_user_bom_files(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[BOMFile]:
    """获取用户的所有BOM文件"""
    return db.query(BOMFile).filter(BOMFile.user_id == user_id).offset(skip).limit(limit).all()

async def upload_bom_file(db: Session, file: UploadFile, user_id: int) -> BOMFile:
    """上传并创建BOM文件"""
    # 创建上传文件夹（如果不存在）
    upload_dir = "uploads/bom_files"
    os.makedirs(upload_dir, exist_ok=True)
    
    # 获取文件扩展名
    file_extension = os.path.splitext(file.filename)[1]
    
    # 生成唯一文件名
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # 保存文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 读取文件内容（转换为文本）
    file_content = ""
    if file_extension.lower() in ['.csv']:
        file_content = content.decode("utf-8")
    elif file_extension.lower() in ['.xlsx', '.xls']:
        # 使用pandas读取Excel文件
        try:
            df = pd.read_excel(file_path)
            file_content = df.to_csv(index=False)
        except Exception as e:
            print(f"读取Excel文件失败: {e}")
            file_content = "Error reading Excel file"
    
    # 创建BOM文件记录
    db_bom_file = BOMFile(
        user_id=user_id,
        title=file.filename,
        file_path=file_path,
        content=file_content,
        file_type=file_extension.lower().replace('.', '')
    )
    
    db.add(db_bom_file)
    db.commit()
    db.refresh(db_bom_file)
    
    return db_bom_file

async def standardize_bom_file(db: Session, bom_id: int, user_id: int) -> Optional[BOMFile]:
    """标准化BOM文件内容"""
    db_bom_file = get_bom_file_by_id(db, bom_id, user_id)
    if not db_bom_file:
        return None
    
    # 使用AI服务标准化BOM内容（现在包含重量推算功能）
    standardized_content = await standardize_bom(db_bom_file.content)
    
    # 更新BOM文件记录
    db_bom_file.standardized_content = standardized_content
    db.commit()
    db.refresh(db_bom_file)
    
    return db_bom_file

def delete_bom_file(db: Session, bom_id: int, user_id: int) -> bool:
    """删除BOM文件"""
    db_bom_file = get_bom_file_by_id(db, bom_id, user_id)
    if not db_bom_file:
        return False
    
    # 删除物理文件
    try:
        if os.path.exists(db_bom_file.file_path):
            os.remove(db_bom_file.file_path)
    except Exception as e:
        print(f"删除文件失败: {e}")
    
    # 删除数据库记录
    db.delete(db_bom_file)
    db.commit()
    
    return True 