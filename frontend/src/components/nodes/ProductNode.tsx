import { Card, Tooltip, Typography } from "antd";
import React from "react";
import { Handle, NodeProps, Position } from "reactflow";
import "./ProductNode.css";

const { Text } = Typography;

// 定义产品节点数据类型
interface ProductData {
  label: string;
  productName: string;
  weight: number;
  carbonFootprint: number;
  dataSource: string;
  lifecycleStage: string;
  emissionFactor?: string;
  calculationMethod: string;
  uncertainty?: string;
  verificationStatus: string;
  applicableStandard: string;
  completionStatus?: "completed" | "ai-supplemented" | "manual-required"; // 完成状态
  uncertaintyPercentage?: number; // 新增：不确定性百分比
  carbonFactor?: number; // 新增：碳排放因子 (kgCO2e/kg)

  // 生产制造阶段特定字段
  energyConsumption?: number; // 能源消耗 (kWh)
  energyType?: string; // 能源类型 (电力、天然气、煤等)
  processEfficiency?: number; // 工艺效率 (%)
  wasteGeneration?: number; // 废物产生量 (kg)
  waterConsumption?: number; // 水资源消耗 (L)

  // 分销和储存阶段特定字段
  transportationMode?: string; // 运输方式 (公路、铁路、海运、空运)
  transportationDistance?: number; // 运输距离 (km)
  packagingWeight?: number; // 包装重量 (kg)

  // 产品使用阶段特定字段
  lifespan?: number; // 产品寿命 (years)
  energyConsumptionPerUse?: number; // 每次使用能源消耗 (kWh)
  usageFrequency?: number; // 使用频率 (次数/年)

  // 废弃处置阶段特定字段
  recyclingRate?: number; // 回收率 (%)
  landfillPercentage?: number; // 填埋比例 (%)
  disposalMethod?: string; // 处置方法
}

// 生命周期阶段映射到CSS类
const stageToClass: Record<string, string> = {
  原材料: "raw-material",
  生产制造: "production",
  分销和储存: "distribution",
  产品使用: "usage",
  废弃处置: "disposal",
  全生命周期: "",
};

// 完成状态映射到CSS类
const statusToClass: Record<string, string> = {
  completed: "status-green",
  "ai-supplemented": "status-yellow",
  "manual-required": "status-red",
};

// 完成状态映射到中文
const statusToText: Record<string, string> = {
  completed: "完成",
  "ai-supplemented": "AI補充",
  "manual-required": "需人工補充",
};

