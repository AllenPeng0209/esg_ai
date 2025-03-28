from datetime import datetime
from typing import Dict, List, Optional, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict, validator, Field


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    data: Dict = Field(default_factory=dict)
    nodes: List[Dict] = Field(default_factory=list)
    edges: List[Dict] = Field(default_factory=list)
    is_public: bool = False
    total_carbon_footprint: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(WorkflowBase):
    name: Optional[str] = None
    data: Optional[Dict] = None


class WorkflowNodeBase(BaseModel):
    node_id: str
    node_type: str
    label: str
    position_x: float
    position_y: float
    data: Dict = {}

    model_config = ConfigDict(from_attributes=True)


class WorkflowNodeCreate(WorkflowNodeBase):
    workflow_id: Union[UUID, str]

    @validator("workflow_id")
    def validate_workflow_id(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v


class WorkflowNodeUpdate(WorkflowNodeBase):
    node_id: Optional[str] = None
    node_type: Optional[str] = None
    label: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    data: Optional[Dict] = None


class WorkflowEdgeBase(BaseModel):
    edge_id: str
    source: str
    target: str

    model_config = ConfigDict(from_attributes=True)


class WorkflowEdgeCreate(WorkflowEdgeBase):
    workflow_id: Union[UUID, str]

    @validator("workflow_id")
    def validate_workflow_id(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v


class WorkflowEdgeUpdate(WorkflowEdgeBase):
    edge_id: Optional[str] = None
    source: Optional[str] = None
    target: Optional[str] = None


class WorkflowNode(WorkflowNodeBase):
    id: Union[UUID, str]
    workflow_id: Union[UUID, str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    @validator("id", "workflow_id")
    def validate_uuids(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v


class WorkflowEdge(WorkflowEdgeBase):
    id: Union[UUID, str]
    workflow_id: Union[UUID, str]
    created_at: datetime

    @validator("id", "workflow_id")
    def validate_uuids(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v


class Workflow(WorkflowBase):
    id: Union[UUID, str]
    user_id: Union[UUID, str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []

    @validator("id", "user_id")
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True
        json_encoders = {UUID: str}
