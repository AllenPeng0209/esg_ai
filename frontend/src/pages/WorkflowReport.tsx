import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  InfoCircleFilled,
  WarningFilled,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Layout,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Alert,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edge, Node } from "reactflow";
import ErrorBoundary from "../components/ErrorBoundary";
import safeRender, { safeRenderError } from "../utils/safeRender";
import "./WorkflowReport.css";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

// 安全数据渲染函数 - 用于避免直接渲染对象
const SafeData = ({
  data,
  fallback = "-",
}: {
  data: any;
  fallback?: React.ReactNode;
}) => {
  return <>{safeRender(data) || fallback}</>;
};

// 安全地转换值为Statistic组件支持的类型
const safeStatisticValue = (value: any, defaultValue: number): number => {
  if (value === undefined || value === null) return defaultValue;

  // 确保返回数字类型
  const numValue = Number(value);
  return isNaN(numValue) ? defaultValue : numValue;
};

// 在文件顶部添加以下接口定义
interface StageEmission {
  carbonFootprint: number;
  percentage: number;
  nodesCount: number;
}

interface TrustScoreDimension {
  name: string;
  score: number;
  maxScore: number;
  status: "success" | "warning" | "error";
  feedback: string;
}

interface FinalProduct {
  id: string;
  name: string;
  totalCarbonFootprint: number;
  weight: number;
}

interface ReportData {
  workflowName: string;
  reportCreationTime: string;
  nodes: Node[];
  edges: Edge[];
  totalCarbonFootprint: number;
  totalWeight: number;
  carbonIntensity: number;
  dataCompleteness: number;
  primaryDataRate: number;
  verifiedDataRate: number;
  overallDataQuality: number;
  stageEmissions: Record<string, StageEmission>;
  carbonFactorSources: Record<string, number>;
  hotspotNodes: Array<{
    id: string;
    name: string;
    stage: string;
    carbonFootprint: number;
    percentage: number;
  }>;
  finalProduct: FinalProduct;
}

// 在文件顶部添加辅助函数
const getMaxEmissionStage = (
  emissions: Record<string, StageEmission> | undefined,
): string => {
  if (!emissions || typeof emissions !== "object") return "未知";

  try {
    const entries = Object.entries(emissions);
    if (!Array.isArray(entries) || entries.length === 0) return "未知";

    const validEntries = entries.filter(
      (entry): entry is [string, StageEmission] =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[1] === "object" &&
        entry[1] !== null &&
        "carbonFootprint" in entry[1],
    );

    if (validEntries.length === 0) return "未知";

    validEntries.sort(([, a], [, b]) => b.carbonFootprint - a.carbonFootprint);
    return validEntries[0][0];
  } catch {
    return "未知";
  }
};

const getMaxEmissionPercentage = (
  emissions: Record<string, StageEmission> | undefined,
): number => {
  if (!emissions || typeof emissions !== "object") return 0;

  try {
    const values = Object.values(emissions);
    if (!Array.isArray(values) || values.length === 0) return 0;

    const validValues = values.filter(
      (value): value is StageEmission =>
        typeof value === "object" &&
        value !== null &&
        "percentage" in value &&
        typeof value.percentage === "number",
    );

    if (validValues.length === 0) return 0;

    validValues.sort((a, b) => b.carbonFootprint - a.carbonFootprint);
    return Math.round(validValues[0].percentage);
  } catch {
    return 0;
  }
};

// 添加新的组件
const EmissionSummary: React.FC<{
  stageEmissions: Record<string, StageEmission>;
}> = ({ stageEmissions }) => {
  const maxStage = getMaxEmissionStage(stageEmissions);
  const maxPercentage = getMaxEmissionPercentage(stageEmissions);

  return (
    <Paragraph>
      该产品的碳足迹主要来源于{maxStage}阶段， 占总排放的{maxPercentage}%。
    </Paragraph>
  );
};

