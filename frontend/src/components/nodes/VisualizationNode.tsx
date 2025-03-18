import { BarChartOutlined, FileTextOutlined } from "@ant-design/icons";
import React, { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import "./NodeStyles.css";

const VisualizationNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="custom-node visualization-node">
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ top: -8, background: "#4096ff" }}
      />
      <div className="node-header">
        <span className="node-icon">
          {data.type === "report" ? <FileTextOutlined /> : <BarChartOutlined />}
        </span>
        <span className="node-type">可视化</span>
      </div>
      <div className="node-content">
        <div className="node-title">{data.label}</div>
        <div className="node-detail">
          {data.type === "chart" && data.chartType && (
            <small>{data.chartType} 图表</small>
          )}
          {data.type === "report" && (
            <small>输出格式: {data.format || "PDF"}</small>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(VisualizationNode);
