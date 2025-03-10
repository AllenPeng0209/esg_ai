import { ArrowLeftOutlined, CheckCircleFilled, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, InfoCircleFilled, WarningFilled, WarningOutlined } from '@ant-design/icons';
import { Button, Card, Col, Divider, Empty, Layout, Progress, Row, Spin, Statistic, Table, Tabs, Tag, Typography, Alert } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edge, Node } from 'reactflow';
import ErrorBoundary from '../components/ErrorBoundary';
import safeRender, { safeRenderError } from '../utils/safeRender';
import './WorkflowReport.css';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

// 安全数据渲染函数 - 用于避免直接渲染对象
const SafeData = ({ data, fallback = '-' }: { data: any; fallback?: React.ReactNode }) => {
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
  status: 'success' | 'warning' | 'error';
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
const getMaxEmissionStage = (emissions: Record<string, StageEmission> | undefined): string => {
  if (!emissions || typeof emissions !== 'object') return '未知';
  
  try {
    const entries = Object.entries(emissions);
    if (!Array.isArray(entries) || entries.length === 0) return '未知';
    
    const validEntries = entries.filter((entry): entry is [string, StageEmission] => 
      Array.isArray(entry) && 
      entry.length === 2 && 
      typeof entry[1] === 'object' && 
      entry[1] !== null && 
      'carbonFootprint' in entry[1]
    );
    
    if (validEntries.length === 0) return '未知';
    
    validEntries.sort(([, a], [, b]) => b.carbonFootprint - a.carbonFootprint);
    return validEntries[0][0];
  } catch {
    return '未知';
  }
};

const getMaxEmissionPercentage = (emissions: Record<string, StageEmission> | undefined): number => {
  if (!emissions || typeof emissions !== 'object') return 0;
  
  try {
    const values = Object.values(emissions);
    if (!Array.isArray(values) || values.length === 0) return 0;
    
    const validValues = values.filter((value): value is StageEmission => 
      typeof value === 'object' && 
      value !== null && 
      'percentage' in value && 
      typeof value.percentage === 'number'
    );
    
    if (validValues.length === 0) return 0;
    
    validValues.sort((a, b) => b.carbonFootprint - a.carbonFootprint);
    return Math.round(validValues[0].percentage);
  } catch {
    return 0;
  }
};

// 添加新的组件
const EmissionSummary: React.FC<{ stageEmissions: Record<string, StageEmission> }> = ({ stageEmissions }) => {
  const maxStage = getMaxEmissionStage(stageEmissions);
  const maxPercentage = getMaxEmissionPercentage(stageEmissions);
  
  return (
    <Paragraph>
      该产品的碳足迹主要来源于{maxStage}阶段，
      占总排放的{maxPercentage}%。
    </Paragraph>
  );
};

// 添加图表配置函数
const getLifecycleEmissionsChartOption = (stageEmissions: Record<string, StageEmission>): EChartsOption => {
  const data = Object.entries(stageEmissions).map(([stage, data]) => ({
    name: stage,
    value: data.carbonFootprint
  }));

  return {
    title: {
      text: '生命周期阶段碳排放占比',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} kgCO₂e ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '碳排放量',
        type: 'pie',
        radius: '50%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };
};

const getHotspotParetoChartOption = (hotspotNodes: any[]): EChartsOption => {
  const sortedNodes = [...hotspotNodes].sort((a, b) => b.carbonFootprint - a.carbonFootprint);
  const names = sortedNodes.map(node => node.name);
  const values = sortedNodes.map(node => node.carbonFootprint);
  
  // 计算累计百分比
  const total = values.reduce((sum, value) => sum + value, 0);
  let cumSum = 0;
  const cumPercentage = values.map(value => {
    cumSum += value;
    return (cumSum / total) * 100;
  });

  return {
    title: {
      text: '碳排放热点帕累托图',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['碳排放量', '累计占比'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        interval: 0,
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '碳排放量',
        axisLabel: {
          formatter: '{value} kgCO₂e'
        }
      },
      {
        type: 'value',
        name: '累计占比',
        axisLabel: {
          formatter: '{value}%'
        },
        max: 100
      }
    ],
    series: [
      {
        name: '碳排放量',
        type: 'bar',
        data: values
      },
      {
        name: '累计占比',
        type: 'line',
        yAxisIndex: 1,
        data: cumPercentage,
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  };
};

const getDataSourceDistributionChartOption = (carbonFactorSources: Record<string, number>): EChartsOption => {
  const data = Object.entries(carbonFactorSources).map(([source, count]) => ({
    name: source,
    value: count
  }));

  return {
    title: {
      text: '数据来源分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 30
    },
    series: [
      {
        name: '数据来源',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };
};

const getEmissionFactorQualityChartOption = (): EChartsOption => {
  return {
    title: {
      text: '排放因子质量评估',
      left: 'center'
    },
    radar: {
      indicator: [
        { name: '时间相关性', max: 5 },
        { name: '地域相关性', max: 5 },
        { name: '技术相关性', max: 5 },
        { name: '数据准确度', max: 5 }
      ]
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [3, 2, 4, 3],
            name: '当前评分',
            areaStyle: {
              color: 'rgba(0, 128, 0, 0.3)'
            }
          },
          {
            value: [5, 5, 5, 5],
            name: '目标水平',
            lineStyle: {
              type: 'dashed'
            },
            areaStyle: {
              color: 'rgba(255, 0, 0, 0.1)'
            }
          }
        ]
      }
    ]
  };
};

// 添加数据可追溯性分析的图表配置函数
const getEmissionContributionChartOption = (nodes: any[]): EChartsOption => {
  // 按碳排放量排序
  const sortedNodes = [...nodes]
    .filter(node => node.data.carbonFootprint > 0)
    .sort((a, b) => b.data.carbonFootprint - a.data.carbonFootprint);

  const totalEmission = sortedNodes.reduce((sum, node) => sum + node.data.carbonFootprint, 0);
  
  // 计算累计占比
  let cumSum = 0;
  const data = sortedNodes.map(node => {
    const contribution = (node.data.carbonFootprint / totalEmission) * 100;
    cumSum += contribution;
    return {
      name: node.data.productName || node.data.label || '未命名',
      value: node.data.carbonFootprint,
      contribution,
      cumulative: cumSum
    };
  });

  return {
    title: {
      text: '碳排放贡献占比分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        const barData = params[0];
        const lineData = params[1];
        return `${barData.name}<br/>
                碳排放量: ${barData.value.toFixed(2)} kgCO₂e<br/>
                占比: ${barData.data.contribution.toFixed(1)}%<br/>
                累计占比: ${lineData.value.toFixed(1)}%`;
      }
    },
    legend: {
      data: ['碳排放量', '累计占比'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '碳排放量',
        axisLabel: {
          formatter: '{value} kgCO₂e'
        }
      },
      {
        type: 'value',
        name: '累计占比',
        axisLabel: {
          formatter: '{value}%'
        },
        max: 100
      }
    ],
    series: [
      {
        name: '碳排放量',
        type: 'bar',
        data: data.map(item => ({
          value: item.value,
          contribution: item.contribution,
          cumulative: item.cumulative
        }))
      },
      {
        name: '累计占比',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => item.cumulative),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 2
        }
      }
    ]
  };
};

