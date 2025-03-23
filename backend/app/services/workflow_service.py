from typing import List, Optional
from uuid import UUID

from app.core.supabase import get_supabase_client
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowNodeCreate,
    WorkflowEdgeCreate,
    WorkflowNodeUpdate,
    WorkflowEdgeUpdate,
    Workflow
)


def get_workflow_by_id(workflow_id: UUID, user_id: UUID) -> Optional[dict]:
    """Get workflow by ID"""
    supabase = get_supabase_client()
    
    # Get workflow
    workflow_response = supabase.table('workflows').select('*').eq('id', str(workflow_id)).single().execute()
    if not workflow_response.data:
        return None
        
    result = workflow_response.data
    result['id'] = str(result['id'])
    result['user_id'] = str(result['user_id'])
    
    # Get nodes
    nodes_response = supabase.table('workflow_nodes').select('*').eq('workflow_id', str(workflow_id)).execute()
    nodes = []
    for node in nodes_response.data:
        node['id'] = str(node['id'])
        node['workflow_id'] = str(node['workflow_id'])
        nodes.append(node)
    result['nodes'] = nodes
    
    # Get edges
    edges_response = supabase.table('workflow_edges').select('*').eq('workflow_id', str(workflow_id)).execute()
    edges = []
    for edge in edges_response.data:
        edge['id'] = str(edge['id'])
        edge['workflow_id'] = str(edge['workflow_id'])
        edges.append(edge)
    result['edges'] = edges
    
    return result


def get_user_workflows(user_id: UUID, skip: int = 0, limit: int = 100) -> List[dict]:
    """Get all workflows for user"""
    supabase = get_supabase_client()
    
    # Get workflows
    workflows_response = supabase.table('workflows').select('*').eq('user_id', str(user_id)).range(skip, skip + limit).execute()
    
    results = []
    for workflow in workflows_response.data:
        workflow['id'] = str(workflow['id'])
        workflow['user_id'] = str(workflow['user_id'])
        
        # Get nodes for this workflow
        nodes_response = supabase.table('workflow_nodes').select('*').eq('workflow_id', workflow['id']).execute()
        nodes = []
        for node in nodes_response.data:
            node['id'] = str(node['id'])
            node['workflow_id'] = str(node['workflow_id'])
            nodes.append(node)
        workflow['nodes'] = nodes
        
        # Get edges for this workflow
        edges_response = supabase.table('workflow_edges').select('*').eq('workflow_id', workflow['id']).execute()
        edges = []
        for edge in edges_response.data:
            edge['id'] = str(edge['id'])
            edge['workflow_id'] = str(edge['workflow_id'])
            edges.append(edge)
        workflow['edges'] = edges
        
        results.append(workflow)
    
    return results


def create_workflow(workflow: WorkflowCreate, user_id: UUID) -> dict:
    """Create new workflow"""
    supabase = get_supabase_client()
    
    # Prepare workflow data
    workflow_data = {
        'name': workflow.name,
        'description': workflow.description,
        'user_id': str(user_id),
        'data': workflow.data,
        'is_public': workflow.is_public,
        'total_carbon_footprint': workflow.total_carbon_footprint
    }
    
    # Create workflow
    workflow_response = supabase.table('workflows').insert(workflow_data).execute()
    if not workflow_response.data:
        raise ValueError("Failed to create workflow")
    
    result = workflow_response.data[0]
    result['id'] = str(result['id'])
    result['user_id'] = str(result['user_id'])
    workflow_id = result['id']
    
    # Create nodes if any
    nodes_data = []
    if workflow.nodes:
        for node in workflow.nodes:
            # Handle both dictionary and model cases
            if isinstance(node, dict):
                node_id = node.get('id') or node.get('node_id')
                node_type = node.get('type') or node.get('node_type')
                label = node.get('label', '')
                position = node.get('position', {})
                if isinstance(position, dict):
                    position_x = position.get('x', 0)
                    position_y = position.get('y', 0)
                else:
                    position_x = getattr(position, 'x', 0)
                    position_y = getattr(position, 'y', 0)
                data = node.get('data', {})
            else:
                node_id = getattr(node, 'id', None) or getattr(node, 'node_id', None)
                node_type = getattr(node, 'type', None) or getattr(node, 'node_type', None)
                label = getattr(node, 'label', '')
                position = getattr(node, 'position', {})
                if isinstance(position, dict):
                    position_x = position.get('x', 0)
                    position_y = position.get('y', 0)
                else:
                    position_x = getattr(position, 'x', 0)
                    position_y = getattr(position, 'y', 0)
                data = getattr(node, 'data', {})

            if not node_id:
                continue  # Skip nodes without an ID

            node_data = {
                'workflow_id': workflow_id,
                'node_id': str(node_id),
                'node_type': node_type or 'default',
                'label': label,
                'position_x': position_x,
                'position_y': position_y,
                'data': data
            }
            nodes_data.append(node_data)
        
        if nodes_data:
            nodes_response = supabase.table('workflow_nodes').insert(nodes_data).execute()
            # Convert IDs to strings in node response
            nodes = []
            for node in nodes_response.data:
                node['id'] = str(node['id'])
                node['workflow_id'] = str(node['workflow_id'])
                nodes.append(node)
            result['nodes'] = nodes
    else:
        result['nodes'] = []
    
    # Create edges if any
    edges_data = []
    if workflow.edges:
        for edge in workflow.edges:
            # Handle both dictionary and model cases
            if isinstance(edge, dict):
                edge_id = edge.get('id') or edge.get('edge_id')
                source = edge.get('source')
                target = edge.get('target')
            else:
                edge_id = getattr(edge, 'id', None) or getattr(edge, 'edge_id', None)
                source = getattr(edge, 'source', None)
                target = getattr(edge, 'target', None)

            if not edge_id or not source or not target:
                continue  # Skip edges without required fields

            edge_data = {
                'workflow_id': workflow_id,
                'edge_id': str(edge_id),
                'source': str(source),
                'target': str(target)
            }
            edges_data.append(edge_data)
        
        if edges_data:
            edges_response = supabase.table('workflow_edges').insert(edges_data).execute()
            # Convert IDs to strings in edge response
            edges = []
            for edge in edges_response.data:
                edge['id'] = str(edge['id'])
                edge['workflow_id'] = str(edge['workflow_id'])
                edges.append(edge)
            result['edges'] = edges
    else:
        result['edges'] = []
    
    return result


