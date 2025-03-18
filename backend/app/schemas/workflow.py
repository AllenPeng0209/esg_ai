from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class NodeBase(BaseModel):
    node_id: str
    node_type: str
    label: str
    position_x: float
    position_y: float
    data: Dict[str, Any] = {}


class NodeCreate(NodeBase):
    pass


class Node(NodeBase):
    id: int
    workflow_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EdgeBase(BaseModel):
    edge_id: str
    source: str
    target: str


class EdgeCreate(EdgeBase):
    pass


class Edge(EdgeBase):
    id: int
    workflow_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    data: Dict[str, Any] = {}


class WorkflowCreate(WorkflowBase):
    nodes: Optional[List[NodeCreate]] = None
    edges: Optional[List[EdgeCreate]] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    data: Optional[Dict[str, Any]] = None
    nodes: Optional[List[NodeCreate]] = None
    edges: Optional[List[EdgeCreate]] = None


class Workflow(WorkflowBase):
    id: int
    user_id: int
    total_carbon_footprint: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    nodes: List[Node] = []
    edges: List[Edge] = []

    class Config:
        from_attributes = True