// 使用ReactFlow的NodeProps类型，并指定我们的ProductData类型
const ProductNode: React.FC<NodeProps<ProductData>> = ({ data }) => {
  const lifecycleClass = stageToClass[data.lifecycleStage] || "";
  // 如果未设置完成状态，默认为'manual-required'
  const completionStatus = data.completionStatus || "manual-required";
  const statusClass = statusToClass[completionStatus];
  const statusText = statusToText[completionStatus];

  // 渲染阶段特定信息
  const renderLifecycleSpecificInfo = () => {
    switch (data.lifecycleStage) {
      case "生产制造":
        return (
          <>
            {data.energyConsumption !== undefined && (
              <Tooltip title="能源消耗">
                <div className="product-info-item">
                  <Text type="secondary">能耗:</Text>
                  <Text>{data.energyConsumption} kWh</Text>
                </div>
              </Tooltip>
            )}
            {data.energyType && (
              <Tooltip title="能源类型">
                <div className="product-info-item">
                  <Text type="secondary">能源:</Text>
                  <Text>{data.energyType}</Text>
                </div>
              </Tooltip>
            )}
            {data.processEfficiency !== undefined && (
              <Tooltip title="工艺效率">
                <div className="product-info-item">
                  <Text type="secondary">效率:</Text>
                  <Text>{data.processEfficiency}%</Text>
                </div>
              </Tooltip>
            )}
          </>
        );

      case "分销和储存":
        return (
          <>
            {data.transportationMode && (
              <Tooltip title="运输方式">
                <div className="product-info-item">
                  <Text type="secondary">运输:</Text>
                  <Text>{data.transportationMode}</Text>
                </div>
              </Tooltip>
            )}
            {data.transportationDistance !== undefined && (
              <Tooltip title="运输距离">
                <div className="product-info-item">
                  <Text type="secondary">距离:</Text>
                  <Text>{data.transportationDistance} km</Text>
                </div>
              </Tooltip>
            )}
            {data.packagingWeight !== undefined && (
              <Tooltip title="包装重量">
                <div className="product-info-item">
                  <Text type="secondary">包装:</Text>
                  <Text>{data.packagingWeight} kg</Text>
                </div>
              </Tooltip>
            )}
          </>
        );

      case "产品使用":
        return (
          <>
            {data.lifespan !== undefined && (
              <Tooltip title="产品寿命">
                <div className="product-info-item">
                  <Text type="secondary">寿命:</Text>
                  <Text>{data.lifespan} 年</Text>
                </div>
              </Tooltip>
            )}
            {data.energyConsumptionPerUse !== undefined && (
              <Tooltip title="每次使用能源消耗">
                <div className="product-info-item">
                  <Text type="secondary">单次能耗:</Text>
                  <Text>{data.energyConsumptionPerUse} kWh</Text>
                </div>
              </Tooltip>
            )}
            {data.usageFrequency !== undefined && (
              <Tooltip title="使用频率">
                <div className="product-info-item">
                  <Text type="secondary">频率:</Text>
                  <Text>{data.usageFrequency} 次/年</Text>
                </div>
              </Tooltip>
            )}
          </>
        );

      case "废弃处置":
        return (
          <>
            {data.recyclingRate !== undefined && (
              <Tooltip title="回收率">
                <div className="product-info-item">
                  <Text type="secondary">回收率:</Text>
                  <Text>{data.recyclingRate}%</Text>
                </div>
              </Tooltip>
            )}
            {data.landfillPercentage !== undefined && (
              <Tooltip title="填埋比例">
                <div className="product-info-item">
                  <Text type="secondary">填埋:</Text>
                  <Text>{data.landfillPercentage}%</Text>
                </div>
              </Tooltip>
            )}
            {data.disposalMethod && (
              <Tooltip title="处置方法">
                <div className="product-info-item">
                  <Text type="secondary">处置:</Text>
                  <Text>{data.disposalMethod}</Text>
                </div>
              </Tooltip>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="product-node">
      <Handle type="target" position={Position.Top} />
      {lifecycleClass && (
        <div className={`lifecycle-tag ${lifecycleClass}`}>
          {data.lifecycleStage}
        </div>
      )}
      <Card
        title={data.productName || "產品"}
        className={`product-card ${statusClass}`}
        size="small"
      >
        <div className="product-info-grid">
          <Tooltip title="产品碳足迹">
            <div className="product-info-item">
              <Text type="secondary">碳足迹:</Text>
              <Text strong>{data.carbonFootprint} kgCO₂e</Text>
            </div>
          </Tooltip>

          <Tooltip title="产品重量">
            <div className="product-info-item">
              <Text type="secondary">重量:</Text>
              <Text>{data.weight} kg</Text>
            </div>
          </Tooltip>

          {/* 添加碳排放因子显示 */}
          {data.carbonFactor !== undefined && (
            <Tooltip title="碳排放因子">
              <div className="product-info-item">
                <Text type="secondary">碳因子:</Text>
                <Text>{data.carbonFactor} kgCO₂e/kg</Text>
              </div>
            </Tooltip>
          )}

          {/* 渲染阶段特定信息 */}
          {renderLifecycleSpecificInfo()}

          <Tooltip title="数据来源">
            <div className="product-info-item">
              <Text type="secondary">数据源:</Text>
              <Text>{data.dataSource}</Text>
            </div>
          </Tooltip>

          {/* 完成状态指示器 */}
          <Tooltip title="完成状态">
            <div className="product-info-item">
              <Text type="secondary">狀態:</Text>
              <div className="status">
                <div className={`status-indicator ${statusText}`}></div>
                <Text>{statusText}</Text>
              </div>
            </div>
          </Tooltip>

          {/* 添加不确定性百分比显示 */}
          {data.uncertaintyPercentage !== undefined && (
            <Tooltip title="AI生成数据的不确定性">
              <div className="product-info-item uncertainty">
                <Text type="secondary">不确定性:</Text>
                <Text
                  type={
                    data.uncertaintyPercentage > 50
                      ? "danger"
                      : data.uncertaintyPercentage > 25
                        ? "warning"
                        : "success"
                  }
                >
                  {data.uncertaintyPercentage}%
                </Text>
              </div>
            </Tooltip>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default ProductNode;
