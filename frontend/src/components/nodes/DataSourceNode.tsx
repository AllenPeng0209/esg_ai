import { ApiOutlined, DatabaseOutlined, FileOutlined } from "@ant-design/icons";
import React, { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import "./NodeStyles.css";

const getIcon = (type: string) => {
  switch (type) {
    case "csv":
      return <FileOutlined />;
    case "api":
      return <ApiOutlined />;
    case "database":
      return <DatabaseOutlined />;
    default:
      return <FileOutlined />;
  }
};

const DataSourceNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="custom-node data-source-node">
      <div className="node-header">
        <span className="node-icon">{getIcon(data.type)}</span>
        <span className="node-type">数据源</span>
      </div>
      <div className="node-content">
        <div className="node-title">{data.label}</div>
        <div className="node-detail">
          {data.type === "api" && data.config?.url && (
            <small>{data.config.url}</small>
          )}
          {data.type === "csv" && data.config?.path && (
            <small>{data.config.path}</small>
          )}
          {data.type === "database" && data.config?.connection && (
            <small>{data.config.connection}</small>
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

export default memo(DataSourceNode);
