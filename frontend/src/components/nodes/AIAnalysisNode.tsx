import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import './NodeStyles.css';

const AIAnalysisNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="custom-node ai-analysis-node">
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ top: -8, background: '#4096ff' }}
      />
      <div className="node-header">
        <span className="node-icon"><RobotOutlined /></span>
        <span className="node-type">AI分析</span>
      </div>
      <div className="node-content">
        <div className="node-title">{data.label}</div>
        <div className="node-detail">
          {data.modelName && (
            <small>
              <ThunderboltOutlined /> {data.modelName}
            </small>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ bottom: -8, background: '#4096ff' }}
      />
    </div>
  );
};

export default memo(AIAnalysisNode); 