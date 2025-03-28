from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.core.config import settings
from app.opensearch.client import OpenSearchClient

router = APIRouter()


class SearchRequest(BaseModel):
    search_term: str
    min_score: float = 0.5
    size: int = 10


class SearchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    total: int


@router.post("/search", response_model=SearchResponse)
async def search_ecoinvent(request: SearchRequest):
    """
    Search the ecoinvent database using OpenSearch.

    Args:
        request: SearchRequest containing search term and parameters

    Returns:
        SearchResponse containing matching documents and total count
    """
    try:
        # Initialize OpenSearch client
        client = OpenSearchClient(
            host=settings.OPENSEARCH_HOST,
            port=settings.OPENSEARCH_PORT,
            username=settings.OPENSEARCH_USER,
            password=settings.OPENSEARCH_PASSWORD,
        )

        # Perform search
        results = client.find_matches(
            index_name="ecoinvent",
            search_term=request.search_term,
            min_score=request.min_score,
            size=request.size,
        )

        return SearchResponse(matches=results, total=len(results))

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching OpenSearch: {str(e)}"
        )