def update_workflow(workflow_id: UUID, workflow_data: WorkflowUpdate, user_id: UUID) -> Optional[dict]:
    """Update workflow"""
    supabase = get_supabase_client()
    
    # Check if workflow exists and belongs to user
    existing = supabase.table('workflows').select('*').eq('id', str(workflow_id)).eq('user_id', str(user_id)).single().execute()
    if not existing.data:
        return None
    
    # Update workflow
    update_data = {k: v for k, v in workflow_data.dict(exclude_unset=True).items() 
                  if k not in ('nodes', 'edges')}
    
    workflow_response = supabase.table('workflows').update(update_data).eq('id', str(workflow_id)).execute()
    if not workflow_response.data:
        return None
        
    result = workflow_response.data[0]
    result['id'] = str(result['id'])
    result['user_id'] = str(result['user_id'])
    
    # Update nodes if provided
    if workflow_data.nodes is not None:
        # Delete existing nodes
        supabase.table('workflow_nodes').delete().eq('workflow_id', str(workflow_id)).execute()
        
        # Create new nodes
        nodes_data = []
        for node in workflow_data.nodes:
            # Handle both dictionary and model cases
            if isinstance(node, dict):
                node_id = node.get('id') or node.get('node_id')
                node_type = node.get('type') or node.get('node_type')
                label = node.get('label', '')
                position = node.get('position', {})
                if isinstance(position, dict):
                    position_x = position.get('x', 0)
                    position_y = position.get('y', 0)
                else:
                    position_x = getattr(position, 'x', 0)
                    position_y = getattr(position, 'y', 0)
                data = node.get('data', {})
            else:
                node_id = getattr(node, 'id', None) or getattr(node, 'node_id', None)
                node_type = getattr(node, 'type', None) or getattr(node, 'node_type', None)
                label = getattr(node, 'label', '')
                position = getattr(node, 'position', {})
                if isinstance(position, dict):
                    position_x = position.get('x', 0)
                    position_y = position.get('y', 0)
                else:
                    position_x = getattr(position, 'x', 0)
                    position_y = getattr(position, 'y', 0)
                data = getattr(node, 'data', {})

            if not node_id:
                continue  # Skip nodes without an ID

            node_data = {
                'workflow_id': str(workflow_id),
                'node_id': str(node_id),
                'node_type': node_type or 'default',
                'label': label,
                'position_x': position_x,
                'position_y': position_y,
                'data': data
            }
            nodes_data.append(node_data)
        
        if nodes_data:
            nodes_response = supabase.table('workflow_nodes').insert(nodes_data).execute()
            # Convert IDs to strings in node response
            nodes = []
            for node in nodes_response.data:
                node['id'] = str(node['id'])
                node['workflow_id'] = str(node['workflow_id'])
                nodes.append(node)
            result['nodes'] = nodes
        else:
            result['nodes'] = []
    else:
        # Get existing nodes
        nodes_response = supabase.table('workflow_nodes').select('*').eq('workflow_id', str(workflow_id)).execute()
        nodes = []
        for node in nodes_response.data:
            node['id'] = str(node['id'])
            node['workflow_id'] = str(node['workflow_id'])
            nodes.append(node)
        result['nodes'] = nodes
    
    # Update edges if provided
    if workflow_data.edges is not None:
        # Delete existing edges
        supabase.table('workflow_edges').delete().eq('workflow_id', str(workflow_id)).execute()
        
        # Create new edges
        edges_data = []
        for edge in workflow_data.edges:
            # Handle both dictionary and model cases
            if isinstance(edge, dict):
                edge_id = edge.get('id') or edge.get('edge_id')
                source = edge.get('source')
                target = edge.get('target')
            else:
                edge_id = getattr(edge, 'id', None) or getattr(edge, 'edge_id', None)
                source = getattr(edge, 'source', None)
                target = getattr(edge, 'target', None)

            if not edge_id or not source or not target:
                continue  # Skip edges without required fields

            edge_data = {
                'workflow_id': str(workflow_id),
                'edge_id': str(edge_id),
                'source': str(source),
                'target': str(target)
            }
            edges_data.append(edge_data)
        
        if edges_data:
            edges_response = supabase.table('workflow_edges').insert(edges_data).execute()
            # Convert IDs to strings in edge response
            edges = []
            for edge in edges_response.data:
                edge['id'] = str(edge['id'])
                edge['workflow_id'] = str(edge['workflow_id'])
                edges.append(edge)
            result['edges'] = edges
        else:
            result['edges'] = []
    else:
        # Get existing edges
        edges_response = supabase.table('workflow_edges').select('*').eq('workflow_id', str(workflow_id)).execute()
        edges = []
        for edge in edges_response.data:
            edge['id'] = str(edge['id'])
            edge['workflow_id'] = str(edge['workflow_id'])
            edges.append(edge)
        result['edges'] = edges
    
    return result


