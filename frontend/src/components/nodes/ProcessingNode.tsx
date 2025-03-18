import { FilterOutlined } from "@ant-design/icons";
import React, { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import "./NodeStyles.css";

const ProcessingNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="custom-node processing-node">
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ top: -8, background: "#4096ff" }}
      />
      <div className="node-header">
        <span className="node-icon">
          <FilterOutlined />
        </span>
        <span className="node-type">数据处理</span>
      </div>
      <div className="node-content">
        <div className="node-title">{data.label}</div>
        <div className="node-detail">
          {data.processingSteps && (
            <small>{data.processingSteps.length} 个处理步骤</small>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ bottom: -8, background: "#4096ff" }}
      />
    </div>
  );
};

export default memo(ProcessingNode);
