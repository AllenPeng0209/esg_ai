from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api import deps
from app.core.supabase import get_supabase_client
from app.schemas.user import UserResponse
from app.schemas import VendorTask, VendorTaskCreate, VendorTaskUpdate, VendorTaskSubmit

router = APIRouter()


@router.get("/", response_model=List[VendorTask])
def get_vendor_tasks(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Get all vendor tasks"""
    supabase = get_supabase_client()
    response = supabase.table('vendor_tasks').select('*').range(skip, skip + limit).execute()
    return response.data


@router.get("/pending", response_model=List[VendorTask])
def get_pending_tasks(
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Get current user's pending tasks"""
    supabase = get_supabase_client()
    response = supabase.table('vendor_tasks').select('*').eq('status', 'pending').execute()
    return response.data


@router.get("/{task_id}", response_model=VendorTask)
def get_vendor_task(
    task_id: UUID,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Get specific vendor task"""
    supabase = get_supabase_client()
    response = supabase.table('vendor_tasks').select('*').eq('id', str(task_id)).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Vendor task not found")
    return response.data


@router.post("/", response_model=VendorTask, status_code=status.HTTP_201_CREATED)
def create_vendor_task(
    task: VendorTaskCreate,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Create new vendor task"""
    supabase = get_supabase_client()
    
    # Check if workflow exists
    workflow = supabase.table('workflows').select('*').eq('id', str(task.workflow_id)).single().execute()
    if not workflow.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Check if user has permission to create task
    if workflow.data['user_id'] != str(current_user.id):
        raise HTTPException(status_code=403, detail="You don't have permission to create tasks in this workflow")

    # Create task
    task_data = task.dict()
    task_data['workflow_id'] = str(task.workflow_id)
    response = supabase.table('vendor_tasks').insert(task_data).execute()
    return response.data[0]


@router.put("/{task_id}", response_model=VendorTask)
def update_vendor_task(
    task_id: UUID,
    task_update: VendorTaskUpdate,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Update vendor task"""
    supabase = get_supabase_client()
    
    # Get task
    task = supabase.table('vendor_tasks').select('*').eq('id', str(task_id)).single().execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Vendor task not found")

    # Check if user has permission to update task
    workflow = supabase.table('workflows').select('*').eq('id', str(task.data['workflow_id'])).single().execute()
    if workflow.data and workflow.data['user_id'] != str(current_user.id):
        raise HTTPException(status_code=403, detail="You don't have permission to update this task")

    # Update task
    update_data = task_update.dict(exclude_unset=True)
    
    # Check status and update related fields
    if task_update.status == "completed" and task.data['status'] != "completed":
        update_data['updated_at'] = datetime.now().isoformat()

    response = supabase.table('vendor_tasks').update(update_data).eq('id', str(task_id)).execute()
    return response.data[0]


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor_task(
    task_id: UUID,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Delete vendor task"""
    supabase = get_supabase_client()
    
    # Get task
    task = supabase.table('vendor_tasks').select('*').eq('id', str(task_id)).single().execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Vendor task not found")

    # Check if user has permission to delete task
    workflow = supabase.table('workflows').select('*').eq('id', str(task.data['workflow_id'])).single().execute()
    if workflow.data and workflow.data['user_id'] != str(current_user.id):
        raise HTTPException(status_code=403, detail="You don't have permission to delete this task")

    supabase.table('vendor_tasks').delete().eq('id', str(task_id)).execute()
    return None


@router.post("/{task_id}/submit", response_model=VendorTask)
def submit_task_result(
    task_id: UUID,
    task_submit: VendorTaskSubmit,
    current_user: UserResponse = Depends(deps.get_current_user),
):
    """Submit vendor task result"""
    supabase = get_supabase_client()
    
    # Get task
    task = supabase.table('vendor_tasks').select('*').eq('id', str(task_id)).single().execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Vendor task not found")

    # Update task status to completed
    update_data = {
        'status': 'completed',
        'updated_at': datetime.now().isoformat(),
        'data': task_submit.data,
        'comments': task_submit.comments
    }
    
    response = supabase.table('vendor_tasks').update(update_data).eq('id', str(task_id)).execute()
    return response.data[0]