def delete_workflow(workflow_id: UUID, user_id: UUID) -> bool:
    """Delete workflow"""
    supabase = get_supabase_client()
    
    # Delete nodes and edges first (they will be cascade deleted, but let's be explicit)
    supabase.table('workflow_nodes').delete().eq('workflow_id', str(workflow_id)).execute()
    supabase.table('workflow_edges').delete().eq('workflow_id', str(workflow_id)).execute()
    
    # Delete workflow
    response = supabase.table('workflows').delete().eq('id', str(workflow_id)).eq('user_id', str(user_id)).execute()
    return bool(response.data)


def calculate_carbon_footprint(workflow_id: UUID) -> float:
    """Calculate total carbon footprint for workflow"""
    # This is a placeholder implementation
    # TODO: Implement actual carbon footprint calculation logic
    return 0.0


def create_workflow_node(node: WorkflowNodeCreate, workflow_id: UUID) -> dict:
    """Create a new workflow node"""
    supabase = get_supabase_client()
    node_data = node.model_dump()
    node_data['workflow_id'] = str(workflow_id)
    response = supabase.table('workflow_nodes').insert(node_data).execute()
    result = response.data[0]
    result['id'] = str(result['id']) if result.get('id') else None
    result['workflow_id'] = str(result['workflow_id']) if result.get('workflow_id') else None
    return result


def update_workflow_node(node_id: UUID, node_data: WorkflowNodeUpdate) -> Optional[dict]:
    """Update workflow node"""
    supabase = get_supabase_client()
    update_data = node_data.model_dump(exclude_unset=True)
    response = supabase.table('workflow_nodes').update(update_data).eq('id', str(node_id)).execute()
    if not response.data:
        return None
    result = response.data[0]
    result['id'] = str(result['id']) if result.get('id') else None
    result['workflow_id'] = str(result['workflow_id']) if result.get('workflow_id') else None
    return result


def create_workflow_edge(edge: WorkflowEdgeCreate, workflow_id: UUID) -> dict:
    """Create a new workflow edge"""
    supabase = get_supabase_client()
    edge_data = edge.model_dump()
    edge_data['workflow_id'] = str(workflow_id)
    response = supabase.table('workflow_edges').insert(edge_data).execute()
    result = response.data[0]
    result['id'] = str(result['id']) if result.get('id') else None
    result['workflow_id'] = str(result['workflow_id']) if result.get('workflow_id') else None
    return result


def update_workflow_edge(edge_id: UUID, edge_data: WorkflowEdgeUpdate) -> Optional[dict]:
    """Update workflow edge"""
    supabase = get_supabase_client()
    update_data = edge_data.model_dump(exclude_unset=True)
    response = supabase.table('workflow_edges').update(update_data).eq('id', str(edge_id)).execute()
    if not response.data:
        return None
    result = response.data[0]
    result['id'] = str(result['id']) if result.get('id') else None
    result['workflow_id'] = str(result['workflow_id']) if result.get('workflow_id') else None
    return result
