from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from .utils.opensearch_client import OpenSearchClient

router = APIRouter()

# Initialize OpenSearch client
client = OpenSearchClient(
    host=os.getenv("OPENSEARCH_HOST", "localhost"),
    port=int(os.getenv("OPENSEARCH_PORT", "9200")),
    username=os.getenv("OPENSEARCH_USER", "admin"),
    password=os.getenv("OPENSEARCH_PASSWORD", "admin"),
)


class SearchRequest(BaseModel):
    search_term: str
    min_score: Optional[float] = 0.5
    size: Optional[int] = 10


class SearchResponse(BaseModel):
    matches: List[Dict]
    total: int


@router.post("/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """
    Search for products by name in both Reference Product Name and Activity Name fields

    Args:
        request: SearchRequest containing search term and optional parameters

    Returns:
        SearchResponse containing matches and total count
    """
    try:
        index_name = os.getenv("OPENSEARCH_INDEX", "ecoinvent")
        matches = client.find_matches(
            index_name=index_name,
            search_term=request.search_term,
            min_score=request.min_score,
            size=request.size,
        )

        return SearchResponse(matches=matches, total=len(matches))

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching products: {str(e)}"
        )