// 添加图表配置函数
const getLifecycleEmissionsChartOption = (
  stageEmissions: Record<string, StageEmission>,
): EChartsOption => {
  const data = Object.entries(stageEmissions).map(([stage, data]) => ({
    name: stage,
    value: data.carbonFootprint,
  }));

  return {
    title: {
      text: "生命周期阶段碳排放占比",
      left: "center",
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} kgCO₂e ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
    },
    series: [
      {
        name: "碳排放量",
        type: "pie",
        radius: "50%",
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
};

const getHotspotParetoChartOption = (hotspotNodes: any[]): EChartsOption => {
  const sortedNodes = [...hotspotNodes].sort(
    (a, b) => b.carbonFootprint - a.carbonFootprint,
  );
  const names = sortedNodes.map((node) => node.name);
  const values = sortedNodes.map((node) => node.carbonFootprint);

  // 计算累计百分比
  const total = values.reduce((sum, value) => sum + value, 0);
  let cumSum = 0;
  const cumPercentage = values.map((value) => {
    cumSum += value;
    return (cumSum / total) * 100;
  });

  return {
    title: {
      text: "碳排放热点帕累托图",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      data: ["碳排放量", "累计占比"],
      top: 30,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: names,
      axisLabel: {
        interval: 0,
        rotate: 45,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "碳排放量",
        axisLabel: {
          formatter: "{value} kgCO₂e",
        },
      },
      {
        type: "value",
        name: "累计占比",
        axisLabel: {
          formatter: "{value}%",
        },
        max: 100,
      },
    ],
    series: [
      {
        name: "碳排放量",
        type: "bar",
        data: values,
      },
      {
        name: "累计占比",
        type: "line",
        yAxisIndex: 1,
        data: cumPercentage,
        symbol: "circle",
        symbolSize: 8,
      },
    ],
  };
};

const getDataSourceDistributionChartOption = (
  carbonFactorSources: Record<string, number>,
): EChartsOption => {
  const data = Object.entries(carbonFactorSources).map(([source, count]) => ({
    name: source,
    value: count,
  }));

  return {
    title: {
      text: "数据来源分布",
      left: "center",
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: 30,
    },
    series: [
      {
        name: "数据来源",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "20",
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };
};

const getEmissionFactorQualityChartOption = (): EChartsOption => {
  return {
    title: {
      text: "排放因子质量评估",
      left: "center",
    },
    radar: {
      indicator: [
        { name: "时间相关性", max: 5 },
        { name: "地域相关性", max: 5 },
        { name: "技术相关性", max: 5 },
        { name: "数据准确度", max: 5 },
      ],
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [3, 2, 4, 3],
            name: "当前评分",
            areaStyle: {
              color: "rgba(0, 128, 0, 0.3)",
            },
          },
          {
            value: [5, 5, 5, 5],
            name: "目标水平",
            lineStyle: {
              type: "dashed",
            },
            areaStyle: {
              color: "rgba(255, 0, 0, 0.1)",
            },
          },
        ],
      },
    ],
  };
};

// 添加数据可追溯性分析的图表配置函数
const getEmissionContributionChartOption = (nodes: any[]): EChartsOption => {
  // 按碳排放量排序
  const sortedNodes = [...nodes]
    .filter((node) => node.data.carbonFootprint > 0)
    .sort((a, b) => b.data.carbonFootprint - a.data.carbonFootprint);

  const totalEmission = sortedNodes.reduce(
    (sum, node) => sum + node.data.carbonFootprint,
    0,
  );

  // 计算累计占比
  let cumSum = 0;
  const data = sortedNodes.map((node) => {
    const contribution = (node.data.carbonFootprint / totalEmission) * 100;
    cumSum += contribution;
    return {
      name: node.data.productName || node.data.label || "未命名",
      value: node.data.carbonFootprint,
      contribution,
      cumulative: cumSum,
    };
  });

  return {
    title: {
      text: "碳排放贡献占比分析",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      formatter: (params: any) => {
        const barData = params[0];
        const lineData = params[1];
        return `${barData.name}<br/>
                碳排放量: ${barData.value.toFixed(2)} kgCO₂e<br/>
                占比: ${barData.data.contribution.toFixed(1)}%<br/>
                累计占比: ${lineData.value.toFixed(1)}%`;
      },
    },
    legend: {
      data: ["碳排放量", "累计占比"],
      top: 30,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.map((item) => item.name),
      axisLabel: {
        interval: 0,
        rotate: 45,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "碳排放量",
        axisLabel: {
          formatter: "{value} kgCO₂e",
        },
      },
      {
        type: "value",
        name: "累计占比",
        axisLabel: {
          formatter: "{value}%",
        },
        max: 100,
      },
    ],
    series: [
      {
        name: "碳排放量",
        type: "bar",
        data: data.map((item) => ({
          value: item.value,
          contribution: item.contribution,
          cumulative: item.cumulative,
        })),
      },
      {
        name: "累计占比",
        type: "line",
        yAxisIndex: 1,
        data: data.map((item) => item.cumulative),
        symbol: "circle",
        symbolSize: 8,
        lineStyle: {
          width: 2,
        },
      },
    ],
  };
};

// 报告页面组件
const WorkflowReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    workflowName: "",
    reportCreationTime: "",
    nodes: [],
    edges: [],
    totalCarbonFootprint: 0,
    totalWeight: 0,
    carbonIntensity: 0,
    dataCompleteness: 0,
    primaryDataRate: 0,
    verifiedDataRate: 0,
    overallDataQuality: 0,
    stageEmissions: {},
    carbonFactorSources: {},
    hotspotNodes: [],
    finalProduct: {
      id: "",
      name: "",
      totalCarbonFootprint: 0,
      weight: 0,
    },
  });

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        const response = await fetch(`/api/v1/workflows/${id}/report`);
        if (!response.ok) {
          throw new Error("获取报告数据失败");
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error("获取报告数据失败:", err);
        setError(err instanceof Error ? err.message : "获取报告数据失败");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReportData();
    }
  }, [id]);

  const goBackToEditor = () => {
    navigate(`/workflow/${id}`);
  };

  const exportReportAsPDF = async () => {
    try {
      // TODO: Implement PDF export functionality
      console.log("导出报告为PDF...");
    } catch (err) {
      console.error("导出报告失败:", err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" tip="生成报告中，请稍候..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={goBackToEditor}>
              返回编辑器
            </Button>
          }
        />
      </div>
    );
  }

  // Safe access to arrays with null checks
  const nodes = reportData?.nodes || [];
  const edges = reportData?.edges || [];
  const hotspotNodes = reportData?.hotspotNodes || [];
  const stageEmissions = reportData?.stageEmissions || {};
  const carbonFactorSources = reportData?.carbonFactorSources || {};

  return (
    <ErrorBoundary>
      <Layout className="workflow-report">
        <Header className="report-header">
          <Row justify="space-between" align="middle">
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={goBackToEditor}
                style={{ marginRight: 16 }}
              >
                返回编辑器
              </Button>
              <Title level={4} style={{ display: "inline-block", margin: 0 }}>
                {reportData.workflowName || "未命名工作流"} - 碳足迹报告
              </Title>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportReportAsPDF}
              >
                导出PDF
              </Button>
            </Col>
          </Row>
        </Header>

        <Content className="report-content">
          {/* Overview Section */}
          <Card title="概览" className="report-section">
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <Statistic
                  title="总碳足迹"
                  value={safeStatisticValue(reportData.totalCarbonFootprint, 0)}
                  suffix="kgCO₂e"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="碳强度"
                  value={safeStatisticValue(reportData.carbonIntensity, 0)}
                  suffix="kgCO₂e/kg"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="数据完整度"
                  value={safeStatisticValue(reportData.dataCompleteness, 0)}
                  suffix="%"
                  precision={0}
                />
              </Col>
            </Row>
          </Card>

          {/* Stage Emissions Section */}
          {Object.keys(stageEmissions).length > 0 && (
            <Card
              title="生命周期阶段分析"
              className="report-section"
              style={{ marginTop: 24 }}
            >
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <ReactECharts
                    option={getLifecycleEmissionsChartOption(stageEmissions)}
                    style={{ height: 300 }}
                  />
                </Col>
                <Col span={12}>
                  <Table
                    dataSource={Object.entries(stageEmissions).map(
                      ([stage, data]) => ({
                        key: stage,
                        stage,
                        carbonFootprint: data.carbonFootprint,
                        percentage: data.percentage,
                        nodesCount: data.nodesCount,
                      }),
                    )}
                    columns={[
                      { title: "生命周期阶段", dataIndex: "stage" },
                      {
                        title: "碳排放量 (kgCO₂e)",
                        dataIndex: "carbonFootprint",
                        render: (value) => value.toFixed(2),
                      },
                      {
                        title: "占比 (%)",
                        dataIndex: "percentage",
                        render: (value) => value.toFixed(1),
                      },
                      { title: "节点数量", dataIndex: "nodesCount" },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Rest of your existing sections */}
        </Content>
      </Layout>
    </ErrorBoundary>
  );
};

export default WorkflowReport;