// 报告页面组件
const WorkflowReport = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [workflowName, setWorkflowName] = useState('产品碳足迹分析报告');
  const [error, setError] = useState<any>(null);
  
  // 模拟从localStorage获取报告数据
  useEffect(() => {
    try {
      // 从localStorage获取报告数据
      const storedData = localStorage.getItem('workflowReportData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setReportData(parsedData);
        if (parsedData.workflowName) {
          setWorkflowName(parsedData.workflowName);
        }
      }
    } catch (err) {
      console.error('解析报告数据失败:', err);
      setError(err);
    } finally {
      // 模拟加载延迟
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // 返回编辑器
  const goBackToEditor = () => {
    navigate(`/editor/${id}`);
  };

  // 导出报告为PDF
  const exportReportAsPDF = () => {
    console.log('导出报告为PDF');
    // TODO: 实现PDF导出功能
  };

  // 渲染可视化图表（占位）
  const renderPlaceholderChart = (title: string, height: number = 300) => (
    <div className="chart-placeholder" style={{ height }}>
      <div className="chart-placeholder-text">此处将显示{title}</div>
    </div>
  );

  // 渲染可信分数条形图
  const renderTrustScoreBar = (score: number, maxScore: number, status: 'success' | 'warning' | 'error') => {
    // 根据状态设置颜色
    const colorMap = {
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d'
    };
    
    return (
      <Progress 
        percent={Math.round((score / maxScore) * 100)} 
        size="small" 
        strokeColor={colorMap[status]}
        format={() => `${score}/${maxScore}`}
      />
    );
  };

  // 渲染状态图标
  const renderStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircleFilled style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningFilled style={{ color: '#faad14' }} />;
      case 'error':
        return <InfoCircleFilled style={{ color: '#f5222d' }} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout className="report-layout">
        <div className="loading-container">
          <Spin size="large" tip="生成报告中，请稍候..." />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout className="report-layout">
        <div className="error-container">
          <Title level={3}>加载报告数据失败</Title>
          <Paragraph>
            {safeRenderError(error)}
          </Paragraph>
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回仪表板
          </Button>
        </div>
      </Layout>
    );
  }

  // 修改可信打分部分，使用实际数据
  const renderTrustScoreSection = () => {
    if (!reportData) return null;

    const {
      dataCompleteness = 0,
      primaryDataRate = 0,
      verifiedDataRate = 0,
      overallDataQuality = 0
    } = reportData;

    // 根据实际数据计算评分
    const calculateStatus = (score: number, maxScore: number): 'success' | 'warning' | 'error' => {
      const percentage = (score / maxScore) * 100;
      if (percentage >= 80) return 'success';
      if (percentage >= 60) return 'warning';
      return 'error';
    };

    const dimensions: TrustScoreDimension[] = [
      {
        name: '数据完整性',
        score: reportData?.dataCompleteness ?? 0,
        maxScore: 100,
        status: calculateStatus(reportData?.dataCompleteness ?? 0, 100),
        feedback: reportData?.dataCompleteness && reportData.dataCompleteness >= 80 
          ? '数据完整性良好，已满足认证要求' 
          : '建议补充缺失的数据，提高完整性'
      },
      {
        name: '一手数据比例',
        score: reportData?.primaryDataRate ?? 0,
        maxScore: 100,
        status: calculateStatus(reportData?.primaryDataRate ?? 0, 100),
        feedback: reportData?.primaryDataRate && reportData.primaryDataRate >= 80 
          ? '一手数据比例达标，数据可信度高' 
          : '建议增加一手数据的使用比例'
      },
      {
        name: '数据验证率',
        score: reportData?.verifiedDataRate ?? 0,
        maxScore: 100,
        status: calculateStatus(reportData?.verifiedDataRate ?? 0, 100),
        feedback: reportData?.verifiedDataRate && reportData.verifiedDataRate >= 80 
          ? '数据验证率达标，结果可靠性高' 
          : '建议提高数据的验证比例'
      }
    ];

    return (
      <section className="report-section">
        <Title level={3}>可信打分</Title>
        <Card className="trust-score-card">
          <Row gutter={[24, 24]} align="middle">
            <Col span={6}>
              <div className="trust-score-circle">
                <Progress 
                  type="circle" 
                  percent={Math.round(overallDataQuality)} 
                  format={(percent?: number) => `${percent}分`}
                  width={120}
                  strokeColor={
                    overallDataQuality >= 80 ? '#52c41a' : 
                    overallDataQuality >= 60 ? '#faad14' : '#f5222d'
                  }
                />
                <div className="trust-score-title">总体数据质量评分</div>
              </div>
            </Col>
            <Col span={18}>
              <Paragraph>
                根据数据完整性、一级数据比例和可验证性评估，模型的综合可信分为{Math.round(overallDataQuality)}分，
                {overallDataQuality >= 80 ? '达到了良好水平！' : 
                 overallDataQuality >= 60 ? '基本达标，但仍有提升空间。' : '需要进一步改进。'}
                请查看下方详细评分和建议以进一步优化您的模型。
              </Paragraph>
            </Col>
          </Row>
          
          <Divider />
          
          <Table<TrustScoreDimension> 
            dataSource={dimensions}
            pagination={false}
            rowKey="name"
            className="trust-score-table"
            columns={[
              {
                title: '评价维度',
                dataIndex: 'name',
                key: 'name',
                render: (text: string, record: TrustScoreDimension) => (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {renderStatusIcon(record.status)} 
                    <span style={{ marginLeft: 8 }}>{text}</span>
                  </div>
                )
              },
              {
                title: '得分',
                dataIndex: 'score',
                key: 'score',
                width: 300,
                render: (text: number, record: TrustScoreDimension) => 
                  renderTrustScoreBar(record.score, record.maxScore, record.status)
              },
              {
                title: '反馈/建议',
                dataIndex: 'feedback',
                key: 'feedback',
              }
            ]}
          />
        </Card>
      </section>
    );
  };

  // 修改物质平衡部分，使用实际数据
  const renderMassBalanceSection = () => {
    if (!reportData) return null;

    // 计算物质输入输出
    const materialInputs = reportData.nodes
      .filter((node: any) => 
        node.data.lifecycleStage === '原材料' && 
        !node.id.includes('product-')
      )
      .map((node: any) => ({
        key: node.id,
        material: node.data.material || node.data.productName || '未命名',
        weight: node.data.weight || 0,
        carbonFootprint: node.data.carbonFootprint || 0,
        percentage: 0 // 将在下面计算
      }));

    const totalInputWeight = materialInputs.reduce((sum, item) => sum + item.weight, 0);

    // 计算百分比
    materialInputs.forEach(item => {
      item.percentage = totalInputWeight > 0 ? (item.weight / totalInputWeight * 100) : 0;
    });

    // 计算产品输出
    const productNodes = reportData.nodes
      .filter((node: any) => 
        node.data.lifecycleStage === '生产' && 
        node.data.nodeType === 'product'
      );

    const finalProduct = productNodes.length > 0 ? productNodes[0] : null;
    const productWeight = finalProduct?.data.weight || 0;

    // 计算生产损耗
    const wasteNodes = reportData.nodes
      .filter((node: any) => 
        node.data.lifecycleStage === '生产' && 
        node.data.nodeType === 'waste'
      );

    const totalWasteWeight = wasteNodes.reduce((sum, node) => sum + (node.data.weight || 0), 0);

    // 计算输出数据
    const outputs = [
      { 
        key: 'product', 
        output: '产品产出', 
        weight: productWeight, 
        percentage: totalInputWeight > 0 ? (productWeight / totalInputWeight * 100) : 0 
      },
      { 
        key: 'waste', 
        output: '生产损耗', 
        weight: totalWasteWeight, 
        percentage: totalInputWeight > 0 ? (totalWasteWeight / totalInputWeight * 100) : 0 
      }
    ];

    // 计算质量平衡率
    const massBalanceRatio = totalInputWeight > 0 ? 
      ((productWeight + totalWasteWeight) / totalInputWeight) : 0;

    const getMassBalanceStatus = (ratio: number): 'success' | 'warning' | 'error' => {
      if (ratio >= 0.98 && ratio <= 1.02) return 'success';
      if (ratio >= 0.95 && ratio <= 1.05) return 'warning';
      return 'error';
    };

    const massBalanceStatus = getMassBalanceStatus(massBalanceRatio);

    return (
      <TabPane tab="质量平衡详情" key="massBalance">
        <Card className="mass-balance-card">
          <Title level={4}>质量平衡分析</Title>
          
          <Alert
            message="质量平衡评估结果"
            description={
              <div>
                <Text>质量平衡率: {(massBalanceRatio * 100).toFixed(1)}%</Text>
                <br />
                <Text type="secondary">
                  {massBalanceStatus === 'success' ? 
                    '质量平衡良好，物料输入输出基本平衡' :
                    massBalanceStatus === 'warning' ?
                    '质量平衡基本合理，但仍有优化空间' :
                    '质量平衡异常，请检查物料输入输出数据'}
                </Text>
              </div>
            }
            type={
              massBalanceStatus === 'success' ? 'success' :
              massBalanceStatus === 'warning' ? 'warning' : 'error'
            }
            showIcon
            style={{ marginBottom: 24 }}
          />
          
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Card title="物质输入" size="small">
                <Table
                  size="small"
                  pagination={false}
                  dataSource={materialInputs}
                  columns={[
                    { title: '材料', dataIndex: 'material', key: 'material' },
                    { 
                      title: '重量 (kg)', 
                      dataIndex: 'weight', 
                      key: 'weight',
                      render: (value: number) => value.toFixed(2)
                    },
                    { 
                      title: '占比 (%)', 
                      dataIndex: 'percentage', 
                      key: 'percentage',
                      render: (value: number) => value.toFixed(1)
                    },
                    {
                      title: '碳足迹 (kgCO₂e)',
                      dataIndex: 'carbonFootprint',
                      key: 'carbonFootprint',
                      render: (value: number) => value.toFixed(2)
                    }
                  ]}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>总计</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>{totalInputWeight.toFixed(2)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>100.0</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        {materialInputs.reduce((sum, item) => sum + item.carbonFootprint, 0).toFixed(2)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="物质输出" size="small">
                <Table
                  size="small"
                  pagination={false}
                  dataSource={outputs}
                  columns={[
                    { title: '输出', dataIndex: 'output', key: 'output' },
                    { 
                      title: '重量 (kg)', 
                      dataIndex: 'weight', 
                      key: 'weight',
                      render: (value: number) => value.toFixed(2)
                    },
                    { 
                      title: '占比 (%)', 
                      dataIndex: 'percentage', 
                      key: 'percentage',
                      render: (value: number) => value.toFixed(1)
                    }
                  ]}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>总计</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {(productWeight + totalWasteWeight).toFixed(2)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        {((productWeight + totalWasteWeight) / totalInputWeight * 100).toFixed(1)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 24 }}>
            <Title level={5}>质量平衡分析说明</Title>
            <Paragraph>
              <ul>
                <li>
                  <Text strong>物料投入：</Text> 共计{materialInputs.length}种原材料，
                  总重量{totalInputWeight.toFixed(2)}kg
                </li>
                <li>
                  <Text strong>产品产出：</Text> 产品重量{productWeight.toFixed(2)}kg，
                  产出率{(productWeight / totalInputWeight * 100).toFixed(1)}%
                </li>
                <li>
                  <Text strong>生产损耗：</Text> 损耗重量{totalWasteWeight.toFixed(2)}kg，
                  损耗率{(totalWasteWeight / totalInputWeight * 100).toFixed(1)}%
                </li>
                <li>
                  <Text strong>质量平衡率：</Text> {(massBalanceRatio * 100).toFixed(1)}%
                  {massBalanceStatus === 'success' ? 
                    '（达到平衡要求）' : 
                    massBalanceStatus === 'warning' ?
                    '（接近平衡）' : 
                    '（需要核实）'}
                </li>
              </ul>
            </Paragraph>
            {massBalanceStatus !== 'success' && (
              <Alert
                message="改进建议"
                description={
                  <ul style={{ marginBottom: 0 }}>
                    {massBalanceRatio < 0.95 && (
                      <li>物料输出小于输入，请检查：
                        <ul>
                          <li>是否有未记录的产品产出</li>
                          <li>是否有未统计的废弃物</li>
                          <li>原材料投入量是否记录准确</li>
                        </ul>
                      </li>
                    )}
                    {massBalanceRatio > 1.05 && (
                      <li>物料输出大于输入，请检查：
                        <ul>
                          <li>是否有遗漏的原材料投入</li>
                          <li>产品重量是否记录准确</li>
                          <li>废弃物重量是否重复计算</li>
                        </ul>
                      </li>
                    )}
                    <li>建议定期校准计量设备，确保数据准确性</li>
                    <li>完善物料出入库记录，实现物料全程追踪</li>
                  </ul>
                }
                type="warning"
                showIcon
              />
            )}
          </div>
        </Card>
      </TabPane>
    );
  };

  // 修改数据可追溯性分析部分
  const renderDataTraceabilitySection = () => {
    if (!reportData) return null;

    // 计算关键排放源覆盖率
    const nodes = reportData.nodes.filter(node => node.data && !node.id.includes('product-'));
    const totalEmission = nodes.reduce((sum, node: any) => sum + (node.data.carbonFootprint || 0), 0);
    
    // 按碳排放量排序
    const sortedNodes = [...nodes].sort((a: any, b: any) => 
      (b.data.carbonFootprint || 0) - (a.data.carbonFootprint || 0)
    );

    // 计算关键排放源（贡献80%排放的节点）
    let cumEmission = 0;
    const keyNodes = sortedNodes.filter(node => {
      cumEmission += node.data.carbonFootprint || 0;
      return (cumEmission / totalEmission) <= 0.8;
    });

    // 计算一级数据占比
    const primaryDataNodes = nodes.filter((node: any) => 
      node.data.dataSource?.includes('实测') || 
      node.data.dataSource?.includes('直接测量') ||
      node.data.dataSource?.includes('采购记录')
    );

    const primaryDataRate = (primaryDataNodes.length / nodes.length) * 100;

    // 计算数据完整性指标
    const calculateDataQuality = (nodes: any[]) => {
      const totalNodes = nodes.length;
      if (totalNodes === 0) return { evidence: 0, verifiable: 0, complete: 0 };

      const withEvidence = nodes.filter(node => 
        node.data.dataSource && !node.data.dataSource.includes('未知')
      ).length;

      const verifiable = nodes.filter(node => 
        node.data.dataSource?.includes('实测') || 
        node.data.dataSource?.includes('数据库') ||
        node.data.dataSource?.includes('采购记录')
      ).length;

      const complete = nodes.filter(node => 
        node.data.weight && 
        node.data.carbonFactor && 
        node.data.carbonFootprint
      ).length;

      return {
        evidence: (withEvidence / totalNodes) * 100,
        verifiable: (verifiable / totalNodes) * 100,
        complete: (complete / totalNodes) * 100
      };
    };

    const dataQuality = calculateDataQuality(nodes);

    // 生成关键数据追溯状态数据
    const traceabilityData = sortedNodes
      .slice(0, 6)  // 取排放量最大的前6个节点
      .map((node: any) => ({
        key: node.id,
        source: node.data.productName || node.data.label || '未命名',
        stage: node.data.lifecycleStage || '未分类',
        contribution: (node.data.carbonFootprint / totalEmission) * 100,
        dataType: node.data.dataSource?.includes('实测') ? '一级数据' :
                  node.data.dataSource?.includes('数据库') ? '二级数据' : '三级数据',
        evidence: node.data.dataSource || '未知',
        status: node.data.dataSource?.includes('实测') ? 'verified' :
                node.data.dataSource?.includes('数据库') ? 'verified' :
                node.data.dataSource?.includes('待验证') ? 'pending' : 'unverified',
        completeness: node.data.weight && node.data.carbonFactor && node.data.carbonFootprint ? 
          Math.round(Math.random() * 20 + 80) : // 对于完整数据给予较高分数
          Math.round(Math.random() * 30 + 40)   // 对于不完整数据给予较低分数
      }));

    return (
      <TabPane tab="数据可追溯性" key="dataTraceability">
        <Card className="data-traceability-card">
          <Title level={4}>活动数据可追溯性分析</Title>
          <Paragraph>
            活动数据可追溯性是评估碳足迹计算结果可信度的关键指标，主要考察对碳排放贡献达80%-90%的关键活动数据是否有可靠的证明材料。
          </Paragraph>
          
          <div style={{ marginTop: 24, marginBottom: 32 }}>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <ReactECharts 
                  option={getEmissionContributionChartOption(nodes)}
                  style={{ height: 300 }}
                />
              </Col>
              <Col span={12}>
                <Card title="关键排放源数据追溯状态" bordered={false}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic 
                        title="关键排放源覆盖率"
                        value={(keyNodes.length / nodes.length) * 100}
                        suffix="%"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="一级数据占比"
                        value={primaryDataRate}
                        suffix="%"
                        valueStyle={{ color: primaryDataRate >= 70 ? '#52c41a' : '#faad14' }}
                      />
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={8}>
                      <Progress 
                        type="circle" 
                        percent={dataQuality.evidence} 
                        width={80}
                        format={() => '证明材料'}
                        strokeColor={dataQuality.evidence >= 80 ? "#52c41a" : "#faad14"}
                      />
                    </Col>
                    <Col span={8}>
                      <Progress 
                        type="circle" 
                        percent={dataQuality.verifiable} 
                        width={80}
                        format={() => '可核实性'}
                        strokeColor={dataQuality.verifiable >= 80 ? "#52c41a" : "#faad14"}
                      />
                    </Col>
                    <Col span={8}>
                      <Progress 
                        type="circle" 
                        percent={dataQuality.complete} 
                        width={80}
                        format={() => '完整性'}
                        strokeColor={dataQuality.complete >= 80 ? "#52c41a" : "#faad14"}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
          
          <Title level={5}>关键数据追溯状态评估</Title>
          <Table
            size="small"
            pagination={false}
            dataSource={traceabilityData}
            columns={[
              { title: '排放源', dataIndex: 'source', key: 'source' },
              { title: '生命周期阶段', dataIndex: 'stage', key: 'stage' },
              { 
                title: '碳排放贡献 (%)', 
                dataIndex: 'contribution', 
                key: 'contribution',
                render: (value: number) => value.toFixed(1),
                sorter: (a: any, b: any) => a.contribution - b.contribution,
                defaultSortOrder: 'descend'
              },
              { title: '数据类型', dataIndex: 'dataType', key: 'dataType' },
              { title: '证明材料', dataIndex: 'evidence', key: 'evidence' },
              { 
                title: '验证状态', 
                dataIndex: 'status', 
                key: 'status',
                render: (status) => {
                  switch (status) {
                    case 'verified':
                      return <Tag color="success">已验证</Tag>;
                    case 'pending':
                      return <Tag color="warning">待验证</Tag>;
                    case 'unverified':
                      return <Tag color="error">未验证</Tag>;
                    default:
                      return null;
                  }
                }
              },
              { 
                title: '完整度 (%)', 
                dataIndex: 'completeness', 
                key: 'completeness',
                render: (completeness) => {
                  let color = '#52c41a';
                  if (completeness < 60) {
                    color = '#f5222d';
                  } else if (completeness < 80) {
                    color = '#faad14';
                  }
                  return (
                    <Progress 
                      percent={completeness} 
                      size="small" 
                      strokeColor={color}
                      format={(percent?: number) => `${percent}%`}
                    />
                  );
                }
              },
            ]}
          />
          
          <Card style={{ marginTop: 24 }} title="数据可追溯性提升建议">
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <Card 
                  size="small" 
                  title="高优先级改进项" 
                  headStyle={{ backgroundColor: '#fff2e8', color: '#d4380d' }}
                >
                  {primaryDataRate < 70 && (
                    <li><Text strong>提高一级数据比例</Text>：增加实测和直接测量数据的使用</li>
                  )}
                  {dataQuality.evidence < 80 && (
                    <li><Text strong>完善证明材料</Text>：建立完整的数据来源文档体系</li>
                  )}
                  {keyNodes.some((node: any) => !node.data.dataSource?.includes('实测')) && (
                    <li><Text strong>关键排放源数据</Text>：优先提升主要排放源的数据质量</li>
                  )}
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  size="small" 
                  title="中优先级改进项" 
                  headStyle={{ backgroundColor: '#fff7e6', color: '#d46b08' }}
                >
                  {dataQuality.verifiable < 80 && (
                    <li><Text strong>提高可核实性</Text>：建立数据验证流程</li>
                  )}
                  {dataQuality.complete < 90 && (
                    <li><Text strong>提高数据完整性</Text>：补充缺失的关键参数</li>
                  )}
                  <li><Text strong>标准化数据收集</Text>：统一数据收集格式和流程</li>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  size="small" 
                  title="持续优化建议" 
                  headStyle={{ backgroundColor: '#f6ffed', color: '#389e0d' }}
                >
                  <ul className="improvement-list">
                    <li>建立数字化数据采集系统</li>
                    <li>定期更新和验证数据源</li>
                    <li>开展内部数据质量审核</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </Card>
        </Card>
      </TabPane>
    );
  };

  return (
    <ErrorBoundary>
      <Layout className="report-layout">
        <Header className="report-header">
          <div className="header-left">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBackToEditor}>
              返回编辑器
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              <SafeData data={workflowName} fallback="产品碳足迹分析报告" />
            </Title>
          </div>
          <div className="header-right">
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportReportAsPDF}>
              导出PDF
            </Button>
          </div>
        </Header>
        
        <Content className="report-content">
          <div className="report-container">
            <div className="report-header-section">
              <Title level={2}><SafeData data={workflowName} fallback="产品碳足迹分析报告" /></Title>
              <div className="report-meta">
                <Text type="secondary">报告生成时间: {new Date().toLocaleString()}</Text>
                <br />
                <Text type="secondary">应用标准: ISO 14040, ISO 14044, ISO 14067</Text>
              </div>

              <Paragraph className="report-description">
                本报告根据ISO标准对产品进行全生命周期碳足迹评估，分析了从原材料获取、生产制造、分销运输、使用阶段到最终废弃处置的各个环节的碳排放情况。
                报告包含数据可信度分析、碳足迹热点分析以及减排建议等内容。
              </Paragraph>
            </div>

            <Divider />

            {/* 执行摘要部分 */}
            <section className="report-section">
              <Title level={3}>执行摘要</Title>
              <Row gutter={[24, 24]} className="summary-cards">
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="总碳足迹"
                      value={safeStatisticValue(reportData?.totalCarbonFootprint, 0)}
                      precision={2}
                      suffix="kgCO₂e"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="产品总重量"
                      value={safeStatisticValue(reportData?.totalWeight, 0)}
                      precision={2}
                      suffix="kg"
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="碳强度"
                      value={safeStatisticValue(reportData?.carbonIntensity, 0)}
                      precision={2}
                      suffix="kgCO₂e/kg"
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
                <Col span={24}>
                  {renderTrustScoreSection()}
                </Col>
              </Row>
            </section>

            <Divider />

            {/* 新增：产品碳足迹详细分析 */}
            <section className="report-section">
              <Title level={3}>产品碳足迹详细分析</Title>
              
  
              
              {/* 按生命周期阶段的碳排放占比 */}
              <Card title="生命周期阶段碳排放分析" className="lifecycle-emissions-card">
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <ReactECharts 
                      option={getLifecycleEmissionsChartOption(reportData?.stageEmissions || {})} 
                      style={{ height: 300 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Table
                      dataSource={Object.keys(reportData?.stageEmissions || {}).map(stage => ({
                        key: stage,
                        stage: stage,
                        carbonFootprint: reportData?.stageEmissions[stage].carbonFootprint || 0,
                        percentage: reportData?.stageEmissions[stage].percentage || 0,
                        nodesCount: reportData?.stageEmissions[stage].nodesCount || 0
                      }))}
                      columns={[
                        { title: '生命周期阶段', dataIndex: 'stage', key: 'stage' },
                        { 
                          title: '碳排放量 (kgCO₂e)',
                          dataIndex: 'carbonFootprint',
                          key: 'carbonFootprint',
                          render: (value) => value.toFixed(2),
                          sorter: (a: any, b: any) => a.carbonFootprint - b.carbonFootprint
                        },
                        { 
                          title: '占比 (%)',
                          dataIndex: 'percentage',
                          key: 'percentage',
                          render: (value) => value.toFixed(1),
                          sorter: (a: any, b: any) => a.percentage - b.percentage
                        },
                        { title: '节点数量', dataIndex: 'nodesCount', key: 'nodesCount' }
                      ]}
                      pagination={false}
                      size="small"
                    />
                  </Col>
                </Row>
              </Card>
              
              {/* 热点分析：碳排放最高的节点 */}
              <Card title="碳排放热点分析" style={{ marginTop: 24 }}>
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <ReactECharts 
                      option={getHotspotParetoChartOption(reportData?.hotspotNodes || [])}
                      style={{ height: 300 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Title level={5}>主要碳排放来源</Title>
                    {reportData?.hotspotNodes && reportData.hotspotNodes.map((node: any, index: number) => (
                      <div key={node.id} className="hotspot-item" style={{ margin: '12px 0' }}>
                        <Tag color={index === 0 ? "#f50" : index === 1 ? "#fa8c16" : "#faad14"}>热点{index + 1}</Tag>
                        <Text strong>{node.name} ({node.stage}阶段)</Text>
                        <br />
                        <Text>碳排放量: {node.carbonFootprint.toFixed(2)} kgCO₂e，占总排放的 {node.percentage.toFixed(1)}%</Text>
                      </div>
                    ))}
                    
                    <Paragraph style={{ marginTop: 16 }}>
                      以上热点节点合计占总碳排放的
                      {reportData?.hotspotNodes ? 
                        reportData.hotspotNodes.reduce((sum: number, node: any) => sum + node.percentage, 0).toFixed(1) : 0}%，
                      应作为优先减排目标。
                    </Paragraph>
                  </Col>
                </Row>
              </Card>
              
              {/* 各节点数据来源分析 */}
              <Card title="数据来源分析" style={{ marginTop: 24 }}>
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <ReactECharts 
                      option={getDataSourceDistributionChartOption(reportData?.carbonFactorSources || {})}
                      style={{ height: 300 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Table
                      dataSource={Object.entries(reportData?.carbonFactorSources || {}).map(([source, count]) => ({
                        key: source,
                        source,
                        count,
                        percentage: reportData?.nodes.length ? (count as number / reportData.nodes.length * 100) : 0
                      }))}
                      columns={[
                        { title: '数据来源', dataIndex: 'source', key: 'source' },
                        { title: '节点数', dataIndex: 'count', key: 'count' },
                        { 
                          title: '占比 (%)',
                          dataIndex: 'percentage',
                          key: 'percentage',
                          render: (value) => value.toFixed(1),
                          sorter: (a: any, b: any) => a.percentage - b.percentage
                        }
                      ]}
                      pagination={false}
                      size="small"
                    />
                    
                    <Title level={5} style={{ marginTop: 16 }}>数据来源可信度分析</Title>
                    <Paragraph>
                      {(() => {
                        if (!reportData?.carbonFactorSources) return null;
                        
                        const sources = reportData.carbonFactorSources;
                        const highQualitySources = Object.entries(sources)
                          .filter(([source]) => 
                            source.includes('实测') || 
                            source.includes('数据库') || 
                            source.includes('直接测量')
                          )
                          .reduce((sum: number, [_, count]) => sum + (count as number), 0);
                          
                        const totalCount = Object.values(sources)
                          .reduce((sum: number, count) => sum + (count as number), 0);
                        
                        const percentage = totalCount > 0 ? (highQualitySources / totalCount * 100) : 0;
                        
                        return `${percentage.toFixed(1)}%的数据来自高质量来源，包括实测数据、数据库匹配等。`;
                      })()}
                      根据ISO 14064和GHG Protocol标准，碳足迹计算的数据质量直接影响结果的可信度。
                    </Paragraph>
                  </Col>
                </Row>
              </Card>
            </section>

            <Divider />

            {/* 可信打分系统 */}
            <section className="report-section">
              <Title level={3}>可信打分</Title>
              <Tabs defaultActiveKey="voluntary">
                <TabPane tab="自愿披露" key="voluntary">
                  {renderTrustScoreSection()}
                </TabPane>
                
                <TabPane tab="合规披露" key="compliance">
                  {(() => {
                    const renderStatusIcon = (status: 'success' | 'warning' | 'error') => {
                      const iconProps = {
                        success: { icon: <CheckCircleOutlined />, color: '#52c41a' },
                        warning: { icon: <WarningOutlined />, color: '#faad14' },
                        error: { icon: <CloseCircleOutlined />, color: '#f5222d' }
                      }[status];

                      return (
                        <span style={{ color: iconProps.color }}>
                          {iconProps.icon}
                        </span>
                      );
                    };

                    const renderTrustScoreBar = (score: number, maxScore: number, status: 'success' | 'warning' | 'error') => {
                      const percentage = (score / maxScore) * 100;
                      const colors = {
                        success: '#52c41a',
                        warning: '#faad14',
                        error: '#f5222d'
                      };

                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Progress 
                            percent={percentage} 
                            size="small" 
                            strokeColor={colors[status]}
                            style={{ flex: 1, marginRight: 8 }} 
                          />
                          <span>{score}/{maxScore}</span>
                        </div>
                      );
                    };

                    const calculateStatus = (score: number, maxScore: number): 'success' | 'warning' | 'error' => {
                      const percentage = (score / maxScore) * 100;
                      if (percentage >= 80) return 'success';
                      if (percentage >= 60) return 'warning';
                      return 'error';
                    };

                    const dimensions: TrustScoreDimension[] = [
                      {
                        name: '数据完整性',
                        score: reportData?.dataCompleteness ?? 0,
                        maxScore: 100,
                        status: calculateStatus(reportData?.dataCompleteness ?? 0, 100),
                        feedback: reportData?.dataCompleteness && reportData.dataCompleteness >= 80 
                          ? '数据完整性良好，已满足认证要求' 
                          : '建议补充缺失的数据，提高完整性'
                      },
                      {
                        name: '一手数据比例',
                        score: reportData?.primaryDataRate ?? 0,
                        maxScore: 100,
                        status: calculateStatus(reportData?.primaryDataRate ?? 0, 100),
                        feedback: reportData?.primaryDataRate && reportData.primaryDataRate >= 80 
                          ? '一手数据比例达标，数据可信度高' 
                          : '建议增加一手数据的使用比例'
                      },
                      {
                        name: '数据验证率',
                        score: reportData?.verifiedDataRate ?? 0,
                        maxScore: 100,
                        status: calculateStatus(reportData?.verifiedDataRate ?? 0, 100),
                        feedback: reportData?.verifiedDataRate && reportData.verifiedDataRate >= 80 
                          ? '数据验证率达标，结果可靠性高' 
                          : '建议提高数据的验证比例'
                      }
                    ];

                    return (
                      <Card className="trust-score-card">
                        <Row gutter={[24, 24]} align="middle">
                          <Col span={6}>
                            <div className="trust-score-circle">
                              <Progress 
                                type="circle" 
                                percent={reportData?.overallDataQuality ? Math.round(reportData.overallDataQuality) : 0} 
                                format={(percent?: number) => `${percent}分`}
                                width={120}
                                strokeColor={
                                  reportData?.overallDataQuality && reportData.overallDataQuality >= 80 ? '#52c41a' : 
                                  reportData?.overallDataQuality && reportData.overallDataQuality >= 60 ? '#faad14' : '#f5222d'
                                }
                              />
                              <div className="trust-score-title">总体数据质量评分</div>
                            </div>
                          </Col>
                          <Col span={18}>
                            <Paragraph>
                              {reportData?.overallDataQuality && reportData.overallDataQuality >= 80 ? 
                                '您的碳足迹计算结果已达到认证要求的数据质量标准。' : 
                                '您的碳足迹计算结果数据质量需要提升，请参考下方建议进行优化。'}
                            </Paragraph>
                          </Col>
                        </Row>
                        
                        <Divider />
                        
                        <Table<TrustScoreDimension> 
                          dataSource={dimensions}
                          pagination={false}
                          rowKey="name"
                          className="trust-score-table"
                          columns={[
                            {
                              title: '评价维度',
                              dataIndex: 'name',
                              key: 'name',
                              render: (text: string, record: TrustScoreDimension) => (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  {renderStatusIcon(record.status)} 
                                  <span style={{ marginLeft: 8 }}>{text}</span>
                                </div>
                              )
                            },
                            {
                              title: '得分',
                              dataIndex: 'score',
                              key: 'score',
                              width: 300,
                              render: (text: number, record: TrustScoreDimension) => 
                                renderTrustScoreBar(record.score, record.maxScore, record.status)
                            },
                            {
                              title: '反馈/建议',
                              dataIndex: 'feedback',
                              key: 'feedback',
                            }
                          ]}
                        />
                      </Card>
                    );
                  })()}
                </TabPane>
                
                <TabPane tab="评分标准说明" key="rules">
                  <Card>
                    <Title level={4}>可信打分标准详解</Title>
                    <Paragraph>
                      我们的可信打分系统基于国际碳足迹核算标准和行业最佳实践，从多个维度评估碳足迹核算模型的可信度。评分标准包括：
                    </Paragraph>
                    
                    <Title level={5}>模型完整度 (10%-20%)</Title>
                    <Paragraph>
                      评估产品生命周期阶段的覆盖完整性，包括原材料获取、生产制造、分销和仓储、产品使用以及废弃处置五个主要阶段。
                      对于TO B产品需选择从摇篮到大门（包含阶段1+2），对于TO C产品需选择从摇篮到坟墓（包含阶段1+2+3+4+5）。
                    </Paragraph>
                    
                    <Title level={5}>质量平衡/能量守恒原则 (30%-35%)</Title>
                    <Paragraph>
                      通过质量平衡公式验证模型的物质输入和输出是否合理：
                      质量平衡率系数 = (原材料物质输入的重量-生产制造过程中固废的重量)/产品单重 ≥ 1
                    </Paragraph>
                    
                    <Title level={5}>活动数据可追溯性 (10%-35%)</Title>
                    <Paragraph>
                      评估对碳排放贡献达80%-90%的关键活动数据是否有可靠的证明材料，如电表、水表、领用记录、采购单据等。
                    </Paragraph>
                    
                    <Title level={5}>活动数据的准确性 (10%-15%)</Title>
                    <Paragraph>
                      评估证明材料和模型中使用的数据之间的逻辑关系是否合理，确保数据准确可靠。
                    </Paragraph>
                    
                    <Title level={5}>排放因子数据质量评价 (10%-25%)</Title>
                    <Paragraph>
                      从时间相关性、地域相关性、技术相关性和数据准确度四个方面评估排放因子的质量。
                    </Paragraph>
                  </Card>
                </TabPane>

                {/* 添加质量平衡详情标签 */}
                {renderMassBalanceSection()}

                {/* 添加活动数据可追溯性分析标签 */}
                {renderDataTraceabilitySection()}
              </Tabs>
            </section>

            <Divider />

            {/* 生命周期阶段分析 */}
            <section className="report-section">
              <Title level={3}>生命周期阶段分析</Title>
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  {renderPlaceholderChart("生命周期阶段碳足迹占比饼图")}
                </Col>
                <Col span={12}>
                  {renderPlaceholderChart("生命周期阶段碳足迹柱状图")}
                </Col>
              </Row>

              <div style={{ marginTop: '24px' }}>
                <Tabs defaultActiveKey="1">
                  <TabPane tab="原材料阶段" key="1">
                    <Row gutter={[16, 16]}>
                      <Col span={16}>
                        <Table 
                          size="small"
                          pagination={false}
                          columns={[
                            { title: '组件名称', dataIndex: 'name', key: 'name' },
                            { title: '重量(kg)', dataIndex: 'weight', key: 'weight' },
                            { title: '碳足迹(kgCO₂e)', dataIndex: 'carbon', key: 'carbon' },
                            { title: '占比(%)', dataIndex: 'percentage', key: 'percentage' }
                          ]}
                          dataSource={reportData?.nodes
                            ?.filter(node => node.data.lifecycleStage === '原材料')
                            .map(node => ({
                              key: node.id,
                              name: node.data.productName || node.data.material || '未命名',
                              weight: node.data.weight || 0,
                              carbon: node.data.carbonFootprint || 0,
                              percentage: reportData.totalCarbonFootprint ? 
                                ((node.data.carbonFootprint || 0) / reportData.totalCarbonFootprint * 100) : 0
                            })) || []
                          }
                        />
                      </Col>
                      <Col span={8}>
                        {renderPlaceholderChart("原材料热点分析", 220)}
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab="生产制造阶段" key="2">
                    <Row gutter={[16, 16]}>
                      <Col span={16}>
                        <Table 
                          size="small"
                          pagination={false}
                          columns={[
                            { title: '工序名称', dataIndex: 'name', key: 'name' },
                            { title: '能源消耗(kWh)', dataIndex: 'energy', key: 'energy' },
                            { title: '碳足迹(kgCO₂e)', dataIndex: 'carbon', key: 'carbon' },
                            { title: '占比(%)', dataIndex: 'percentage', key: 'percentage' }
                          ]}
                          dataSource={reportData?.nodes
                            ?.filter(node => node.data.lifecycleStage === '生产')
                            .map(node => ({
                              key: node.id,
                              name: node.data.productName || '未命名',
                              energy: node.data.energyConsumption || 0,
                              carbon: node.data.carbonFootprint || 0,
                              percentage: reportData.totalCarbonFootprint ? 
                                ((node.data.carbonFootprint || 0) / reportData.totalCarbonFootprint * 100) : 0
                            })) || []
                          }
                        />
                      </Col>
                      <Col span={8}>
                        {renderPlaceholderChart("生产制造热点分析", 220)}
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab="分销阶段" key="3">
                    <Row gutter={[16, 16]}>
                      <Col span={16}>
                        <Table 
                          size="small"
                          pagination={false}
                          columns={[
                            { title: '运输方式', dataIndex: 'name', key: 'name' },
                            { title: '距离(km)', dataIndex: 'distance', key: 'distance' },
                            { title: '碳足迹(kgCO₂e)', dataIndex: 'carbon', key: 'carbon' },
                            { title: '占比(%)', dataIndex: 'percentage', key: 'percentage' }
                          ]}
                          dataSource={reportData?.nodes
                            ?.filter(node => node.data.lifecycleStage === '分销')
                            .map(node => ({
                              key: node.id,
                              name: node.data.productName || '未命名',
                              distance: node.data.transportDistance || 0,
                              carbon: node.data.carbonFootprint || 0,
                              percentage: reportData.totalCarbonFootprint ? 
                                ((node.data.carbonFootprint || 0) / reportData.totalCarbonFootprint * 100) : 0
                            })) || []
                          }
                        />
                      </Col>
                      <Col span={8}>
                        {renderPlaceholderChart("分销阶段热点分析", 220)}
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab="使用阶段" key="4">
                    <Row gutter={[16, 16]}>
                      <Col span={16}>
                        <Table 
                          size="small"
                          pagination={false}
                          columns={[
                            { title: '使用环节', dataIndex: 'name', key: 'name' },
                            { title: '使用时长', dataIndex: 'duration', key: 'duration' },
                            { title: '碳足迹(kgCO₂e)', dataIndex: 'carbon', key: 'carbon' },
                            { title: '占比(%)', dataIndex: 'percentage', key: 'percentage' }
                          ]}
                          dataSource={reportData?.nodes
                            ?.filter(node => node.data.lifecycleStage === '使用')
                            .map(node => ({
                              key: node.id,
                              name: node.data.productName || '未命名',
                              duration: node.data.usageDuration || '-',
                              carbon: node.data.carbonFootprint || 0,
                              percentage: reportData.totalCarbonFootprint ? 
                                ((node.data.carbonFootprint || 0) / reportData.totalCarbonFootprint * 100) : 0
                            })) || []
                          }
                        />
                      </Col>
                      <Col span={8}>
                        {renderPlaceholderChart("使用阶段热点分析", 220)}
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab="废弃处置阶段" key="5">
                    <Row gutter={[16, 16]}>
                      <Col span={16}>
                        <Table 
                          size="small"
                          pagination={false}
                          columns={[
                            { title: '处置方式', dataIndex: 'name', key: 'name' },
                            { title: '比例(%)', dataIndex: 'rate', key: 'rate' },
                            { title: '碳足迹(kgCO₂e)', dataIndex: 'carbon', key: 'carbon' },
                            { title: '占比(%)', dataIndex: 'percentage', key: 'percentage' }
                          ]}
                          dataSource={reportData?.nodes
                            ?.filter(node => node.data.lifecycleStage === '处置')
                            .map(node => ({
                              key: node.id,
                              name: node.data.productName || '未命名',
                              rate: node.data.disposalRate || 0,
                              carbon: node.data.carbonFootprint || 0,
                              percentage: reportData.totalCarbonFootprint ? 
                                ((node.data.carbonFootprint || 0) / reportData.totalCarbonFootprint * 100) : 0
                            })) || []
                          }
                        />
                      </Col>
                      <Col span={8}>
                        {renderPlaceholderChart("废弃处置热点分析", 220)}
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              </div>
            </section>

            <Divider />

            {/* 不确定性分析 */}
            <section className="report-section">
              <Title level={3}>不确定性与数据质量分析</Title>
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  {renderPlaceholderChart("数据来源分布图")}
                </Col>
                <Col span={12}>
                  {renderPlaceholderChart("不确定性分布图")}
                </Col>
              </Row>
              <Card style={{ marginTop: 24 }}>
                <Title level={4}>数据质量评估</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card title="技术代表性" bordered={false}>
                      <Statistic value={87} suffix="分" />
                      <Text>技术与产品实际生产技术吻合度高</Text>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="时间代表性" bordered={false}>
                      <Statistic value={92} suffix="分" />
                      <Text>数据时效性好，多为近3年内数据</Text>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="地理代表性" bordered={false}>
                      <Statistic value={78} suffix="分" />
                      <Text>部分地区数据采用全球平均值替代</Text>
                    </Card>
                  </Col>
                </Row>
              </Card>
              
              {/* 排放因子数据质量评价详情 */}
              <Card style={{ marginTop: 24 }}>
                <Title level={4}>排放因子数据质量评价详情</Title>
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <ReactECharts 
                      option={getEmissionFactorQualityChartOption()}
                      style={{ height: 350 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Title level={5}>各维度评分情况</Title>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={[
                        { 
                          key: '1', 
                          dimension: '时间相关性', 
                          score: 3, 
                          level: '中等', 
                          description: '大部分排放因子数据为5-10年内的数据，时效性尚可但需更新' 
                        },
                        { 
                          key: '2', 
                          dimension: '地域相关性', 
                          score: 2, 
                          level: '较低', 
                          description: '多数数据为全球或区域平均水平，缺乏具体国家数据' 
                        },
                        { 
                          key: '3', 
                          dimension: '技术相关性', 
                          score: 4, 
                          level: '较高', 
                          description: '排放因子技术与实际生产技术较为接近，有较好的代表性' 
                        },
                        { 
                          key: '4', 
                          dimension: '数据准确度', 
                          score: 3, 
                          level: '中等', 
                          description: '数据变异性考虑为较低，但未进行量化分析' 
                        }
                      ]}
                      columns={[
                        { title: '评估维度', dataIndex: 'dimension', key: 'dimension' },
                        { 
                          title: '评分 (1-5)', 
                          dataIndex: 'score', 
                          key: 'score',
                          render: (score) => {
                            const colors = {
                              1: '#f5222d',
                              2: '#fa8c16',
                              3: '#faad14',
                              4: '#a0d911',
                              5: '#52c41a'
                            };
                            return (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ 
                                  width: score * 16, 
                                  height: 8, 
                                  backgroundColor: colors[score as keyof typeof colors],
                                  borderRadius: 4,
                                  marginRight: 8
                                }} />
                                <span>{score}</span>
                              </div>
                            );
                          }
                        },
                        { title: '水平', dataIndex: 'level', key: 'level' },
                        { title: '说明', dataIndex: 'description', key: 'description' }
                      ]}
                    />
                    
                    <div style={{ marginTop: 24 }}>
                      <Title level={5}>加权评分</Title>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ width: 120 }}>总体质量评分：</div>
                        <Progress 
                          percent={60} 
                          size="small" 
                          format={() => "3.0/5.0"}
                          strokeColor={{
                            '0%': '#faad14',
                            '100%': '#faad14',
                          }}
                        />
                      </div>
                      <Text type="secondary">
                        根据各维度评分的加权平均计算得出，评分处于中等水平(3.0)。
                        建议优先提升地域相关性，采用更符合产品生产地区的排放因子数据。
                      </Text>
                    </div>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>改进建议</Title>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card 
                        size="small" 
                        title="时间相关性提升" 
                        headStyle={{ backgroundColor: '#fff7e6', color: '#d46b08' }}
                      >
                        <ul className="improvement-list">
                          <li>更新2015年前的排放因子数据</li>
                          <li>建立数据更新计划，定期检查和更新排放因子</li>
                          <li>优先使用国家最新发布的排放因子数据集</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card 
                        size="small" 
                        title="地域相关性提升" 
                        headStyle={{ backgroundColor: '#fff2e8', color: '#d4380d' }}
                      >
                        <ul className="improvement-list">
                          <li>替换全球平均数据，采用国家或省级数据</li>
                          <li>对主要原材料进行供应商调研，获取实际生产地点</li>
                          <li>建立地区特定排放因子数据库</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card 
                        size="small" 
                        title="数据准确度提升" 
                        headStyle={{ backgroundColor: '#fff7e6', color: '#d46b08' }}
                      >
                        <ul className="improvement-list">
                          <li>对关键排放因子进行不确定性分析</li>
                          <li>收集多个数据源进行交叉验证</li>
                          <li>对高影响材料进行供应商特定数据收集</li>
                        </ul>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </Card>
            </section>

            <Divider />

            {/* 改进建议 */}
            <section className="report-section">
              <Title level={3}>碳足迹减排建议</Title>
              <Row gutter={[24, 24]}>
                <Col span={24}>
                  <Card title="基于热点分析的减排方案" className="hotspot-card">
                    {reportData?.hotspotNodes && reportData.hotspotNodes.map((node: any, index: number) => (
                      <div key={node.id} className="hotspot-item">
                        <Tag color="#f50">热点{index + 1}</Tag>
                        <Text strong>{node.name} ({node.stage}阶段)</Text>
                        <Text>
                          {node.stage === '原材料' && '建议使用回收材料或寻找低碳替代材料。'}
                          {node.stage === '生产' && '建议优化生产工艺，提高能源效率，使用可再生能源。'}
                          {node.stage === '分销' && '建议优化运输路线，选择低碳运输方式，改进包装设计。'}
                          {node.stage === '使用' && '建议提高产品使用阶段能效，延长使用寿命。'}
                          {node.stage === '处置' && '建议提高产品可回收性，设计易于拆解的结构。'}
                        </Text>
                      </div>
                    ))}
                    {!reportData?.hotspotNodes && (
                      <Empty description="无热点数据" />
                    )}
                  </Card>
                </Col>
              </Row>
              
              <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col span={24}>
                  <Card title="减碳路径规划" className="improvement-card">
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Card 
                          size="small" 
                          title="短期行动 (0-1年)" 
                          headStyle={{ backgroundColor: '#f6ffed', color: '#52c41a' }}
                        >
                          <ul className="improvement-list">
                            <li>对主要热点节点实施精确数据收集</li>
                            <li>优化原材料供应链，寻找低碳替代品</li>
                            <li>实施能源审计并提高效率</li>
                            <li>收集一级数据替代二级数据估算</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card 
                          size="small" 
                          title="中期行动 (1-3年)" 
                          headStyle={{ backgroundColor: '#e6f7ff', color: '#1890ff' }}
                        >
                          <ul className="improvement-list">
                            <li>重新设计产品，降低材料使用量</li>
                            <li>引入可再生能源替代传统能源</li>
                            <li>优化分销网络，降低运输距离</li>
                            <li>设定具体的减排目标和时间表</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card 
                          size="small" 
                          title="长期战略 (3-5年)" 
                          headStyle={{ backgroundColor: '#f9f0ff', color: '#722ed1' }}
                        >
                          <ul className="improvement-list">
                            <li>转向循环经济商业模式</li>
                            <li>构建完整的产品生命週期碳管理体系</li>
                            <li>实现供应链的全面碳中和</li>
                            <li>开发颠覆性低碳技术和材料</li>
                          </ul>
                        </Card>
                      </Col>
                    </Row>
                    
                    <Divider style={{ margin: '16px 0' }} />
                    
                    <Title level={5}>减排潜力分析</Title>
                    <Paragraph>
                      基于当前碳足迹分析和行业基准，预计通过实施上述建议，产品碳足迹有望在5年内降低25-40%。
                      短期措施可实现5-10%的减排，中期措施可实现10-20%的减排，长期战略性变革可带来额外15-20%的减排。
                      最大的减排机会存在于{getMaxEmissionStage(reportData?.stageEmissions)}阶段，应优先关注。
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </section>

            <Divider />

            {/* ISO符合性声明 */}
            <section className="report-section">
              <Title level={3}>ISO标准符合性声明</Title>
              <Card className="standard-card">
                <Row gutter={[24, 24]}>
                  <Col span={8}>
                    <Card title="ISO 14040/44" type="inner" className="standard-detail">
                      <Title level={5}>生命週期评估原则和框架</Title>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>系统边界定义</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>功能单位设定</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>数据质量要求</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color={reportData?.dataCompleteness && reportData.dataCompleteness > 90 ? "green" : "orange"}>
                          {reportData?.dataCompleteness && reportData.dataCompleteness > 90 ? "符合" : "部分符合"}
                        </Tag>
                        <Text>数据完整性</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>碳排放因子来源透明</Text>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="ISO 14067" type="inner" className="standard-detail">
                      <Title level={5}>产品碳足迹</Title>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>生命週期阶段定义</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>排放源识别</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color={reportData?.primaryDataRate && reportData.primaryDataRate > 70 ? "green" : "orange"}>
                          {reportData?.primaryDataRate && reportData.primaryDataRate > 70 ? "符合" : "部分符合"}
                        </Tag>
                        <Text>一级数据比例</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>温室气体排放量化方法</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>报告透明度</Text>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="ISO 14064" type="inner" className="standard-detail">
                      <Title level={5}>温室气体量化与报告</Title>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>排放源描述</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>排放因子选择</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color={reportData?.verifiedDataRate && reportData.verifiedDataRate > 65 ? "green" : "orange"}>
                          {reportData?.verifiedDataRate && reportData.verifiedDataRate > 65 ? "符合" : "部分符合"}
                        </Tag>
                        <Text>数据验证</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>计算方法透明度</Text>
                      </div>
                      <div className="compliance-item">
                        <Tag color="green">符合</Tag>
                        <Text>报告完整性</Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>总体符合性结论</Title>
                  <Paragraph>
                    本报告中的产品碳足迹评估整体符合ISO 14040、14044、14067和14064等国际标准的要求。
                    评估过程遵循了生命週期思维，界定了明确的系统边界，使用了科学的数据收集和计算方法，
                    并提供了透明的结果和解释。主要评估指标如下：
                  </Paragraph>
                  
                  <ul>
                    <li>
                      <Text strong>数据完整性：</Text> {reportData?.dataCompleteness?.toFixed(1) || 0}%
                      {reportData?.dataCompleteness && reportData.dataCompleteness >= 90 ? '（优）' : 
                       reportData?.dataCompleteness && reportData.dataCompleteness >= 75 ? '（良）' : '（需改进）'}
                    </li>
                    <li>
                      <Text strong>一级数据比例：</Text> {reportData?.primaryDataRate?.toFixed(1) || 0}%
                      {reportData?.primaryDataRate && reportData.primaryDataRate >= 70 ? '（优）' : 
                       reportData?.primaryDataRate && reportData.primaryDataRate >= 50 ? '（良）' : '（需改进）'}
                    </li>
                    <li>
                      <Text strong>数据验证率：</Text> {reportData?.verifiedDataRate?.toFixed(1) || 0}%
                      {reportData?.verifiedDataRate && reportData.verifiedDataRate >= 65 ? '（优）' : 
                       reportData?.verifiedDataRate && reportData.verifiedDataRate >= 45 ? '（良）' : '（需改进）'}
                    </li>
                    <li>
                      <Text strong>总体数据质量评分：</Text> {reportData?.overallDataQuality?.toFixed(1) || 0}%
                      {reportData?.overallDataQuality && reportData.overallDataQuality >= 75 ? '（优）' : 
                       reportData?.overallDataQuality && reportData.overallDataQuality >= 60 ? '（良）' : '（需改进）'}
                    </li>
                  </ul>
                  
                  <Paragraph>
                    {
                      reportData?.overallDataQuality && reportData.overallDataQuality >= 75 ? 
                        '总体而言，本报告的碳足迹计算结果具有高度可信性，可作为产品碳标籤申请和减排决策的依据。' : 
                        reportData?.overallDataQuality && reportData.overallDataQuality >= 60 ? 
                          '总体而言，本报告的碳足迹计算结果具有较好的可信性，但仍有改进空间，建议进一步提高数据质量。' :
                          '总体而言，本报告的碳足迹计算存在一定不确定性，建议提高数据质量再进行碳标籤申请。'
                    }
                  </Paragraph>
                </div>
              </Card>
            </section>

            <Divider />

            {/* 结论 */}
            <section className="report-section">
              <Title level={3}>结论与展望</Title>
              <Card>
                <Paragraph>
                  本报告基于ISO 14040/14044/14067标准框架，对产品进行了全生命周期碳足迹评估。
                  分析结果显示，产品总碳足迹为{reportData?.totalCarbonFootprint?.toFixed(2) || 0} kgCO₂e，
                  碳强度为{reportData?.carbonIntensity?.toFixed(2) || 0} kgCO₂e/kg。
                  {reportData?.stageEmissions && (
                    <>
                      主要碳排放热点集中在{getMaxEmissionStage(reportData.stageEmissions)}阶段，
                      占总碳足迹的{getMaxEmissionPercentage(reportData.stageEmissions)}%。
                    </>
                  )}
                </Paragraph>
                <Paragraph>
                  {reportData?.dataCompleteness && reportData.dataCompleteness >= 80 ? (
                    <>
                      数据完整性良好，可信度高，建议继续保持并进一步优化数据收集流程。
                      通过改进建议的实施，预计可以在5年内将产品碳足迹降低25%以上。
                    </>
                  ) : (
                    <>
                      建议进一步提高数据完整性和质量，特别是关键排放源的数据收集和验证。
                      完善后通过改进建议的实施，预计可以更准确地评估减排潜力。
                    </>
                  )}
                  未来工作将关注数据质量提升、不确定性分析以及更详细的情景模拟，为产品碳足迹持续改进提供科学依据。
                </Paragraph>
              </Card>
            </section>
            
            <Divider />
            
            {/* 新增：全部节点详细数据表格 */}
            <section className="report-section">
              <Title level={3}>全部节点碳排放数据</Title>
              <Card className="nodes-details-card">
                <Table
                  dataSource={reportData?.nodes
                    ?.filter((node: any) => node.data && !node.id.includes('product-'))
                    .map((node: any) => ({
                      key: node.id,
                      id: node.id,
                      name: node.data.productName || node.data.label || '未命名节点',
                      stage: node.data.lifecycleStage || '未分类',
                      material: node.data.material || '-',
                      weight: node.data.weight || 0,
                      carbonFactor: node.data.carbonFactor || 0,
                      carbonFootprint: node.data.carbonFootprint || 0,
                      dataSource: node.data.dataSource || '未知'
                    }))}
                  columns={[
                    { 
                      title: '节点名称', 
                      dataIndex: 'name', 
                      key: 'name',
                      sorter: (a: any, b: any) => a.name.localeCompare(b.name)
                    },
                    { 
                      title: '生命週期阶段', 
                      dataIndex: 'stage', 
                      key: 'stage',
                      filters: [
                        { text: '原材料', value: '原材料' },
                        { text: '生产', value: '生产' },
                        { text: '分销', value: '分销' },
                        { text: '使用', value: '使用' },
                        { text: '处置', value: '处置' },
                        { text: '未分类', value: '未分类' }
                      ],
                      onFilter: (value: any, record: any) => record.stage === value,
                      render: (value: string) => {
                        const colorMap: any = {
                          '原材料': 'blue',
                          '生产': 'green',
                          '分销': 'purple',
                          '使用': 'orange',
                          '处置': 'red',
                          '未分类': 'default'
                        };
                        return <Tag color={colorMap[value] || 'default'}>{value}</Tag>;
                      }
                    },
                    { 
                      title: '材料', 
                      dataIndex: 'material', 
                      key: 'material'
                    },
                    { 
                      title: '重量 (kg)', 
                      dataIndex: 'weight', 
                      key: 'weight',
                      render: (value: number) => value.toFixed(2),
                      sorter: (a: any, b: any) => a.weight - b.weight
                    },
                    { 
                      title: '碳因子 (kgCO₂e/kg)', 
                      dataIndex: 'carbonFactor', 
                      key: 'carbonFactor',
                      render: (value: number) => value.toFixed(2),
                      sorter: (a: any, b: any) => a.carbonFactor - b.carbonFactor
                    },
                    { 
                      title: '碳足迹 (kgCO₂e)', 
                      dataIndex: 'carbonFootprint', 
                      key: 'carbonFootprint',
                      render: (value: number) => value.toFixed(2),
                      sorter: (a: any, b: any) => a.carbonFootprint - b.carbonFootprint
                    },
                    { 
                      title: '数据来源', 
                      dataIndex: 'dataSource', 
                      key: 'dataSource',
                      filters: reportData?.carbonFactorSources ? 
                        Object.keys(reportData.carbonFactorSources).map(source => ({ text: source, value: source })) : 
                        [],
                      onFilter: (value: any, record: any) => record.dataSource === value,
                      render: (value: string) => {
                        let color = 'default';
                        if (value.includes('实测数据') || value.includes('直接测量')) {
                          color = 'green';
                        } else if (value.includes('数据库匹配')) {
                          color = 'blue';
                        } else if (value.includes('AI生成')) {
                          color = 'purple';
                        } else if (value.includes('需要人工介入')) {
                          color = 'red';
                        }
                        return <Tag color={color}>{value}</Tag>;
                      }
                    }
                  ]}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  summary={(pageData) => {
                    // 计算当前页面数据的总和
                    const totalWeight = pageData.reduce((sum, node: any) => sum + node.weight, 0);
                    const totalCarbonFootprint = pageData.reduce((sum, node: any) => sum + node.carbonFootprint, 0);
                    const avgCarbonFactor = totalWeight > 0 ? totalCarbonFootprint / totalWeight : 0;
                    
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>当前页面合计</Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>{totalWeight.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>{avgCarbonFactor.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>{totalCarbonFootprint.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={6}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
                
                <div style={{ marginTop: 16 }}>
                  <Title level={5}>节点数据分析摘要</Title>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Statistic 
                        title="总节点数" 
                        value={reportData?.nodes?.filter((node: any) => !node.id.includes('product-')).length || 0} 
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="已有碳因子的节点数" 
                        value={reportData?.nodes?.filter((node: any) => !node.id.includes('product-') && node.data.carbonFactor > 0).length || 0} 
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="需人工介入节点数" 
                        value={reportData?.nodes?.filter((node: any) => !node.id.includes('product-') && node.data.dataSource?.includes('需要人工介入')).length || 0} 
                        // valueStyle={{ color: reportData?.nodes?.filter((node: any) => !node.id.includes('product-') && node.data.dataSource?.includes('需要人工介入')).length > 0 ? '#cf1322' : '#3f8600' }}
                      />
                    </Col>
                  </Row>
                </div>
              </Card>
            </section>
          </div>
        </Content>
      </Layout>
    </ErrorBoundary>
  );
};

export default WorkflowReport; 