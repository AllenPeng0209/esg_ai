from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.security import get_current_active_user
from app.core.supabase import get_supabase_client
from app.schemas.user import UserResponse
from app.schemas.bom import BOMFile as BOMFileSchema

router = APIRouter()


@router.get("/", response_model=List[BOMFileSchema])
async def read_bom_files(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Get all BOM files for current user
    """
    supabase = get_supabase_client()
    response = (
        supabase.table("bom_files")
        .select("*")
        .eq("user_id", str(current_user.id))
        .range(skip, skip + limit)
        .execute()
    )
    return response.data


@router.get("/{bom_id}", response_model=BOMFileSchema)
async def read_bom_file(
    bom_id: UUID,
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Get specific BOM file
    """
    supabase = get_supabase_client()
    response = (
        supabase.table("bom_files")
        .select("*")
        .eq("id", str(bom_id))
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="BOM file not found")
    return response.data


@router.post(
    "/upload", response_model=BOMFileSchema, status_code=status.HTTP_201_CREATED
)
async def create_bom_file(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Upload BOM file
    """
    # Check file type
    if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Only CSV and Excel files are supported"
        )

    try:
        supabase = get_supabase_client()

        # Read file content
        content = await file.read()

        # Upload file to Supabase Storage
        storage_path = f"bom_files/{current_user.id}/{file.filename}"
        storage_response = supabase.storage.from_("bom_files").upload(
            storage_path, content
        )

        if not storage_response.data:
            raise HTTPException(
                status_code=500, detail="Failed to upload file to storage"
            )

        # Create BOM file record
        file_data = {
            "user_id": str(current_user.id),
            "title": file.filename,
            "file_path": storage_path,
            "content": content.decode() if file.filename.endswith(".csv") else "",
            "file_type": file.filename.split(".")[-1].lower(),
            "standardized_content": None,
        }

        response = supabase.table("bom_files").insert(file_data).execute()
        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to upload BOM file: {str(e)}"
        )


@router.post("/{bom_id}/standardize", response_model=BOMFileSchema)
async def standardize_bom(
    bom_id: UUID,
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Standardize BOM file
    """
    supabase = get_supabase_client()

    # Get BOM file
    bom_file = (
        supabase.table("bom_files")
        .select("*")
        .eq("id", str(bom_id))
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    if not bom_file.data:
        raise HTTPException(status_code=404, detail="BOM file not found")

    try:
        # Get file content from storage if needed
        if not bom_file.data["content"]:
            storage_response = supabase.storage.from_("bom_files").download(
                bom_file.data["file_path"]
            )
            content = storage_response.decode()
        else:
            content = bom_file.data["content"]

        # TODO: Implement standardization logic here
        standardized_content = content  # Replace with actual standardization

        # Update BOM file with standardized content
        response = (
            supabase.table("bom_files")
            .update({"standardized_content": standardized_content})
            .eq("id", str(bom_id))
            .execute()
        )

        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to standardize BOM file: {str(e)}"
        )


@router.delete("/{bom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bom(
    bom_id: UUID,
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Delete BOM file
    """
    supabase = get_supabase_client()

    # Get BOM file
    bom_file = (
        supabase.table("bom_files")
        .select("*")
        .eq("id", str(bom_id))
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    if not bom_file.data:
        raise HTTPException(status_code=404, detail="BOM file not found")

    try:
        # Delete file from storage
        supabase.storage.from_("bom_files").remove([bom_file.data["file_path"]])

        # Delete record from database
        supabase.table("bom_files").delete().eq("id", str(bom_id)).execute()

        return None

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete BOM file: {str(e)}"
        )
