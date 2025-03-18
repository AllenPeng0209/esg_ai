from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.workflow import Workflow, WorkflowEdge, WorkflowNode
from app.schemas.workflow import EdgeCreate, NodeCreate, WorkflowCreate, WorkflowUpdate


def get_workflow_by_id(
    db: Session, workflow_id: int, user_id: Optional[int] = None
) -> Optional[Workflow]:
    """获取工作流，可选择只获取特定用户的工作流"""
    query = db.query(Workflow).filter(Workflow.id == workflow_id)
    if user_id:
        query = query.filter(Workflow.user_id == user_id)
    return query.first()


def get_user_workflows(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> List[Workflow]:
    """获取用户的所有工作流"""
    return (
        db.query(Workflow)
        .filter(Workflow.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_workflow(db: Session, workflow: WorkflowCreate, user_id: int) -> Workflow:
    """创建新工作流"""
    db_workflow = Workflow(
        name=workflow.name,
        description=workflow.description,
        user_id=user_id,
        data=workflow.data or {},
        is_public=workflow.is_public,
        total_carbon_footprint=0.0,  # 初始值
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)

    # 创建节点
    if workflow.nodes:
        for node_data in workflow.nodes:
            create_node(db, node_data, db_workflow.id)

    # 创建边
    if workflow.edges:
        for edge_data in workflow.edges:
            create_edge(db, edge_data, db_workflow.id)

    return db_workflow


def update_workflow(
    db: Session, workflow_id: int, workflow_data: WorkflowUpdate, user_id: int
) -> Optional[Workflow]:
    """更新工作流"""
    db_workflow = get_workflow_by_id(db, workflow_id, user_id)
    if not db_workflow:
        return None

    # 更新基本属性
    update_data = workflow_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key not in ("nodes", "edges"):
            setattr(db_workflow, key, value)

    # 如果要更新节点，先删除现有节点
    if "nodes" in update_data:
        db.query(WorkflowNode).filter(WorkflowNode.workflow_id == workflow_id).delete()
        for node_data in update_data["nodes"]:
            create_node(db, NodeCreate(**node_data), workflow_id)

    # 如果要更新边，先删除现有边
    if "edges" in update_data:
        db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == workflow_id).delete()
        for edge_data in update_data["edges"]:
            create_edge(db, EdgeCreate(**edge_data), workflow_id)

    db.commit()
    db.refresh(db_workflow)
    return db_workflow


def delete_workflow(db: Session, workflow_id: int, user_id: int) -> bool:
    """删除工作流"""
    db_workflow = get_workflow_by_id(db, workflow_id, user_id)
    if not db_workflow:
        return False

    db.delete(db_workflow)
    db.commit()
    return True


def create_node(db: Session, node: NodeCreate, workflow_id: int) -> WorkflowNode:
    """创建节点"""
    db_node = WorkflowNode(
        node_id=node.node_id,
        workflow_id=workflow_id,
        node_type=node.node_type,
        label=node.label,
        position_x=node.position_x,
        position_y=node.position_y,
        data=node.data,
    )
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node


def create_edge(db: Session, edge: EdgeCreate, workflow_id: int) -> WorkflowEdge:
    """创建边"""
    db_edge = WorkflowEdge(
        edge_id=edge.edge_id,
        workflow_id=workflow_id,
        source=edge.source,
        target=edge.target,
    )
    db.add(db_edge)
    db.commit()
    db.refresh(db_edge)
    return db_edge


def calculate_carbon_footprint(db: Session, workflow_id: int) -> float:
    """计算工作流的总碳足迹"""
    # 这里实现碳足迹计算逻辑，基于工作流中的节点数据
    # 例子：将所有节点的碳足迹值相加
    nodes = db.query(WorkflowNode).filter(WorkflowNode.workflow_id == workflow_id).all()
    total_carbon_footprint = sum(node.data.get("carbonFootprint", 0) for node in nodes)

    # 更新工作流的总碳足迹
    workflow = get_workflow_by_id(db, workflow_id)
    if workflow:
        workflow.total_carbon_footprint = total_carbon_footprint
        db.commit()

    return total_carbon_footprint
