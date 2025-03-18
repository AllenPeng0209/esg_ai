from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def get_product_by_id(
    db: Session, product_id: int, user_id: Optional[int] = None
) -> Optional[Product]:
    """获取产品，可选择只获取特定用户的产品"""
    query = db.query(Product).filter(Product.id == product_id)
    if user_id:
        query = query.filter(Product.user_id == user_id)
    return query.first()


def get_user_products(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> List[Product]:
    """获取用户的所有产品"""
    return (
        db.query(Product)
        .filter(Product.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_product(db: Session, product: ProductCreate, user_id: int) -> Product:
    """创建新产品"""
    db_product = Product(
        user_id=user_id,
        name=product.name,
        description=product.description,
        product_type=product.product_type,
        weight=product.weight,
        dimensions=product.dimensions,
        materials=product.materials,
        carbon_footprint=0.0,  # 初始值，后续可能会通过计算或API更新
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def update_product(
    db: Session, product_id: int, product_data: ProductUpdate, user_id: int
) -> Optional[Product]:
    """更新产品"""
    db_product = get_product_by_id(db, product_id, user_id)
    if not db_product:
        return None

    update_data = product_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, product_id: int, user_id: int) -> bool:
    """删除产品"""
    db_product = get_product_by_id(db, product_id, user_id)
    if not db_product:
        return False

    db.delete(db_product)
    db.commit()
    return True
