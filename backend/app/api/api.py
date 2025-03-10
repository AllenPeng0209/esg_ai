from fastapi import APIRouter

from app.api.endpoints import auth, users, workflows, boms, ai, products, vendor_tasks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["工作流"])
api_router.include_router(boms.router, prefix="/boms", tags=["BOM"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(products.router, prefix="/products", tags=["产品"])
api_router.include_router(vendor_tasks.router, prefix="/vendor-tasks", tags=["供應商任務"]) 