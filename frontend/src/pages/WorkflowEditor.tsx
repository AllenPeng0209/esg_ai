import {
  PlusOutlined, DeleteOutlined, CopyOutlined, SendOutlined, SaveOutlined, 
  ArrowLeftOutlined, UndoOutlined, RedoOutlined, FileOutlined, FolderOutlined,
  ExperimentOutlined, CloudUploadOutlined, UploadOutlined, DownloadOutlined,
  BranchesOutlined, ExportOutlined, EditOutlined, FileSearchOutlined,
  SettingOutlined, CloseOutlined, EllipsisOutlined, BarChartOutlined,
  ThunderboltOutlined, ImportOutlined, CheckOutlined, AlertOutlined,
  WarningOutlined, InfoCircleOutlined, QuestionCircleOutlined, PaperClipOutlined,
  RobotOutlined, CarOutlined, UserOutlined, AppstoreAddOutlined, CheckCircleOutlined,
  ReloadOutlined, UpOutlined, DownOutlined, FolderAddOutlined
} from '@ant-design/icons';
import { 
  Button, Layout, Input, Select, InputNumber, DatePicker, Form, 
  message, Dropdown, Menu, Modal, Upload, Space, Divider, Spin,
  Collapse, Table, Tabs, List, Card, Tag, Tooltip, Switch, Progress,
  Empty, Popconfirm, notification, Row, Col, Typography, Badge, Alert,
  Radio, Drawer, Tree, Timeline, Checkbox, Skeleton, Descriptions
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  EdgeRemoveChange,
  MiniMap,
  Node,
  ReactFlowInstance,
  SelectionMode,
  useEdgesState,
  useNodesState,
  NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import ProductNode from '../components/nodes/ProductNode';
import { aiApi, vendorTaskApi } from '../services/api'; // 添加vendorTaskApi导入
import './WorkflowEditor.css';
// 引入xlsx库
import * as XLSX from 'xlsx';
import { workflowApi } from '../services/api';
// 引入dayjs作为日期处理工具
import type { Dayjs } from 'dayjs';

// 声明全局命名空间
declare namespace moment {
  interface Moment {
    format(format: string): string;
  }
}

// 声明全局变量，用于保存拖拽文件
declare global {
  interface Window {
    __GLOBAL_DRAGGED_FILE__: any;
  }
}

const { Header, Content, Sider } = Layout;
const { DirectoryTree } = Tree;
const { Option, OptGroup } = Select;
const { Text } = Typography;

// 将节点类型定义移到组件外部，避免重新渲染时重新创建
const nodeTypes = { 
  product: ProductNode,
  manufacturing: ProductNode,
  distribution: ProductNode,
  usage: ProductNode,
  disposal: ProductNode
};


// 原有的产品节点数据类型
interface BaseNodeData {
  label: string;
  NodeName: string;
  carbonFootprint: number;
  dataSource: string;
  lifecycleStage: string;
  emissionFactor: string;
  calculationMethod: string;
  uncertaintyScore: number;
  verificationStatus: string;
  applicableStandard: string;
  completionStatus: string;
  carbonFactor: number;
}


// 原有的产品节点数据类型
interface ProductNodeData {
  label: string;
  productName: string;
  weight: number;
  carbonFootprint: number;
  dataSource: string;
  lifecycleStage: string;
  emissionFactor: string;
  calculationMethod: string;
  uncertainty: string;
  uncertaintyScore: number;
  verificationStatus: string;
  applicableStandard: string;
  material?: string;
  supplier?: string;
  completionStatus: string;
  certaintyPercentage?: number;
  carbonFactor: number;
  quantity?: string;
  weight_per_unit?: string;
}

// 生产制造阶段节点数据类型
interface ManufacturingNodeData extends ProductNodeData {
  energyConsumption: number; // 能源消耗 (kWh)
  energyType: string; // 能源类型 (电力、天然气、煤等)
  processEfficiency: number; // 工艺效率 (%)
  wasteGeneration: number; // 废物产生量 (kg)
  waterConsumption: number; // 水资源消耗 (L)
  recycledMaterialPercentage?: number; // 回收材料使用比例 (%)
  productionCapacity: number; // 生产能力 (units/time)
  machineUtilization: number; // 设备利用率 (%)
  qualityDefectRate: number; // 质量缺陷率 (%)
  processTechnology: string; // 工艺技术
  manufacturingStandard: string; // 生产标准
  automationLevel: string; // 自动化水平 (高、中、低)
}

// 分销和储存阶段节点数据类型
interface DistributionNodeData extends ProductNodeData {
  transportationMode: string; // 运输方式 (公路、铁路、海运、空运)
  transportationDistance: number; // 运输距离 (km)
  startPoint: string; // 起点位置
  endPoint: string; // 终点位置
  vehicleType: string; // 车辆类型
  fuelType: string; // 燃料类型
  fuelEfficiency: number; // 燃油效率 (km/L)
  loadFactor: number; // 装载因子 (%)
  refrigeration: boolean; // 是否需要冷藏
  packagingMaterial: string; // 包装材料
  packagingWeight: number; // 包装重量 (kg)
  warehouseEnergy: number; // 仓库能源消耗 (kWh)
  storageTime: number; // 储存时间 (days)
  storageConditions: string; // 储存条件
  distributionNetwork: string; // 分销网络类型
  aiRecommendation?: string; // AI推荐的低碳运输方式
}

// 产品使用阶段节点数据类型
interface UsageNodeData extends ProductNodeData {
  lifespan: number; // 产品寿命 (years)
  energyConsumptionPerUse: number; // 每次使用能源消耗 (kWh)
  waterConsumptionPerUse: number; // 每次使用水资源消耗 (L)
  consumablesUsed: string; // 使用的消耗品
  consumablesWeight: number; // 消耗品重量 (kg)
  usageFrequency: number; // 使用频率 (次数/年)
  maintenanceFrequency: number; // 维护频率 (次数/年)
  repairRate: number; // 维修率 (%)
  userBehaviorImpact: number; // 用户行为影响 (1-10)
  efficiencyDegradation: number; // 效率降级率 (%/年)
  standbyEnergyConsumption: number; // 待机能耗 (kWh)
  usageLocation: string; // 使用地点 (室内/室外)
  usagePattern: string; // 使用模式
}

// 废弃处置阶段节点数据类型
interface DisposalNodeData extends ProductNodeData {
  recyclingRate: number; // 回收率 (%)
  landfillPercentage: number; // 填埋比例 (%)
  incinerationPercentage: number; // 焚烧比例 (%)
  compostPercentage: number; // 堆肥比例 (%)
  reusePercentage: number; // 重复使用比例 (%)
  hazardousWasteContent: number; // 有害废物含量 (%)
  biodegradability: number; // 生物降解性 (%)
  disposalEnergyRecovery: number; // 处置能源回收 (kWh/kg)
  transportToDisposal: number; // 到处置设施的运输距离 (km)
  disposalMethod: string; // 处置方法
  endOfLifeTreatment: string; // 生命周期末端处理
  recyclingEfficiency: number; // 回收效率 (%)
  dismantlingDifficulty: string; // 拆卸难度 (高、中、低)
}

// 定义所有节点数据类型的联合类型
type AllNodeData = ProductNodeData | ManufacturingNodeData | DistributionNodeData | UsageNodeData | DisposalNodeData;

// 在文件顶部添加类型定义（在ProductNodeData接口定义之前）
interface TreeNodeType {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNodeType[];
  fileType?: string;
  content?: string;
  data?: string;
  lifecycleStage?: string; // 添加生命周期阶段属性
}

// AI总结模块接口
interface AISummary {
  credibilityScore: number;
  missingLifecycleStages: string[];
  optimizableNode: {
    id: string;
    label: string;
    reason: string;
  } | null;
  manualRequiredNodes: {
    id: string;
    label: string;
  }[];
  uncertainAiNodes: {
    id: string;
    label: string;
    uncertaintyScore: number;
  }[];
  isExpanded: boolean;
}

const WorkflowEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [workflowName, setWorkflowName] = useState<string>("未命名工作流");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 拖拽相关状态
  const [draggedFile, setDraggedFile] = useState<any>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  
  // 添加历史记录状态
  const [history, setHistory] = useState<{nodes: Node[]; edges: Edge[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // 添加生命周期文件标准化相关的状态变量
  const [lifecycleAiProcessing, setLifecycleAiProcessing] = useState<boolean>(false);
  const [lifecycleStage, setLifecycleStage] = useState<string>('');
  const [originalLifecycleContent, setOriginalLifecycleContent] = useState<string>('');
  const [standardizedLifecycleContent, setStandardizedLifecycleContent] = useState<string>('');
  const [lifecycleFileModalVisible, setLifecycleFileModalVisible] = useState<boolean>(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<ProductNodeData> | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [rightSiderVisible, setRightSiderVisible] = useState(false);
  const [siderWidth, setSiderWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [fileMenuVisible, setFileMenuVisible] = useState(false);
  const [fileMenuPosition, setFileMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedFile, setSelectedFile] = useState<TreeNodeType | null>(null);
  const [bomAiModalVisible, setBomAiModalVisible] = useState(false);
  const [bomAiProcessing, setBomAiProcessing] = useState(false);
  const [originalBomContent, setOriginalBomContent] = useState('');
  const [standardizedBomContent, setStandardizedBomContent] = useState('');
  const [reportGenerating, setReportGenerating] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | undefined>(undefined);
  const [customVendorName, setCustomVendorName] = useState('');
  const [vendorTaskDescription, setVendorTaskDescription] = useState('');
  const [vendorTaskDeadline, setVendorTaskDeadline] = useState<Dayjs | null>(null);
  const [vendorModalVisible, setVendorModalVisible] = useState(false);
  const [editedVendorName, setEditedVendorName] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // 新增AI总结状态
  const [aiSummary, setAiSummary] = useState<AISummary>({
    credibilityScore: 0,
    missingLifecycleStages: [],
    optimizableNode: null,
    manualRequiredNodes: [],
    uncertainAiNodes: [],
    isExpanded: true
  });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 初始化时设置CSS变量，使AI总结位置正确
  useEffect(() => {
    document.documentElement.style.setProperty('--sider-width', `${siderWidth}px`);
  }, [siderWidth]);
  
  // 材料分解结果
  const [materialDecompositionResults, setMaterialDecompositionResults] = useState<{
    visible: boolean;
    originalNode: Node<ProductNodeData> | null;
    materials: any[];
  }>({
    visible: false,
    originalNode: null,
    materials: []
  });
  
  // 在 handleEdgesChange 之前声明 saveToHistory
  const saveToHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    console.log('保存历史记录，当前索引:', historyIndex);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // 在 useEffect 之前声明 handleUndo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      console.log('恢复到历史记录:', previousState);
      
      // 恢复节点和边的状态
      setNodes(JSON.parse(JSON.stringify(previousState.nodes)));
      setEdges(JSON.parse(JSON.stringify(previousState.edges)));
      setHistoryIndex(prev => prev - 1);
      
      // 清除当前选中状态
      setSelectedNode(null);
      setSelectedNodes([]);
      setRightSiderVisible(false);
    }
  }, [history, setNodes, setEdges]);

  // 处理边变化，包括删除边的情况
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // 检查是否有删除边的操作
    const removedEdges = changes
      .filter((change): change is EdgeRemoveChange => change.type === 'remove')
      .map(change => edges.find(edge => edge.id === change.id));
    
    // 提取受影响的目标节点ID
    const affectedTargets = removedEdges
      .filter(edge => edge && typeof edge.target === 'string')
      .map(edge => edge ? edge.target : '');
    
    // 应用所有变更
    onEdgesChange(changes);
    
    // 如果有边被删除，需要更新目标节点的数据
    if (removedEdges.length > 0) {
      console.log('检测到边被删除，更新受影响的节点');
      
      // 处理每个受影响的目标节点
      affectedTargets.forEach(targetId => {
        if (!targetId) return; // 确保目标ID存在
        
        // 查找所有连接到该目标节点的边（删除后剩余的边）
        const remainingEdges = edges.filter(
          edge => edge.target === targetId && 
          !removedEdges.some(removedEdge => 
            removedEdge && removedEdge.id === edge.id
          )
        );
        
        // 如果没有剩余的边，重置目标节点的累积值
        if (remainingEdges.length === 0) {
          console.log(`目标节点 ${targetId} 没有剩余连接，重置数据`);
          setNodes(nds => nds.map(node => {
            if (node.id === targetId) {
              // 保留原始数据，仅重置累积值
              return {
                ...node,
    data: { 
                  ...node.data,
                  // 重置为节点的初始/固有值，而不是简单设为0
                  weight: 0,
                  carbonFootprint: node.data.initCarbonFootprint || 0,
                  carbonFactor: node.data.initCarbonFactor || 0
                }
              };
            }
            return node;
          }));
        } else {
          console.log(`目标节点 ${targetId} 还有 ${remainingEdges.length} 个连接，重新计算累积值`);
          
          // 查找所有仍然连接到该目标节点的源节点
          const sourceNodes = nodes.filter(node => 
            remainingEdges.some(edge => edge && typeof edge.source === 'string' && edge.source === node.id)
          );
          
          // 计算总权重和碳排放量
          let totalWeight = 0;
          let totalCarbonFootprint = 0;
          
          sourceNodes.forEach(sourceNode => {
            totalWeight += sourceNode.data.weight || 0;
            totalCarbonFootprint += sourceNode.data.carbonFootprint || 0;
          });
          
          console.log(`重新计算: 总重量 ${totalWeight}, 总碳排放 ${totalCarbonFootprint}`);
          
          // 更新目标节点的数据
          setNodes(nds => nds.map(node => {
            if (node.id === targetId) {
              return {
                ...node,
    data: { 
                  ...node.data,
                  weight: parseFloat(totalWeight.toFixed(2)),
                  carbonFootprint: parseFloat(totalCarbonFootprint.toFixed(2)),
                  carbonFactor: totalWeight > 0 
                    ? parseFloat((totalCarbonFootprint / totalWeight).toFixed(2))
                    : node.data.carbonFactor
                }
              };
            }
            return node;
          }));
        }
      });
    }
    
    // 在边变化后保存历史记录
    setTimeout(() => {
      saveToHistory(nodes, edges);
    }, 0);
  }, [edges, nodes, onEdgesChange, setNodes, saveToHistory]);
    

  
  // 添加加载工作流数据的逻辑
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('正在加载工作流数据, ID:', id);
        const response = await workflowApi.getWorkflowById(parseInt(id));
        const workflowData = response.data;
        console.log('获取到的工作流数据:', workflowData);

        // 设置工作流名称
        setWorkflowName(workflowData.name);

        // 处理节点数据
        if (workflowData.nodes) {
          const processedNodes = workflowData.nodes.map((node: any) => ({
            id: node.node_id,
            type: node.node_type,
            position: { x: node.position_x, y: node.position_y },
            data: {
              ...node.data,
              label: node.label || node.data.label,
              productName: node.data.productName || node.label,
              weight: node.data.weight || 0,
              carbonFootprint: node.data.carbonFootprint || 0,
              dataSource: node.data.dataSource || '手动输入',
              lifecycleStage: node.data.lifecycleStage || '原材料',
              emissionFactor: node.data.emissionFactor || '',
              calculationMethod: node.data.calculationMethod || 'ISO 14067',
              uncertainty: node.data.uncertainty || '低',
              verificationStatus: node.data.verificationStatus || '未验证',
              applicableStandard: node.data.applicableStandard || 'ISO 14040',
              completionStatus: node.data.completionStatus || 'manual-required',
              carbonFactor: node.data.carbonFactor || 0
            }
          }));
          console.log('处理后的节点数据:', processedNodes);
          setNodes(processedNodes);
        }

        // 处理边数据
        if (workflowData.edges) {
          const processedEdges = workflowData.edges.map((edge: any) => ({
            id: edge.edge_id,
            source: edge.source,
            target: edge.target,
            type: 'default'
          }));
          console.log('处理后的边数据:', processedEdges);
          setEdges(processedEdges);
        }

        message.success('工作流数据加载成功');
      } catch (error) {
        console.error('加载工作流数据失败:', error);
        message.error('加载工作流数据失败，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [id, setNodes, setEdges]);
  
  // 文件系统数据，从常量改为状态
  const [treeData, setTreeData] = useState<TreeNodeType[]>([
    {
      title: 'BOM物料清单',
      key: 'bom',
      children: [
        {
          title: '示例_手机BOM清单.csv',
          key: 'bom-example-1',
          isLeaf: true,
          fileType: 'bom',
          content: `组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)
C001,前盖,铝合金,22.5,富士康,8.24
C002,后盖,钢化玻璃,26.8,旭硝子,0.85
C003,中框,铝合金,18.4,富士康,8.24
C004,电池,锂离子电池,46.2,LG化学,5.37
C005,主板PCB,复合材料,12.6,和硕,7.20`
        }
      ]
    },
    {
      title: '生产制造',
      key: 'manufacturing',
      children: [
        {
          title: '示例_金属零件生产标准化.csv',
          key: 'manufacturing-example-1',
          isLeaf: true,
          fileType: 'csv',
          lifecycleStage: 'manufacturing',
          content: `工序ID,工序名称,工序类型,重量(kg),碳排放因子(kgCO2e/kg),能源类型,能源消耗(kWh),工艺效率(%),废物产生量(kg),水资源消耗(L)
    P-001,原料处理,前处理,120,1.5,电力,500,85,12,150
    P-002,压制成型,加工,80,2.1,天然气,800,78,5,80
    P-003,热处理,热加工,90,3.2,电力,1200,82,8,200
    P-004,机械加工,精加工,65,1.8,电力,650,92,4,50
    P-005,表面处理,表面工艺,30,2.5,电力,350,88,6,180
    P-006,组装,组装,140,0.8,电力,280,95,2,30
    P-007,质量检测,检测,20,0.5,电力,150,98,1,10`,
         
        },
        {
          title: '示例_电子产品生产标准化.csv',
          key: 'manufacturing-example-2',
          isLeaf: true,
          fileType: 'csv',
          lifecycleStage: 'manufacturing',
          content: `工序ID,工序名称,工序类型,重量(kg),碳排放因子(kgCO2e/kg),能源类型,能源消耗(kWh),工艺效率(%),废物产生量(kg),水资源消耗(L)
    E-001,PCB制作,电子,0.15,12.5,电力,220,90,0.02,8
    E-002,芯片组装,电子,0.05,35.2,电力,180,92,0.01,5
    E-003,元件焊接,电子,0.12,10.8,电力,150,88,0.03,2
    E-004,屏幕组装,显示,0.28,18.6,电力,200,95,0.04,3
    E-005,外壳制作,结构,0.45,8.2,电力,260,85,0.08,12
    E-006,电池安装,电池,0.32,22.5,电力,120,98,0.02,1
    E-007,整机组装,组装,0.18,5.4,电力,80,96,0.01,1
    E-008,软件烧录,测试,0.00,0.0,电力,40,99,0.00,0`,
      
        }


      ]
    },
    {
      title: '分销和储存',
      key: 'distribution',
      children: [
        {
          title: '示例_产品分销路线标准化.csv',
          key: 'distribution-example-1',
          isLeaf: true,
          fileType: 'csv',
          lifecycleStage: 'distribution',
          content: `分销点ID,分销点名称,重量(kg),碳排放因子(kgCO2e/kg),运输方式,运输距离(km),起点位置,终点位置,车辆类型,燃料类型,燃油效率(km/L),冷藏需求,包装材料,包装重量(kg),仓库能源消耗(kWh),储存时间(天)
D-001,中央仓库,500,0.2,公路运输,0,,,,,,否,纸箱,20,1200,30
D-002,区域配送中心A,250,0.3,公路运输,150,中央仓库,区域配送中心A,重型卡车,柴油,3.5,否,纸箱,10,800,15
D-003,区域配送中心B,180,0.35,公路运输,200,中央仓库,区域配送中心B,重型卡车,柴油,3.2,否,纸箱,8,750,15
D-004,零售点A,50,0.4,公路运输,80,区域配送中心A,零售点A,轻型卡车,柴油,8.0,否,纸箱,2,200,7
D-005,零售点B,40,0.4,公路运输,120,区域配送中心A,零售点B,轻型卡车,柴油,7.8,否,纸箱,1.5,180,6
D-006,零售点C,35,0.4,公路运输,90,区域配送中心B,零售点C,轻型卡车,柴油,8.2,否,纸箱,1.2,160,5`,
          
        }
      ]
    },
    {
      title: '产品使用',
      key: 'usage',
      children: [
        {
          title: '示例_产品使用阶段标准化.csv',
          key: 'usage-example-1',
          isLeaf: true,
          fileType: 'csv',
          lifecycleStage: 'usage',
          content: `使用场景ID,使用场景名称,重量(kg),碳排放因子(kgCO2e/kg),产品寿命(年),能源消耗(kWh/次),水资源消耗(L/次),消耗品,消耗品重量(kg),使用频率(次/年),维护频率(次/年),维修率(%),用户行为影响,效率降级率(%/年),待机能耗(kWh),使用地点,使用模式
U-001,家庭日常使用,1.5,2.5,5,0.08,0.2,清洁剂,0.01,365,2,5,3,2,0.5,室内,普通使用
U-002,办公室使用,1.5,2.5,4,0.06,0.15,墨盒,0.05,260,1,3,2,2.5,0.3,室内,频繁使用
U-003,户外活动使用,1.5,3.0,3,0.1,0,电池,0.03,52,1,8,6,4,0.1,室外,间歇使用`,
         
        }
      ]
    },
    {
      title: '废弃处置',
      key: 'disposal',
      children: [
        {
          title: '示例_废弃处置阶段标准化.csv',
          key: 'disposal-example-1',
          isLeaf: true,
          fileType: 'csv',
          lifecycleStage: 'disposal',
          content: `处置项目ID,处置项目名称,重量(kg),碳排放因子(kgCO2e/kg),回收率(%),填埋比例(%),焚烧比例(%),堆肥比例(%),重复使用比例(%),有害废物含量(%),生物降解性(%),能源回收(kWh/kg),运输距离(km),处置方法,末端处理,回收效率(%),拆卸难度
W-001,包装废弃物,0.5,1.2,75,15,10,0,0,0,30,0.1,20,分类回收,循环利用,85,低
W-002,电池废弃物,0.03,5.5,90,0,10,0,0,60,0,0,30,专业回收,再生循环,80,中
W-003,塑料部件,0.8,2.3,60,30,10,0,0,5,10,0.3,20,混合处理,回收利用,70,低
W-004,金属部件,1.2,1.8,95,5,0,0,0,0,0,0,25,金属回收,冶炼再利用,92,中
W-005,电子元件,0.3,6.2,85,5,10,0,0,30,0,0.1,25,专业回收,材料回收,75,高`,
        
        }
      ]
    },
    {
      title: '产品设计文档',
      key: 'design',
      children: []
    }
  ]);

  // 添加新文件夹
  const addNewFolder = (parentKey: string | null) => {
    const newFolderName = '新建文件夹';
    const newFolder: TreeNodeType = {
      title: newFolderName,
      key: `folder-${Date.now()}`,
      children: []
    };

    setTreeData(prevData => {
      const newData = [...prevData];
      if (!parentKey) {
        // 添加到根目录
        return [...newData, newFolder];
      } else {
        // 添加到指定父文件夹
        const updateChildren = (nodes: TreeNodeType[]): TreeNodeType[] => {
          return nodes.map(node => {
            if (node.key === parentKey) {
              return {
                ...node,
                children: [...(node.children || []), newFolder]
              };
            }
            if (node.children) {
              return {
                ...node,
                children: updateChildren(node.children)
              };
            }
            return node;
          });
        };
        return updateChildren(newData);
      }
    });
  };

  // 重命名文件夹
  const renameFolder = (key: string, newName: string) => {
    setTreeData(prevData => {
      const updateTitle = (nodes: TreeNodeType[]): TreeNodeType[] => {
        return nodes.map(node => {
          if (node.key === key) {
            return { ...node, title: newName };
          }
          if (node.children) {
            return {
              ...node,
              children: updateTitle(node.children)
            };
          }
          return node;
        });
      };
      return updateTitle(prevData);
    });
  };

  // 删除文件夹
  const deleteFolder = (key: string) => {
    setTreeData(prevData => {
      const deleteNode = (nodes: TreeNodeType[]): TreeNodeType[] => {
        return nodes.filter(node => {
          if (node.key === key) {
            return false;
          }
          if (node.children) {
            node.children = deleteNode(node.children);
          }
          return true;
        });
      };
      return deleteNode(prevData);
    });
  };
  
  // 右键菜单
  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault(); // 阻止默认右键菜单
    
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (reactFlowBounds) {
      // 计算点击位置相对于ReactFlow容器的坐标
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      
      // 设置菜单位置（使用客户端坐标而非相对于ReactFlow的坐标）
      setMenuPosition({
        x: event.clientX,
        y: event.clientY
      });
      setClickPosition(position);
      
      // 显示菜单
      setMenuVisible(true);
    }
  };
  
  
  // 创建新节点
  const addNewNode = () => {
    if (reactFlowInstance) {
      const position = reactFlowInstance.project({
        x: clickPosition.x,
        y: clickPosition.y
      });
      
      const newNode = {
        id: `product-${Date.now()}`,
        type: 'product',
        position,
        data: {
          label: '新节点',
          productName: '新节点',
          weight: 0,
          carbonFootprint: 0,
          dataSource: '',
          lifecycleStage: '全生命周期',
          emissionFactor: '',
          calculationMethod: 'ISO 14067',
          uncertainty: '低',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14067',
          completionStatus: 'manual-required', // 默认为需要人工介入
          carbonFactor: 0, // 添加碳排放因子属性
          uncertaintyScore: 0,
          
        }
      };
      
      setNodes((nds: Node<ProductNodeData>[]) => nds.concat(newNode));
      setMenuVisible(false);
    }
  };
  
  // 添加生命周期阶段节点
  const addLifecycleStageNode = useCallback((stage: string, completionStatus: 'completed' | 'ai-supplemented' | 'manual-required' = 'manual-required') => {
    if (reactFlowInstance) {
      // 根据生命周期阶段设置节点位置
      let offsetX = 0;
      let offsetY = 0;
      
      switch (stage) {
        case '原材料':
          offsetX = -200;
          offsetY = -100;
          break;
        case '生产制造':
          offsetX = -100;
          offsetY = 0;
          break;
        case '分销和储存':
          offsetX = 0;
          offsetY = 100;
          break;
        case '产品使用':
          offsetX = 100;
          offsetY = 0;
          break;
        case '废弃处置':
          offsetX = 200;
          offsetY = -100;
          break;
      }
      
      const position = reactFlowInstance.project({
        x: clickPosition.x + offsetX,
        y: clickPosition.y + offsetY
      });
      
      // 设置默认的碳足迹值
      let carbonFootprint = 0;
      switch (stage) {
        case '原材料获取及预加工':
          carbonFootprint = 20;
          break;
        case '生产制造':
          carbonFootprint = 12;
          break;
        case '分销和储存':
          carbonFootprint = 4;
          break;
        case '产品使用':
          carbonFootprint = 3;
          break;
        case '废弃处置':
          carbonFootprint = 4;
          break;
      }
      
      // 基本节点数据
      const baseNodeData = {
        label: stage,
        productName: stage,
        weight: 0,
        carbonFootprint,
        dataSource: '手动输入',
        lifecycleStage: stage,
        emissionFactor: '',
        calculationMethod: 'ISO 14067',
        uncertainty: '中',
        verificationStatus: '未验证',
        applicableStandard: 'ISO 14040',
        completionStatus, // 设置完成状态
        carbonFactor: carbonFootprint / 10 // 设置默认碳排放因子
      };
      
      // 根据生命周期阶段添加特定数据
      let nodeData = {};
      let nodeType = 'product';
      
      switch (stage) {
        case '生产制造':
          nodeType = 'manufacturing';
          nodeData = {
            ...baseNodeData,
            energyConsumption: 1500, // 默认能源消耗 kWh
            energyType: '电力',
            processEfficiency: 85, // 默认工艺效率
            wasteGeneration: 50, // 废物产生量 kg
            waterConsumption: 200, // 水资源消耗 L
          };
          // 使用计算函数计算实际碳排放量
          nodeData = initializeNodeWithEmissions(nodeData);
          break;
          
        case '分销和储存':
          nodeType = 'distribution';
          nodeData = {
            ...baseNodeData,
            transportationMode: '公路运输',
            transportationDistance: 500, // km
            vehicleType: '重型卡车',
            fuelType: '柴油',
            fuelEfficiency: 3.5, // km/L
            loadFactor: 70, // %
            packagingMaterial: '纸箱',
            packagingWeight: 0.5, // kg
            warehouseEnergy: 200, // kWh
            storageTime: 30, // days
          };
          // 使用计算函数计算实际碳排放量
          nodeData = initializeNodeWithEmissions(nodeData);
          break;
          
        case '产品使用':
          nodeType = 'usage';
          nodeData = {
            ...baseNodeData,
            lifespan: 5, // 年
            energyConsumptionPerUse: 0.5, // kWh
            waterConsumptionPerUse: 2, // L
            usageFrequency: 200, // 次/年
            maintenanceFrequency: 2, // 次/年
            repairRate: 5, // %
            userBehaviorImpact: 6, // 1-10
            efficiencyDegradation: 3, // %/年
            standbyEnergyConsumption: 0.1, // kWh
          };
          // 使用计算函数计算实际碳排放量
          nodeData = initializeNodeWithEmissions(nodeData);
          break;
          
        case '废弃处置':
          nodeType = 'disposal';
          nodeData = {
            ...baseNodeData,
            recyclingRate: 40, // %
            landfillPercentage: 30, // %
            incinerationPercentage: 20, // %
            compostPercentage: 5, // %
            reusePercentage: 5, // %
            hazardousWasteContent: 1, // %
            biodegradability: 20, // %
            disposalEnergyRecovery: 0.2, // kWh/kg
            transportToDisposal: 50, // km
            disposalMethod: '混合处理',
          };
          // 使用计算函数计算实际碳排放量
          nodeData = initializeNodeWithEmissions(nodeData);
          break;
          
        default:
          nodeData = baseNodeData;
          break;
      }
      
      const newNode = {
        id: `${stage.substring(0, 2)}-${Date.now()}`,
        type: nodeType,
        position,
        data: nodeData
      };
      
      setNodes((nds: Node<AllNodeData>[]) => nds.concat(newNode as any));
    }
  }, [reactFlowInstance, clickPosition]);

  // 添加所有生命周期阶段节点
  const addAllLifecycleStages = useCallback(() => {
    // 原材料获取及预加工 - 绿色表示从BOM拆分得到已完成
    // 生产制造 - 黄色表示AI补充
    addLifecycleStageNode('生产制造', 'manual-required');
    
    // 分销和储存 - 红色表示需要人工介入
    addLifecycleStageNode('分销和储存', 'manual-required');
    
    // 产品使用 - 红色表示需要人工介入
    addLifecycleStageNode('产品使用', 'manual-required');
    
    // 废弃处置 - 红色表示需要人工介入
    addLifecycleStageNode('废弃处置', 'manual-required');
    
    setMenuVisible(false);
  }, [addLifecycleStageNode]);
  
  // 删除选择的节点
  const deleteSelectedNodes = useCallback(() => {
    console.log('执行删除操作，选中节点数:', selectedNodes.length);
    
    // 在删除前保存当前状态到历史记录
    saveToHistory(nodes, edges);
    
    if (selectedNodes.length > 0) {
      // 删除所有选中的节点
      setNodes((nds) => nds.filter(node => !selectedNodes.some(selectedNode => selectedNode.id === node.id)));
      
      // 删除与这些节点相关的边
      const selectedNodeIds = selectedNodes.map(node => node.id);
      setEdges((eds) => eds.filter(edge => 
        !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
      ));
      
      // 如果原来单选的节点在选择集中，清除它
      if (selectedNode && selectedNodes.some(node => node.id === selectedNode.id)) {
        setSelectedNode(null);
        setRightSiderVisible(false);
      }
      
      // 清空选择集
      setSelectedNodes([]);
      setMenuVisible(false);
    } else if (selectedNode) {
      // 如果没有多选，但有单选节点，执行单节点删除
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
      setRightSiderVisible(false);
      setMenuVisible(false);
    }
  }, [selectedNodes, selectedNode, nodes, edges, saveToHistory]);

  // 添加键盘事件监听，支持Delete键删除节点
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检测到按下Delete键时删除选中的节点
      if (event.key === 'Delete') {
        console.log('检测到Delete键按下，执行删除操作');
        deleteSelectedNodes();
      }
      
      // 检测Ctrl+Z组合键
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
      }
    };

    // 添加键盘事件监听
    window.addEventListener('keydown', handleKeyDown);

    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedNodes, handleUndo]);

  // 处理节点选择
  const onSelectionChange = useCallback((params: { nodes: Node<ProductNodeData>[]; edges: Edge[] }) => {
    setSelectedNodes(params.nodes);
  }, []);

  // 复制节点
  const duplicateNode = () => {
    if (selectedNode) {
      const newNodeId = `product-${Date.now()}`;
      const newNode = {
        ...selectedNode,
        id: newNodeId,
      position: {
          x: selectedNode.position.x + 50,
          y: selectedNode.position.y + 50
        }
      };
      
      setNodes((nds: Node<ProductNodeData>[]) => nds.concat(newNode));
      message.success('节点已复制');
    } else {
      message.info('请先选择一个节点');
    }
    setMenuVisible(false);
  };
  
  // AI协作
  const openAiCollaboration = () => {
    setAiModalVisible(true);
    setMenuVisible(false);
  };
  
  // 提交AI请求
  const submitAiRequest = () => {
    setAiResponse('正在分析产品碳足迹数据...');
    
    // 模拟AI处理延迟
    setTimeout(() => {
      setAiResponse("待实现");
    }, 2000);
  };
  
  // 计算碳足迹
  const calculateCarbonFootprint = () => {
    if (selectedNodes.length === 0 && !selectedNode) {
      message.info('请先选择需要计算的节点');
      return;
    }

    // 获取需要处理的节点，并确保它们不为null
    const initialNodes: (Node<ProductNodeData> | null)[] = selectedNodes.length > 0 ? selectedNodes : [selectedNode];
    const targetNodes = initialNodes.filter((node): node is Node<ProductNodeData> => node !== null);
    
    // 如果没有有效节点，直接返回
    if (targetNodes.length === 0) {
      message.warning('没有可计算的有效节点');
      return;
    }
    
    // 保存当前状态到历史记录
    saveToHistory(nodes, edges);

    // 处理每个选中的节点
    targetNodes.forEach(targetNode => {
      if (!targetNode.id) {
        console.warn('跳过无效节点');
        return;
      }

      // 查找所有连接到该节点的边
      const connectedEdges = edges.filter(edge => edge.target === targetNode.id);
      
      if (connectedEdges.length > 0) {
        // 查找所有源节点
        const sourceNodes = nodes.filter(node => 
          connectedEdges.some(edge => edge.source === node.id)
        );
        
        // 计算总重量和碳排放量
        let totalWeight = 0;
        let totalCarbonFootprint = 0;
        
        sourceNodes.forEach(sourceNode => {
          if (sourceNode && sourceNode.data) {
            totalWeight += sourceNode.data.weight || 0;
            totalCarbonFootprint += sourceNode.data.carbonFootprint || 0;
          }
        });
        
        // 更新目标节点
        setNodes(nds => nds.map(node => {
          if (node.id === targetNode.id) {
            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                weight: parseFloat(totalWeight.toFixed(2)),
                carbonFootprint: parseFloat(totalCarbonFootprint.toFixed(2)),
                carbonFactor: totalWeight > 0 
                  ? parseFloat((totalCarbonFootprint / totalWeight).toFixed(2))
                  : node.data.carbonFactor,
                dataSource: '累加计算'
              }
            };
            
            // 如果是最终产品节点，更新其状态
            if (node.data.lifecycleStage === '最终产品') {
              updatedNode.data.completionStatus = 'completed';
            }
            
            return updatedNode;
          }
          return node;
        }));
        
        message.success(`节点 ${targetNode.data.productName || targetNode.data.label || '未命名节点'} 的数据已更新`);
      } else {
        // 如果没有输入边，检查是否有初始值
        setNodes(nds => nds.map(node => {
          if (node.id === targetNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                weight: node.data.weight || 0,
                carbonFootprint: node.data.CarbonFootprint || 
                  (node.data.Weight && node.data.carbonFactor ? 
                    node.data.Weight * node.data.carbonFactor : 0),
                carbonFactor:  node.data.carbonFactor || 0
              }
            };
          }
          return node;
        }));
        
        message.info(`节点 ${targetNode.data.productName || targetNode.data.label || '未命名节点'} 没有输入连接，已恢复初始值`);
      }
    });
    
    // 更新AI总结
    setTimeout(() => updateAiSummary(), 100);
  };

  // 点击节点
  const handleNodeClick = (evt: any, node: any) => {
    console.log('点击节点:', node.id, '当前数据:', node.data);
    
    // 检查节点是否已经被选中
    if (selectedNode && selectedNode.id === node.id) {
      // 如果点击的是当前已选节点，关闭属性面板
      console.log('再次点击已选节点，关闭属性面板');
      closePropertiesPanel();
      return;
    }
    
    // 确保节点数据的完整性
    let updatedData = { ...node.data };
    let needsUpdate = false;
    
    if (!updatedData.productName) {
      console.log('节点缺少productName属性，添加默认值');
      updatedData.productName = updatedData.label || '未命名产品';
      needsUpdate = true;
    }
    
    if (!updatedData.label) {
      console.log('节点缺少label属性，添加默认值');
      updatedData.label = updatedData.productName || '未命名产品';
      needsUpdate = true;
    }
    
    // 如果数据需要更新，先更新节点数据
    if (needsUpdate) {
      setNodes(nds => 
        nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              data: updatedData
            };
          }
          return n;
        })
      );
      
      // 使用更新后的数据创建新的节点对象
      node = {
        ...node,
        data: updatedData
      };
    }
    
    // 更新节点状态并显示属性面板
    console.log('选中节点:', node.id, '展示属性面板');
    setSelectedNode(node);
    setRightSiderVisible(true);
    
    // 防止事件冒泡到画布
    evt.stopPropagation();
  };
  
  // 关闭属性面板
  const closePropertiesPanel = () => {
    // 先添加退出动画类名
    const panel = document.querySelector('.properties-sider');
    if (panel) {
      panel.classList.add('properties-exit');
      
      // 等待动画完成后再隐藏面板
      setTimeout(() => {
        setRightSiderVisible(false);
        // 清除选中节点
        setSelectedNode(null);
      }, 300);
    } else {
      setRightSiderVisible(false);
      setSelectedNode(null);
    }
  };
  
  // 点击空白处关闭面板
  const onPaneClick = () => {
    // 点击空白区域时关闭菜单
    setMenuVisible(false);
    // 清除选中节点
    setSelectedNode(null);
    setRightSiderVisible(false);
    setSelectedNodes([]);
  };

  // 连接节点
  const onConnect = useCallback((params: Connection) => {
    // 添加新边
    setEdges((eds) => {
      const newEdges = addEdge(params, eds);
      
      // 立即执行更新目标节点数据的操作，不使用setTimeout
      if (params.target) {
        console.log(`正在更新目标节点 ${params.target} 的数据`);
        
        // 查找目标节点和与其相连的所有源节点
        const targetNode = nodes.find(node => node.id === params.target);
        if (!targetNode) return newEdges;
        
        // 查找所有连接到目标节点的边，包括刚刚添加的新边
        const targetEdges = [...eds, { 
          source: params.source || '', // 确保source不为null
          target: params.target,
          id: `temp-${params.source || 'unknown'}-${params.target}`
        }];
        
        // 过滤连接到目标节点的边，使用类型安全的方式
        const connectedEdges = targetEdges.filter(
          edge => edge && typeof edge.target === 'string' && edge.target === params.target
        );
        
        // 查找所有源节点，确保边的source属性存在且类型正确
        const sourceNodes = nodes.filter(node => 
          connectedEdges.some(edge => 
            edge && typeof edge.source === 'string' && edge.source === node.id
          )
        );
        
        // 计算总权重和碳排放量
        let totalWeight = 0;
        let totalCarbonFootprint = 0;
        
        sourceNodes.forEach(sourceNode => {
          console.log(`源节点 ${sourceNode.id} 的碳排放: ${sourceNode.data.carbonFootprint}`);
          totalWeight += sourceNode.data.weight || 0;
          totalCarbonFootprint += sourceNode.data.carbonFootprint || 0;
        });
        
        console.log(`总重量: ${totalWeight}, 总碳排放: ${totalCarbonFootprint}`);
        
        // 更新目标节点的数据
        setTimeout(() => {
          setNodes(nds => nds.map(node => {
            if (node.id === params.target) {
              return {
                ...node,
                data: {
                  ...node.data,
                  weight: parseFloat(totalWeight.toFixed(2)),
                  carbonFootprint: parseFloat(totalCarbonFootprint.toFixed(2)),
                  // 如果有权重，重新计算碳排放因子
                  carbonFactor: totalWeight > 0 
                    ? parseFloat((totalCarbonFootprint / totalWeight).toFixed(2))
                    : node.data.carbonFactor
                }
              };
            }
            return node;
          }));
          
          message.success(`已自动计算节点连接的总重量和碳排放量`, 1);
        }, 50);
      }
      
      return newEdges;
    });
  }, [setEdges, nodes, setNodes]);

  // 计算总碳足迹
  const calculateTotalCarbonFootprint = () => {
    return nodes
      .filter(node => node.data.lifecycleStage !== '最终产品') // 排除最终产品节点
      .reduce((total, node) => {
        return total + (node.data.carbonFootprint || 0);
      }, 0);
  };

  // 计算总重量
  const calculateTotalWeight = () => {
    return nodes
      .filter(node => node.data.lifecycleStage !== '最终产品') // 排除最终产品节点
      .reduce((total, node) => {
        return total + (node.data.weight || 0);
      }, 0);
  };

  // 计算数据完整性
  const calculateDataCompleteness = () => {
    const filteredNodes = nodes.filter(node => node.data.lifecycleStage !== '最终产品');
    const totalNodes = filteredNodes.length;
    if (totalNodes === 0) return 0;

    const completedNodes = filteredNodes.filter(node => 
      node.data.completionStatus === 'completed' || 
      (node.data.carbonFootprint && node.data.weight)
    ).length;

    return (completedNodes / totalNodes) * 100;
  };

  // 计算一手数据比率
  const calculatePrimaryDataRate = () => {
    const filteredNodes = nodes.filter(node => node.data.lifecycleStage !== '最终产品');
    const totalNodes = filteredNodes.length;
    if (totalNodes === 0) return 0;

    const primaryDataNodes = filteredNodes.filter(node => 
      node.data.dataSource?.includes('实测') || 
      node.data.dataSource?.includes('直接测量')
    ).length;

    return (primaryDataNodes / totalNodes) * 100;
  };

  // 计算已验证数据比率
  const calculateVerifiedDataRate = () => {
    const filteredNodes = nodes.filter(node => node.data.lifecycleStage !== '最终产品');
    const totalNodes = filteredNodes.length;
    if (totalNodes === 0) return 0;

    const verifiedNodes = filteredNodes.filter(node => 
      node.data.verificationStatus === 'verified'
    ).length;

    return (verifiedNodes / totalNodes) * 100;
  };

  // 计算各阶段排放
  const calculateStageEmissions = () => {
    const stages: Record<string, { carbonFootprint: number; percentage: number; nodesCount: number }> = {};
    
    // 过滤掉最终产品节点后计算总碳排放
    const validNodes = nodes.filter(node => node.data.lifecycleStage !== '最终产品');
    const totalCarbonFootprint = validNodes.reduce((total, node) => {
      return total + (node.data?.carbonFootprint || 0);
    }, 0);

    // 初始化各阶段数据
    const stageMap: Record<string, string> = {
      '原材料': '原材料',
      '生产制造': '生产',
      '分销和储存': '分销',
      '产品使用': '使用',
      '废弃处置': '处置'
    };

    Object.values(stageMap).forEach(stage => {
      stages[stage] = {
        carbonFootprint: 0,
        percentage: 0,
        nodesCount: 0
      };
    });

    // 添加未分类阶段
    stages['未分类'] = {
      carbonFootprint: 0,
      percentage: 0,
      nodesCount: 0
    };

    // 统计各阶段数据
    validNodes.forEach((node: Node<any>) => {
      if (!node.data) return;
      
      let stage = node.data.lifecycleStage || '未分类';
      // 映射阶段名称
      stage = Object.entries(stageMap).find(([key]) => key === stage)?.[1] || stage;
      
      if (!stages[stage]) {
        stages[stage] = {
          carbonFootprint: 0,
          percentage: 0,
          nodesCount: 0
        };
      }

      const carbonFootprint = node.data.carbonFootprint || 0;
      stages[stage].carbonFootprint += carbonFootprint;
      stages[stage].nodesCount += 1;
    });

    // 计算百分比
    if (totalCarbonFootprint > 0) {
      Object.keys(stages).forEach(stage => {
        stages[stage].percentage = (stages[stage].carbonFootprint / totalCarbonFootprint) * 100;
      });
    }

    return stages;
  };

  // 计算碳因子来源分布
  const calculateCarbonFactorSources = () => {
    const sources: Record<string, number> = {};
    
    nodes
      .filter(node => node.data.lifecycleStage !== '最终产品')
      .forEach(node => {
        const source = node.data.dataSource || '未知来源';
        sources[source] = (sources[source] || 0) + 1;
      });

    return sources;
  };

  // 计算热点节点
  const calculateHotspotNodes = () => {
    // 过滤掉最终产品节点
    const validNodes = nodes.filter(node => node.data.lifecycleStage !== '最终产品');
    const totalCarbonFootprint = validNodes.reduce((sum, node) => sum + (node.data.carbonFootprint || 0), 0);
    
    return validNodes
      .map(node => ({
        id: node.id,
        name: node.data.productName || node.data.label || '未命名节点',
        stage: node.data.lifecycleStage || '未分类',
        carbonFootprint: node.data.carbonFootprint || 0,
        percentage: totalCarbonFootprint > 0 ? 
          ((node.data.carbonFootprint || 0) / totalCarbonFootprint * 100) : 0
      }))
      .sort((a, b) => b.carbonFootprint - a.carbonFootprint)
      .slice(0, 5); // 取前5个最大排放源
  };

  // 保存工作流
  const saveWorkflow = async () => {
    try {
      // 验证工作流名称
      if (!workflowName || workflowName.trim() === '') {
        message.error('工作流名称不能为空');
        return;
      }

      // 验证是否有节点
      if (nodes.length === 0) {
        message.error('工作流中至少需要一个节点');
        return;
      }

      console.log('开始保存工作流，当前节点数量:', nodes.length);

      // 处理节点数据，确保所有必要字段都有值
      const processedNodes = nodes.map(node => {
        console.log('处理节点:', node.id, node.data);
        return {
          node_id: node.id,
          node_type: node.type || 'product',
          label: node.data.label || node.data.productName || '未命名节点',
          position_x: node.position.x,
          position_y: node.position.y,
          data: {
            ...node.data,
            label: node.data.label || '未命名节点',
            productName: node.data.productName || '未命名产品',
            weight: node.data.weight || 0,
            carbonFootprint: node.data.carbonFootprint || 0,
            dataSource: node.data.dataSource || '手动输入',
            lifecycleStage: node.data.lifecycleStage || '原材料',
            emissionFactor: node.data.emissionFactor || '',
            calculationMethod: node.data.calculationMethod || 'ISO 14067',
            uncertainty: node.data.uncertainty || '低',
            verificationStatus: node.data.verificationStatus || '未验证',
            applicableStandard: node.data.applicableStandard || 'ISO 14040',
            completionStatus: node.data.completionStatus || 'manual-required',
            carbonFactor: node.data.carbonFactor || 0
          }
        };
      });

      console.log('处理后的节点数据:', processedNodes);

      // 处理边数据，确保所有必要字段都有值
      const processedEdges = edges.map(edge => {
        console.log('处理边:', edge.id);
        return {
          edge_id: edge.id,
          source: edge.source,
          target: edge.target
        };
      });

      console.log('处理后的边数据:', processedEdges);

      // 收集工作流数据
      const workflowData = {
        name: workflowName.trim(),
        description: `${workflowName.trim()} 的碳足迹分析工作流`,
        is_public: false,
        total_carbon_footprint: calculateTotalCarbonFootprint(),
        data: {
          total_weight: calculateTotalWeight(),
          data_completeness: calculateDataCompleteness(),
          primary_data_rate: calculatePrimaryDataRate(),
          verified_data_rate: calculateVerifiedDataRate(),
          stage_emissions: calculateStageEmissions(),
          carbon_factor_sources: calculateCarbonFactorSources(),
          hotspot_nodes: calculateHotspotNodes(),
          last_modified: new Date().toISOString()
        },
        nodes: processedNodes,
        edges: processedEdges
      };

      // 打印请求数据以便调试
      console.log('准备发送的工作流数据:', JSON.stringify(workflowData, null, 2));

      let response;
      let workflowId: string | number; // 声明workflowId变量
      
      if (id) {
        // 如果有 ID，更新现有工作流
        console.log(`正在更新工作流 ${id}`);
        response = await workflowApi.updateWorkflow(parseInt(id), workflowData);
        workflowId = id;
        console.log('工作流更新成功，响应数据:', response.data);
      } else {
        // 如果没有 ID，创建新工作流
        console.log('正在创建新工作流');
        response = await workflowApi.createWorkflow(workflowData);
        workflowId = response.data.id;
        console.log('新工作流创建成功，响应数据:', response.data);
        // 更新 URL 中的 ID
        navigate(`/workflow/${workflowId}`, { replace: true });
      }
      
      message.success('工作流保存成功');
    } catch (error: any) {
      console.error('保存工作流失败:', error);
      
      // 详细的错误信息处理
      let errorMessage = '保存工作流失败';
      if (error.response) {
        console.error('错误响应:', error.response);
        if (error.response.data && error.response.data.detail) {
          errorMessage += `: ${error.response.data.detail}`;
        } else if (error.response.status === 422) {
          errorMessage += ': 数据验证失败，请检查所有必填字段';
        }
      }
      
      message.error(errorMessage);
    }
  };
  
  // 返回仪表盘
  const goToDashboard = () => {
    navigate('/dashboard');
  };
  
  // 右键菜单选项
  const rightClickMenu = (
    <Menu onClick={({ key }) => {
      switch (key) {
        case 'add':
          addNewNode();
          break;
        case 'delete':
          deleteSelectedNodes();
          break;
        case 'duplicate':
          duplicateNode();
          break;
        case 'decompose':
          decomposeProductMaterials();
          break;
        case 'distributeToVendor':
          distributeToVendor();
          break;
        case 'aiAnalyze':
          openAiCollaboration();
          break;
        case 'addAllLifecycleStages':
          addAllLifecycleStages();
          break;
        case 'rawMaterial':
          addLifecycleStageNode('原材料', 'manual-required');
          break;
        case 'manufacturing':
          addLifecycleStageNode('生产制造', 'manual-required');
          break;
        case 'distribution':
          addLifecycleStageNode('分销和储存', 'manual-required');
          break;
        case 'usage':
          addLifecycleStageNode('产品使用', 'manual-required');
          break;
        case 'disposal':
          addLifecycleStageNode('废弃处置', 'manual-required');
          break;
      }
      setMenuVisible(false);
    }} style={{ minWidth: '180px' }}>
      <Menu.Item key="add" icon={<PlusOutlined />}>添加新节点</Menu.Item>
      <Menu.Item key="delete" icon={<DeleteOutlined />} disabled={selectedNodes.length === 0 && !selectedNode}>删除{selectedNodes.length > 0 ? `选中的 ${selectedNodes.length} 个节点` : '节点'}</Menu.Item>
      <Menu.Item key="duplicate" icon={<CopyOutlined />} disabled={!selectedNode || selectedNodes.length > 1}>复制节点</Menu.Item>
      <Menu.Item key="decompose" icon={<BranchesOutlined />} disabled={!selectedNode || selectedNodes.length > 1}>分解材料</Menu.Item>
      <Menu.Item key="distributeToVendor" icon={<ExportOutlined />} disabled={!selectedNode || selectedNodes.length > 1}>分发供应商填写</Menu.Item>
      <Menu.Divider />
      <Menu.SubMenu key="lifecycle" title={<span><BranchesOutlined /> 添加生命周期阶段</span>}>
        <Menu.Item key="rawMaterial" icon={<ExperimentOutlined />}>原材料阶段</Menu.Item>
        <Menu.Item key="manufacturing" icon={<SettingOutlined />}>生产制造阶段</Menu.Item>
        <Menu.Item key="distribution" icon={<CarOutlined />}>分销和储存阶段</Menu.Item>
        <Menu.Item key="usage" icon={<UserOutlined />}>产品使用阶段</Menu.Item>
        <Menu.Item key="disposal" icon={<DeleteOutlined />}>废弃处置阶段</Menu.Item>
        <Menu.Divider />
        <Menu.Item key="addAllLifecycleStages" icon={<AppstoreAddOutlined />}>添加所有阶段</Menu.Item>
      </Menu.SubMenu>
      <Menu.Item key="aiAnalyze" icon={<RobotOutlined />}>AI辅助分析</Menu.Item>
    </Menu>
  );

  // 文件树选择处理
  const onSelectFile = (selectedKeys: React.Key[], info: any) => {
    if (info.node && info.node.isLeaf) {
      console.log('选择文件:', info.node.title);
    }
  };

  // 文件树右键菜单处理
  const onFileTreeRightClick = (info: any) => {
    if (!info || !info.node) return;
    
    // 阻止默认右键菜单
    if (info.event) {
      info.event.preventDefault();
      info.event.stopPropagation();
    }

    // 如果已经显示菜单，先关闭它
    if (fileMenuVisible) {
      setFileMenuVisible(false);
      return;
    }
    
    setSelectedFile(info.node);
    setFileMenuPosition({
      x: info.event.clientX,
      y: info.event.clientY
    });
    setFileMenuVisible(true);
  };

  // 修改处理文件上传的函数，添加目标文件夹参数
  const handleBomFileUpload = (file: File, targetFolderKey?: string) => {
    console.log('上传BOM文件:', file.name, '目标文件夹:', targetFolderKey);
    
    // 检查文件类型
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      message.warning('当前只支持CSV和Excel格式的BOM文件');
      return false;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target && e.target.result) {
        try {
          let content = '';
          
          // 根据文件类型处理内容
          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // 处理Excel文件
            try {
              const data = e.target.result;
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              content = XLSX.utils.sheet_to_csv(worksheet);
            } catch (excelError) {
              console.error('Excel文件处理失败:', excelError);
              message.error('Excel文件处理失败，请检查文件格式或尝试另存为CSV格式');
              return;
            }
          } else {
            // 处理CSV文件
            content = e.target.result as string;
          }
          
          // 尝试解码内容
          let decodedContent;
          try {
            const decoder = new TextDecoder('utf-8');
            decodedContent = decoder.decode(new TextEncoder().encode(content));
          } catch (decodeError) {
            decodedContent = content;
          }
          
          // 创建新的文件节点
          const newFileNode: TreeNodeType = {
            title: file.name,
            key: `file-${Date.now()}`,
            isLeaf: true,
            fileType: 'bom',
            content: decodedContent,
            data: decodedContent
          };
          
          // 更新树形数据
          setTreeData(prevData => {
            const newData = [...prevData];
            
            // 如果指定了目标文件夹，将文件添加到该文件夹下
            if (targetFolderKey) {
              const updateNode = (nodes: TreeNodeType[]): TreeNodeType[] => {
                return nodes.map(node => {
                  if (node.key === targetFolderKey) {
                    return {
                      ...node,
                      children: [...(node.children || []), newFileNode]
                    };
                  }
                  if (node.children) {
                    return {
                      ...node,
                      children: updateNode(node.children)
                    };
                  }
                  return node;
                });
              };
              return updateNode(newData);
            } else {
              // 如果没有指定目标文件夹，默认添加到 BOM 文件夹
              const bomNode = newData.find(item => item.key === 'bom');
              if (bomNode && bomNode.children) {
                bomNode.children = [...bomNode.children, newFileNode];
              }
            }
            return newData;
          });
          
          message.success(`成功添加文件: ${file.name}`);
        } catch (error) {
          console.error('处理文件时出错:', error);
          message.error('处理文件时出错，请检查文件格式');
        }
      }
    };
    
    reader.onerror = () => {
      message.error('读取文件失败，请检查文件格式');
    };
    
    // 根据文件类型选择不同的读取方式
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'GB2312');
    }
    
    return false;
  };

  // 修改处理文件上传到文件夹的函数
  const handleFileUploadToFolder = (folderKey: string) => {
    // 创建一个隐藏的文件输入框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleBomFileUpload(file, folderKey);
      }
    };
    
    // 触发文件选择对话框
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // 修改顶部上传按钮的处理函数
  const handleTopUpload = (file: File) => {
    if (file instanceof File) {
      handleBomFileUpload(file);
    }
    return Promise.resolve();
  };

  // 关闭文件右键菜单
  const closeFileMenu = () => {
    setFileMenuVisible(false);
  };

  // 处理文件菜单选项点击
  const handleFileMenuClick = ({ key }: { key: string }) => {
    if (!selectedFile) return;
    
    switch (key) {
      case 'preview':
        // 预览文件
        if (selectedFile.content) {
          // 解析CSV内容为表格数据
          const parseCSVContent = (content: string) => {
            // 尝试不同的行分隔符
            let lines = content.split('\n');
            if (lines.length <= 1) {
              lines = content.split('\r\n');
            }
            if (lines.length <= 1) {
              lines = content.split('\r');
            }
            
            if (lines.length === 0) return { columns: [], dataSource: [] };
            
            // 尝试不同的分隔符解析表头
            let headers = lines[0].split(',').map((h: string) => h.trim());
            if (headers.length <= 1) {
              headers = lines[0].split(';').map((h: string) => h.trim());
            }
            if (headers.length <= 1) {
              headers = lines[0].split('\t').map((h: string) => h.trim());
            }
            
            // 创建表格列
            const columns = headers.map((header: string, index: number) => ({
              title: header,
              dataIndex: `col${index}`,
              key: `col${index}`,
              ellipsis: true,
            }));
            
            // 解析数据行
            const dataSource = [];
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // 尝试不同的分隔符拆分行
              let values = line.split(',').map((v: string) => v.trim());
              if (values.length <= 1) {
                values = line.split(';').map((v: string) => v.trim());
              }
              if (values.length <= 1) {
                values = line.split('\t').map((v: string) => v.trim());
              }
              
              // 创建数据行对象
              const row: any = { key: i };
              values.forEach((value, index) => {
                row[`col${index}`] = value;
              });
              
              dataSource.push(row);
            }
            
            return { columns, dataSource };
          };
          
          // 检测文件类型是否是CSV
          const isCSV = selectedFile.fileType === 'csv' || 
                        (selectedFile.title && selectedFile.title.toLowerCase().endsWith('.csv'));
          
          if (isCSV) {
            // CSV文件以表格形式显示
            const { columns, dataSource } = parseCSVContent(selectedFile.content);
            
          Modal.info({
              title: `预览文件: ${selectedFile.title}`,
            width: 800,
            content: (
              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  {dataSource.length > 0 ? (
                    <Table 
                      columns={columns} 
                      dataSource={dataSource}
                      size="small"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                    />
                  ) : (
                    <Alert 
                      message="文件内容为空或格式无法解析为表格" 
                      type="warning" 
                      showIcon 
                    />
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <Collapse>
                      <Collapse.Panel header="查看原始文本" key="1">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedFile.content}
                </pre>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
              </div>
            ),
              okText: '关闭'
          });
        } else {
            // 非CSV文件仍使用纯文本显示
            Modal.info({
              title: `预览文件: ${selectedFile.title}`,
              width: 800,
              content: (
                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {selectedFile.content}
                  </pre>
                </div>
              ),
              okText: '关闭'
            });
          }
        } else {
          message.warning('文件无内容可预览');
        }
        break;
      case 'aiStandardize':
        openBomAiStandardization();
        break;
      case 'bom_standardize':
        openBomAiStandardization();
        break;
      case 'bom_lifecycle_standardize':
        openLifecycleFileStandardization('bom');
        break;
      case 'newFolder':
        addNewFolder(selectedFile.key);
        break;
      case 'upload':
        handleFileUploadToFolder(selectedFile.key);
        break;
      case 'rename':
        Modal.confirm({
          title: '重命名文件夹',
          content: (
            <Input
              defaultValue={selectedFile.title as string}
              onChange={(e) => {
                (Modal.confirm as any).update({
                  okButtonProps: { disabled: !e.target.value.trim() }
                });
                (Modal.confirm as any).newFolderName = e.target.value;
              }}
            />
          ),
          onOk: () => {
            const newName = (Modal.confirm as any).newFolderName;
            if (newName && newName.trim()) {
              renameFolder(selectedFile.key, newName.trim());
            }
          }
        });
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文件夹 "${selectedFile.title}" 吗？`,
          onOk: () => deleteFolder(selectedFile.key)
        });
        break;
      case 'manufacturing_standardize':
        openLifecycleFileStandardization('manufacturing');
        break;
      case 'distribution_standardize':
        openLifecycleFileStandardization('distribution');
        break;
      case 'usage_standardize':
        openLifecycleFileStandardization('usage');
        break;
      case 'disposal_standardize':
        openLifecycleFileStandardization('disposal');
        break;
    }
    setFileMenuVisible(false);
  };

  // 打开BOM AI标准化对话框
  const openBomAiStandardization = () => {
    if (!selectedFile) {
      message.warning('请先选择一个文件');
      return;
    }
    
    if (!selectedFile.content) {
      message.warning('文件无内容');
      return;
    }
    
    setBomAiModalVisible(true);
    setOriginalBomContent(selectedFile.content);
    setStandardizedBomContent('');
    setBomAiProcessing(false);
  };

  // 处理BOM AI规范化流程
  const handleBomAiStandardize = async () => {
    if (!originalBomContent || !selectedFile) {
      message.warning('请先上传或选择一个BOM文件');
      return;
    }
    
    setBomAiProcessing(true);
    message.loading({ 
      content: '正在使用DeepSeek AI进行BOM标准化，这可能需要较长时间...', 
      key: 'bomStandardize', 
      duration: 0 
    });
    
    try {
      // 调用大模型API进行BOM规范化
      const standardizedBom = await callLLMForBomStandardization(originalBomContent);
      
      if (!standardizedBom || typeof standardizedBom !== 'string') {
        throw new Error('返回的BOM数据格式不正确');
      }
      
      setStandardizedBomContent(standardizedBom);
      message.success({ content: 'DeepSeek AI规范化处理完成！', key: 'bomStandardize' });
    } catch (error: any) {
      console.error('BOM规范化处理失败:', error);
      
      // 处理特定的错误类型
      let errorMsg = '请重试';
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMsg = '处理超时，请尝试减少数据量或稍后再试';
      } else if (error.response) {
        // 服务器返回了错误状态码
        errorMsg = `服务器错误 (${error.response.status}): ${error.response.data?.detail || error.message}`;
      } else if (error.request) {
        // 请求发出但没有收到响应
        errorMsg = '无法连接到服务器，请检查网络连接';
      } else {
        // 请求设置时发生错误
        errorMsg = error.message || '未知错误';
      }
      
      // 显示错误提示
      message.error({ 
        content: `AI规范化处理失败: ${errorMsg}`, 
        key: 'bomStandardize',
        duration: 5
      });
      
      // 对于超时错误，提供降级处理选项
      if (error.code === 'ECONNABORTED') {
        setTimeout(() => {
          Modal.confirm({
            title: '处理超时',
            content: '处理时间过长，是否尝试使用模拟数据进行处理？',
            okText: '使用模拟数据',
            cancelText: '取消',
            onOk: () => {
              // 使用模拟数据处理
              const simulatedBom = simulateLLMProcessing(originalBomContent.split('\n'), 
                '组件ID,组件名称,材料类型,重量(g),供应商,碳排放因子(kgCO2e/kg)');
              setStandardizedBomContent(simulatedBom);
              message.success('已使用模拟数据完成处理');
            }
          });
        }, 1000);
      }
    } finally {
      setBomAiProcessing(false);
    }
  };
  
  // 调用大模型API进行BOM规范化
  const callLLMForBomStandardization = async (originalContent: string): Promise<string> => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      console.log('=== BOM标准化开始 ===');
      console.log('原始BOM数据:', originalContent);
      console.log('发送BOM数据到DeepSeek API进行标准化处理');
      
      // 直接调用后端的standardizeBom端点
      const response = await aiApi.standardizeBom(originalContent);
      
      console.log('API响应状态:', response.status);
      console.log('API响应头:', response.headers);
      console.log('API返回完整结果:', response);
      console.log('API返回数据:', response.data);
      
      // 提取标准化后的BOM内容 - 后端直接返回标准化内容
      let standardizedBom = response.data;
      
      // 处理可能的Markdown格式包装
      if (typeof standardizedBom === 'string') {
        // 移除可能的Markdown代码块标记
        standardizedBom = standardizedBom.replace(/```csv\n/g, '').replace(/```\n?$/g, '');
        
        // 检查数据格式是否正确
        if (!standardizedBom.trim().startsWith('组件ID') && standardizedBom.includes('组件ID')) {
          // 确保第一行是表头
          const lines = standardizedBom.trim().split('\n');
          const headerIndex = lines.findIndex((line: string) => line.includes('组件ID'));
          if (headerIndex > 0) {
            standardizedBom = lines.slice(headerIndex).join('\n');
          }
        }
      }
      
      console.log('处理后的标准化BOM数据:', standardizedBom);
      console.log('=== BOM标准化完成 ===');
      
      return standardizedBom;
      
    } catch (error: any) {
      console.error('=== BOM标准化出错 ===');
      console.error('调用DeepSeek API失败:', error);
      if (error.response) {
        console.error('错误状态:', error.response.status);
        console.error('错误数据:', error.response.data);
      }
      throw error;
    }
  };
  
  // 模拟大模型处理结果
  const simulateLLMProcessing = (lines: string[], header: string): string => {
    const result = [header];
    
    // 分析原始标头，找出可能匹配的列
    let originalHeader = lines[0];
    const headerColumns = originalHeader.toLowerCase().split(',');
    
    // 映射列索引
    const idIndex = headerColumns.findIndex(col => col.includes('id') || col.includes('编号') || col.includes('代码'));
    const nameIndex = headerColumns.findIndex(col => col.includes('name') || col.includes('名称') || col.includes('描述'));
    const materialIndex = headerColumns.findIndex(col => col.includes('material') || col.includes('材料') || col.includes('物料'));
    const weightIndex = headerColumns.findIndex(col => col.includes('weight') || col.includes('重量') || col.includes('质量'));
    const supplierIndex = headerColumns.findIndex(col => col.includes('supplier') || col.includes('供应商') || col.includes('厂商'));
    const factorIndex = headerColumns.findIndex(col => col.includes('factor') || col.includes('因子') || col.includes('排放') || col.includes('碳'));
    
    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 2) continue; // 跳过空行或格式不正确的行
      
      const componentId = idIndex >= 0 && idIndex < cols.length && cols[idIndex].trim() 
        ? cols[idIndex].trim() : `COMP${i.toString().padStart(3, '0')}`;
      
      const componentName = nameIndex >= 0 && nameIndex < cols.length && cols[nameIndex].trim() 
        ? cols[nameIndex].trim() : 'None';
      
      const materialType = materialIndex >= 0 && materialIndex < cols.length && cols[materialIndex].trim() 
        ? cols[materialIndex].trim() : 'None';
      
      const weight = weightIndex >= 0 && weightIndex < cols.length && cols[weightIndex].trim() && !isNaN(parseFloat(cols[weightIndex]))
        ? cols[weightIndex].trim() : 'None';
      
      const supplier = supplierIndex >= 0 && supplierIndex < cols.length && cols[supplierIndex].trim() 
        ? cols[supplierIndex].trim() : 'None';
      
      const carbonFactor = factorIndex >= 0 && factorIndex < cols.length && cols[factorIndex].trim() && !isNaN(parseFloat(cols[factorIndex]))
        ? cols[factorIndex].trim() : 'None';
      
      const standardLine = `${componentId},${componentName},${materialType},${weight},${supplier},${carbonFactor}`;
      result.push(standardLine);
    }
    
    return result.join('\n');
  };
  
  // 将规范化后的BOM保存为新文件
  const saveStandardizedBom = () => {
    if (!standardizedBomContent || !selectedFile) return;
    
    // 创建新的文件名
    const originalName = selectedFile.title;
    const fileExt = originalName.includes('.') 
      ? originalName.substring(originalName.lastIndexOf('.')) 
      : '.csv';
    const baseName = originalName.includes('.')
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName;
    const newFileName = `${baseName}_标准版${fileExt}`;
    
    // 创建新的文件节点
    const newFileNode: TreeNodeType = {
      title: newFileName,
      key: `bom-${Date.now()}`,
      isLeaf: true,
      fileType: 'bom',
      content: standardizedBomContent,
      data: standardizedBomContent
    };
    
    // 更新树形数据
    setTreeData(prevData => {
      const newData = [...prevData];
      const bomNode = newData.find(item => item.key === 'bom');
      if (bomNode && bomNode.children) {
        bomNode.children = [...bomNode.children, newFileNode];
      }
      return newData;
    });
    
    message.success(`已创建标准化BOM文件: ${newFileName}`);
    setBomAiModalVisible(false);
  };

  // 拖拽开始时的处理函数
  const onDragStart = (info: any, event: React.DragEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!info || !info.node) return;
    
    const nodeInfo = info.node;
    if (nodeInfo.isLeaf) {
      console.log('开始拖拽文件:', nodeInfo.title, '类型:', nodeInfo.fileType, '生命周期阶段:', nodeInfo.lifecycleStage);
      console.log('文件内容类型:', typeof nodeInfo.content, '长度:', 
        typeof nodeInfo.content === 'string' ? nodeInfo.content.length : 'N/A');
      console.log('文件内容前100个字符:', typeof nodeInfo.content === 'string' ? nodeInfo.content.substring(0, 100) : 'N/A');
      
      // 获取文件类型和生命周期阶段
      let fileType = nodeInfo.fileType || 'unknown';
      let lifecycleStage = nodeInfo.lifecycleStage || '';
      
      // 如果没有明确的生命周期阶段，尝试从标题中推断
      if (!lifecycleStage && nodeInfo.title) {
        if (nodeInfo.title.includes('生产制造标准化')) {
          lifecycleStage = 'manufacturing';
        } else if (nodeInfo.title.includes('分销和储存标准化')) {
          lifecycleStage = 'distribution';
        } else if (nodeInfo.title.includes('产品使用标准化')) {
          lifecycleStage = 'usage';
        } else if (nodeInfo.title.includes('废弃处置标准化')) {
          lifecycleStage = 'disposal';
        }
      }
      
      // 如果是标准化文件，根据生命周期阶段设置文件类型
      if (lifecycleStage) {
        switch (lifecycleStage) {
          case 'bom':
            fileType = 'bom';
            break;
          case 'manufacturing':
          case '生产制造':
            fileType = 'manufacturing';
            console.log('设置文件类型为生产制造');
            break;
          case 'distribution':
          case '分销和储存':
            fileType = 'distribution';
            console.log('设置文件类型为分销和储存');
            break;
          case 'usage':
          case '产品使用':
            fileType = 'usage';
            console.log('设置文件类型为产品使用');
            break;
          case 'disposal':
          case '废弃处置':
            fileType = 'disposal';
            console.log('设置文件类型为废弃处置');
            break;
          default:
            fileType = 'unknown';
            console.log('未知的生命周期阶段:', lifecycleStage);
        }
      }
      
      console.log('拖拽的是' + fileType + '文件，设置拖拽状态，详细信息:', JSON.stringify(nodeInfo, null, 2));
      
      // 创建一个更完整的数据对象
      const fileData = {
        ...nodeInfo,
        title: nodeInfo.title || '文件',
        fileType,
        lifecycleStage,
        content: nodeInfo.content || '',
        data: nodeInfo.data || '',
        id: `${fileType}-${Date.now()}`, // 添加唯一ID
        timestamp: Date.now() // 添加时间戳
      };
      
      // 使用两种机制存储拖拽状态
      // 1. React状态 - 可能受到异步更新影响
      setDraggedFile(fileData);
      
      // 2. 全局变量 - 立即可用，不受React生命周期影响
      window.__GLOBAL_DRAGGED_FILE__ = fileData;
      console.log('已将拖拽文件信息保存到全局变量', window.__GLOBAL_DRAGGED_FILE__?.title);
      
      // 3. sessionStorage作为备份
      try {
        window.sessionStorage.setItem('lastDraggedFile', JSON.stringify(fileData));
      } catch (error) {
        console.error('无法保存到sessionStorage:', error);
      }
      
      // 设置拖拽数据（可能在某些环境中不生效）
      if ('dataTransfer' in event && event.dataTransfer) {
        try {
          event.dataTransfer.setData('application/json', JSON.stringify(fileData));
          event.dataTransfer.effectAllowed = 'copy';
        } catch (error) {
          console.error('设置dataTransfer数据失败:', error);
        }
      }
    }
  };

  // 清理拖拽状态
  const cleanUpDragState = () => {
    setDraggedFile(null);
    setIsDraggingOver(false);
    window.__GLOBAL_DRAGGED_FILE__ = null;
    window.sessionStorage.removeItem('lastDraggedFile');
  };
  
  // 拖拽结束时的处理
  const handleDragEnd = (event: React.DragEvent) => {
    console.log('拖拽结束');
    // 不清理拖拽状态，因为可能需要在drop中使用
  };
  
  // 拖拽悬停在区域上时的处理
  const handleDragOver = (event: React.DragEvent) => {
    // 阻止默认行为以允许放置
    event.preventDefault();
    event.stopPropagation();
    
    // 设置拖拽效果
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    
    // 设置悬停状态，但避免过多重渲染
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
    
    return false;
  };
  
  // 拖拽离开区域时的处理
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    return false;
  };
  
  // 处理放置事件
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
      
      // 删除对未定义函数的调用
    
    // 重置拖拽悬停状态
    setIsDraggingOver(false);
    
    // 获取拖放位置 - 相对于ReactFlow的坐标
    let position = { x: 0, y: 0 };
    
    if (reactFlowInstance && reactFlowWrapper.current) {
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      });
    }
    
    console.log('获取到的拖放位置:', position);
    
    // 确定要处理的文件数据 - 按优先级查找
    let fileToProcess = null;
    
    // 1. 首先检查全局变量
    if (window.__GLOBAL_DRAGGED_FILE__) {
      console.log('从全局变量获取拖拽文件');
      fileToProcess = window.__GLOBAL_DRAGGED_FILE__;
    } 
    // 2. 其次检查React状态
    else if (draggedFile) {
      console.log('从React状态获取拖拽文件');
      fileToProcess = draggedFile;
    } 
    // 3. 再次检查sessionStorage
    else {
      try {
        const savedData = window.sessionStorage.getItem('lastDraggedFile');
        if (savedData) {
          console.log('从sessionStorage获取拖拽文件');
          fileToProcess = JSON.parse(savedData);
        }
      } catch (error) {
        console.error('从sessionStorage读取数据失败:', error);
      }
    }
    
    // 4. 最后尝试从dataTransfer获取
    if (!fileToProcess && event.dataTransfer) {
      try {
        const dataTransferJson = event.dataTransfer.getData('application/json');
        if (dataTransferJson) {
          console.log('从dataTransfer获取拖拽文件');
          fileToProcess = JSON.parse(dataTransferJson);
        }
      } catch (error) {
        console.error('从dataTransfer读取数据失败:', error);
      }
    }
    
    // 如果找不到文件数据，显示错误
    if (!fileToProcess) {
      console.error('无法确定要处理的文件，拖拽数据丢失');
      message.error('无法识别拖拽内容，请重试');
      cleanUpDragState();
      return;
    }
    
    // 如果是BOM文件，直接处理
    if (fileToProcess.fileType === 'bom') {
      console.log('处理BOM文件:', fileToProcess.title);
      console.log('BOM文件内容类型:', typeof fileToProcess.content, '长度:', 
        typeof fileToProcess.content === 'string' ? fileToProcess.content.length : 'N/A');
      
      try {
        // 直接处理文件，不依赖dataTransfer
        processBomFile(fileToProcess, position);
        
        // 处理完成后清理拖拽状态
        cleanUpDragState();
        
        // 显示成功消息
        message.success(`已成功创建节点: ${fileToProcess.title}`);
        return;
      } catch (error) {
        console.error('处理BOM文件失败:', error);
        message.error('处理BOM文件时发生错误');
        cleanUpDragState();
        return;
      }
    } 
      // 处理生产制造阶段文件
      else if (fileToProcess.fileType === 'manufacturing' || 
               fileToProcess.fileType === '生产制造' || 
               (fileToProcess.title && fileToProcess.title.includes('生产制造标准化'))) {
        console.log('处理生产制造阶段文件:', fileToProcess.title);
        
        try {
          // 处理生产制造阶段文件
          processManufacturingFile(fileToProcess, position);
          return;
        } catch (error) {
          console.error('处理生产制造阶段文件失败:', error);
          message.error('处理生产制造阶段文件时发生错误');
          cleanUpDragState();
          return;
        }
      }
      // 处理分销和储存阶段文件
      else if (fileToProcess.fileType === 'distribution' || 
               fileToProcess.fileType === '分销和储存' || 
               (fileToProcess.title && fileToProcess.title.includes('分销和储存标准化'))) {
        console.log('处理分销和储存阶段文件:', fileToProcess.title);
        
        try {
          // 处理分销和储存阶段文件
          processDistributionFile(fileToProcess, position);
          return;
        } catch (error) {
          console.error('处理分销和储存阶段文件失败:', error);
          message.error('处理分销和储存阶段文件时发生错误');
          cleanUpDragState();
          return;
        }
      }
      // 处理产品使用阶段文件
      else if (fileToProcess.fileType === 'usage' || 
               fileToProcess.fileType === '产品使用' || 
               (fileToProcess.title && fileToProcess.title.includes('产品使用标准化'))) {
        console.log('处理产品使用阶段文件:', fileToProcess.title);
        
        try {
          // 处理产品使用阶段文件
          processUsageFile(fileToProcess, position);
          return;
        } catch (error) {
          console.error('处理产品使用阶段文件失败:', error);
          message.error('处理产品使用阶段文件时发生错误');
        cleanUpDragState();
        return;
        }
      }
      // 处理废弃处置阶段文件
      else if (fileToProcess.fileType === 'disposal' || 
               fileToProcess.fileType === '废弃处置' || 
               (fileToProcess.title && fileToProcess.title.includes('废弃处置标准化'))) {
        console.log('处理废弃处置阶段文件:', fileToProcess.title);
        
        try {
          // 处理废弃处置阶段文件
          processDisposalFile(fileToProcess, position);
        return;
      } catch (error) {
          console.error('处理废弃处置阶段文件失败:', error);
          message.error('处理废弃处置阶段文件时发生错误');
        cleanUpDragState();
        return;
      }
      }
      else {
        console.error('不支持的文件类型:', fileToProcess ? fileToProcess.fileType : '未知');
      message.error('不支持的文件类型，仅支持标准化文件');
      cleanUpDragState();
    }
    }, [reactFlowInstance, draggedFile, cleanUpDragState]);

  // 处理BOM文件拖放到节点上的逻辑
  const processBomFile = (file: any, position: { x: number, y: number }) => {
    console.log('开始处理BOM文件:', file);
    
    // 根据文件类型选择不同的处理方式
    if (file instanceof File) {
      // 处理从文件系统拖入的真实文件
      let reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (!e.target || !e.target.result) {
          message.error('读取文件内容失败');
          return;
        }
        
        // 获取文件内容
        const content = e.target.result.toString();
        // 处理文件内容
        processFileContent(content, position, file.name);
      };
      
      reader.onerror = () => {
        message.error('读取BOM文件失败');
      };
      
      reader.readAsText(file);
    } else {
      // 处理从左侧树拖入的文件对象
      try {
        // 获取文件内容
        const content = file.content || file.data || '';
        if (!content) {
          message.error('无法读取文件内容');
          return;
        }
        
        // 处理文件内容
        processFileContent(content, position, file.title || '未命名BOM文件');
      } catch (error) {
        console.error('处理BOM文件时发生错误:', error);
        message.error('处理BOM文件失败');
      }
    }
  };
  
  
  // 处理文件内容的函数
  const processFileContent = (content: string, position: { x: number, y: number }, fileName: string) => {
    // 按行分割
    const lines = content.split('\n');
    
    // 至少需要两行（标题 + 至少一条数据）
    if (lines.length < 2) {
      message.error('BOM文件格式错误：文件内容不足');
      return;
    }
    
    // 第一行是标题
    const headers = lines[0].split(',').map((h: string) => h.trim());
    
    // 标题索引映射
    const headerMap = {
      id: headers.findIndex((h: string) => h.includes('ID') || h.includes('编号')),
      name: headers.findIndex((h: string) => h.includes('名称') || h.includes('组件名')),
      material: headers.findIndex((h: string) => h.includes('材料') || h.includes('类型')),
      weight: headers.findIndex((h: string) => h.includes('重量')),
      supplier: headers.findIndex((h: string) => h.includes('供应')),
      carbonFactor: headers.findIndex((h: string) => h.includes('碳排放因子') || h.includes('碳因子')),
      quantity: headers.findIndex((h: string) => h.includes('数量') || h.includes('数量')),
      weight_per_unit: headers.findIndex((h: string) => h.includes('单位重量') || h.includes('单位重量'))
    };
    
    // 验证必要的列是否存在
    if (headerMap.name === -1 || headerMap.weight === -1 || headerMap.carbonFactor === -1) {
      message.error('BOM文件格式错误：缺少必要的列（组件名称、重量或碳排放因子）');
      return;
    }
    
    // 创建节点数组
    const newNodes: Node<ProductNodeData>[] = [];
    const horizontalSpacing = 300; // 节点水平间距，增加为300
    const verticalSpacing = 250; // 节点垂直间距，增加为250
    const itemsPerRow = 3; // 每行最多显示的节点数，减少为3个，更加宽松
    
    // 从第二行开始，每行是一个组件
    let totalWeight = 0;
    let totalCarbonFootprint = 0;
    let validDataLines = 0;
    const materialNodes: Node<ProductNodeData>[] = [];
    
    // 按材料类型对节点进行分组
    const materialGroups: Record<string, Node<ProductNodeData>[]> = {};
    
    // 先创建和处理所有原材料节点
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 跳过空行
      
      const values = line.split(',').map((v: string) => v.trim());
      
      // 确保有足够的列
      if (values.length < Math.max(headerMap.name, headerMap.weight, headerMap.carbonFactor) + 1) {
        console.warn(`跳过行 ${i+1}：列数不足`);
        continue;
      }
      
      // 提取数据
      const componentId = headerMap.id !== -1 ? values[headerMap.id] : `comp-${i}`;
      const componentName = values[headerMap.name];
      const material = headerMap.material !== -1 ? values[headerMap.material] : '';
      const supplier = headerMap.supplier !== -1 ? values[headerMap.supplier] : '';
      const quantity = headerMap.quantity !== -1 ? values[headerMap.quantity] : '';
      const weight_per_unit = headerMap.weight_per_unit !== -1 ? values[headerMap.weight_per_unit] : '';
      // 处理重量（可能是g，需要转换为kg）
      let weight = parseFloat(values[headerMap.weight]);
      if (isNaN(weight)) {
        console.warn(`跳过行 ${i+1}：重量不是有效数字`);
        
      }
      
      const weightUnit = headers[headerMap.weight].toLowerCase().includes('g') && 
                        !headers[headerMap.weight].toLowerCase().includes('kg') ? 'g' : 'kg';
      
      // 如果单位是g，转换为kg
      if (weightUnit === 'g') {
        weight = weight / 1000;
      }
      
      // 碳排放因子
      const carbonFactor = parseFloat(values[headerMap.carbonFactor]);
      if (isNaN(carbonFactor)) {
        console.warn(`跳过行 ${i+1}：碳排放因子不是有效数字`);
      }
      
      // 计算碳足迹
      const carbonFootprint = weight * carbonFactor;
      
      // 累计总量
      totalWeight += weight;
      totalCarbonFootprint += carbonFootprint;
      validDataLines++;
      
      // 计算位置（平行瀑布流布局）
      const col = validDataLines % itemsPerRow;
      const row = Math.floor(validDataLines / itemsPerRow);
      
      // 创建节点ID
      const nodeId = `material-${Date.now()}-${i}`;
      
      // 创建节点
      const node: Node<ProductNodeData> = {
        id: nodeId,
        type: 'product',
        position: {
          x: position.x - ((itemsPerRow - 1) * horizontalSpacing / 2) + col * horizontalSpacing + (Math.random() * 80 - 40), // 添加更大的随机偏移
          y: position.y - verticalSpacing * 3 + row * verticalSpacing + (Math.random() * 50 - 25), // 增加行间距和随机偏移
        },
        data: {
          label: componentName,
          productName: componentName,
          weight: weight,
          carbonFootprint: carbonFootprint,
          dataSource: 'BOM',
          lifecycleStage: '原材料',
          emissionFactor: '',
          calculationMethod: '因子法',
          uncertainty: '低',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14040',
          material: material,
          supplier: supplier,
          completionStatus: '已完成',
          carbonFactor: carbonFactor,
          quantity: quantity,
          weight_per_unit: weight_per_unit,
          uncertaintyScore: 0
        }
      };
      
      // 添加节点到临时数组
      materialNodes.push(node);
      
      // 按材料类型分组
      if (!materialGroups[material]) {
        materialGroups[material] = [];
      }
      materialGroups[material].push(node);
    }
    
    if (materialNodes.length === 0) {
      message.error('未从BOM文件中提取到有效数据');
      return;
    }
    
    // 重新排列节点位置，使不同材料类型的节点分组显示
    const materialTypes = Object.keys(materialGroups);
    let rearrangedNodes: Node<ProductNodeData>[] = [];
    
    // 创建最终产品节点（位于底部中央）
    const finalProductId = `product-${Date.now()}`;
    const finalProductNode: Node<ProductNodeData> = {
      id: finalProductId,
      type: 'product',
      position: {
        x: position.x,
        y: position.y + verticalSpacing * 3, // 最终产品节点放在更下方，增加与原材料节点的距离
      },
      data: {
        label: `最终产品-${fileName}`,
        productName: `最终产品-${fileName}`,
        weight: totalWeight,
        carbonFootprint: totalCarbonFootprint,
        dataSource: 'BOM',
        lifecycleStage: '最终产品',  // 修改这里，将生命周期阶段设置为"最终产品"
        emissionFactor: '',
        calculationMethod: '累加法',
        uncertainty: '低',
        verificationStatus: '未验证',
        applicableStandard: 'ISO 14040',
        completionStatus: '进行中',
        certaintyPercentage: 90,
        carbonFactor: totalWeight > 0 ? totalCarbonFootprint / totalWeight : 0,
        material: '',
        supplier: '',
        uncertaintyScore: 0
      }
    };
    
    // 新边数组
    const newEdges: Edge[] = [];
    
    // 按材料类型重新排列节点
    materialTypes.forEach((materialType, groupIndex) => {
      const groupNodes = materialGroups[materialType];
      const groupXOffset = (groupIndex - (materialTypes.length - 1) / 2) * horizontalSpacing * 1.5;
      
      groupNodes.forEach((node, nodeIndex) => {
        // 复制节点，修改位置
        const updatedNode = {...node};
        updatedNode.position = {
          x: position.x + groupXOffset + (Math.random() * 60 - 30),
          y: position.y - verticalSpacing * 2.5 + nodeIndex * (verticalSpacing / 1.5) + (Math.random() * 40 - 20)
        };
        
        rearrangedNodes.push(updatedNode);
      });
    });
    
    // 使用重新排列后的节点
    rearrangedNodes.forEach(node => {
      newNodes.push(node);
      
      // 创建连接到最终产品的边
      const edge: Edge = {
        id: `edge-${node.id}-${finalProductId}`,
        source: node.id,
        target: finalProductId,
        type: 'default'
      };
      
      // 添加边
      newEdges.push(edge);
    });
    
    // 添加最终产品节点
    newNodes.push(finalProductNode);
    
    console.log(`创建了${materialNodes.length}个原材料节点和1个最终产品节点，总重量: ${totalWeight}kg，总碳排放: ${totalCarbonFootprint}kgCO2e`);
    
    // 添加节点到画布
    setNodes(nds => {
      console.log(`添加${newNodes.length}个节点到现有的 ${nds.length} 个节点中`);
      return [...nds, ...newNodes];
    });
    
    // 添加边到画布
    setEdges(eds => {
      console.log(`添加${newEdges.length}条边`);
      return [...eds, ...newEdges];
    });
    
    // 强制更新视图
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView();
      }
    }, 100);
    
    message.success(`成功从BOM文件创建了${materialNodes.length}个原材料节点`);
  };

  // 添加全局点击监听，点击菜单外部时关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuVisible) {
        setMenuVisible(false);
      }
    };

    // 只有当菜单显示时才添加监听
    if (menuVisible) {
      // 延迟添加事件监听，避免立即触发
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      
      // 清理函数
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuVisible]);

  // 添加缺失的函数定义
  const initializeNodeWithEmissions = (nodeData: any) => {
    // 基于碳因子和重量计算碳排放量
    if (nodeData.weight && nodeData.carbonFactor) {
      nodeData.carbonFootprint = nodeData.weight * nodeData.carbonFactor;
    }
    
   
    
    return nodeData;
  };
  
  // 更新节点属性的函数
  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) {
      console.log('更新节点数据失败：未选中节点');
      return;
    }
    
    console.log(`正在更新节点[${selectedNode.id}]的属性: ${key} = ${value}`);
    console.log('当前节点数据:', selectedNode.data);
    
    // 创建更新后的数据对象
    let updatedData = {
      ...selectedNode.data,
      [key]: value,
    };
    
    // 如果修改的是productName，同时更新label
    if (key === 'productName') {
      updatedData.label = value;
    }
    
    // 如果修改的是label，同时更新productName
    if (key === 'label') {
      updatedData.productName = value;
    }
    
    // 更新节点列表中的对应节点
    setNodes((nds) => {
      return nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      });
    });
    
    // 同时更新选中节点状态，确保属性面板实时更新
    setSelectedNode({
      ...selectedNode,
      data: updatedData
    });
    
    console.log('节点更新后数据:', updatedData);
    // 
    // 性、数据来源或碳足迹相关时，更新AI总结
    if (['completionStatus', 'dataSource', 'carbonFootprint', 'weight', 'carbonFactor', 
         'certaintyPercentage', 'lifecycleStage', 'completionStatus'].includes(key)) {
      setTimeout(() => updateAiSummary(), 100);
    }

    console.log('ai summary:', aiSummary);
  };
  
  // 更新节点碳足迹计算
  const updateNodeCarbonFootprint = (nodeId: string) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        const weight = node.data.weight || 0;
        const carbonFactor = node.data.carbonFactor || 0;
        const calculatedFootprint = weight * carbonFactor;
        
        return {
          ...node,
          data: {
            ...node.data,
            carbonFootprint: calculatedFootprint
          }
        };
      }
      return node;
    }));
  };
  
  // 处理侧边栏的调整事件
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = siderWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + e.clientX - startX;
      setSiderWidth(Math.max(200, Math.min(400, newWidth)));
      
      // 更新AI总结浮动容器的位置
      document.documentElement.style.setProperty('--sider-width', `${Math.max(300, Math.min(600, newWidth))}px`);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // AI一键生成功能
  const handleAutoAIGenerate = async () => {
    // 获取所有需要AI优化的节点
    const AI_Nodes = nodes.filter(node => {
      const data = node.data as ProductNodeData;
      return (
        !data.carbonFootprint || 
        !data.carbonFactor || 
        !data.weight || 
        data.completionStatus === 'manual-required'
      );
    });

    if (AI_Nodes.length === 0) {
      message.info('所有节点都已有碳排放数据，无需AI优化');
      return;
    }

    // 显示加载中提示
    
    

      // 遍历每个需要优化的节点

          

      for (const node of AI_Nodes) {
        try {        

          // 如果节点是最终产品，则不进行优化
          if (node.data.lifecycleStage === '最终产品') {
            continue;
          }

          const nodeData = node.data as AllNodeData;

          console.log('节点当前数据:', nodeData);

                
          // message.loading(`开始优化节点: ${node.data.lifecycleStage} (${nodeData.productName})`, 5000);
          const loadingMessage = message.loading(`开始优化节点: ${node.data.lifecycleStage} (${nodeData.productName})`, 0);
          const stage = nodeData.lifecycleStage;
          let response;
          
          // 根据生命周期阶段调用对应的API
          switch (stage) {
            case '原材料':
            case 'raw_material':
              console.log('调用原材料优化API');
              response = await aiApi.optimizeRawMaterialNode(nodeData);
              break;
            case '分销和储存':
            case 'distribution':
              console.log('调用分销优化API');
              response = await aiApi.optimizeDistributionNode(nodeData);
              break;
            case '生产制造':
            case 'manufacturing':
              console.log('调用生产制造优化API');
              response = await aiApi.optimizeManufacturingNode(nodeData);
              break;
            case '产品使用':
            case 'usage':
              console.log('调用产品使用优化API');
              response = await aiApi.optimizeUsageNode(nodeData);
              break;
            case '废弃处置':
            case 'disposal':
              console.log('调用废弃处置优化API');
              response = await aiApi.optimizeDisposalNode(nodeData);
              break;
            default:
              console.warn(`未知的生命周期阶段: ${stage}`);
              continue;
          }

          console.log('API响应:', response);

          if (response && response.data && response.data.status === 'success' && response.data.data) {
            // 更新节点数据
            loadingMessage();
            
            // 显示成功消息
            message.success(`节点 ${nodeData.productName} 优化完成`);
            

            const updatedData = response.data.data;
            console.log('优化后的数据:', updatedData);
            
            // 更新节点数据
            Object.assign(nodeData, {
              weight: updatedData.weight,
              carbonFactor: updatedData.carbonFactor,
              carbonFootprint: updatedData.carbonFootprint,
              dataSource: updatedData.dataSource,
              uncertainty: updatedData.uncertainty,
              verificationStatus: updatedData.verificationStatus,
              completionStatus: "ai-supplemented",
              optimizationExplanation: updatedData.optimizationExplanation,
              uncertaintyScore: updatedData.uncertaintyScore,
              uncertaintyScoreUnit: updatedData.uncertaintyScoreUnit,
              uncertaintyFactors: updatedData.uncertaintyFactors,
              supplier: updatedData.supplier,
              emissionFactor: updatedData.emissionFactor,
              calculationMethod: updatedData.calculationMethod,
              applicableStandard: updatedData.applicableStandard,
              certaintyPercentage: updatedData.certaintyPercentage,
              recommendations: updatedData.recommendations || [],
              aiReasoning: updatedData.aiReasoning,
              aiRecommendation: updatedData.aiRecommendation,
              energyConsumption: updatedData.energyConsumption,
              energyType: updatedData.energyType,
              processEfficiency: updatedData.processEfficiency,
              wasteGeneration: updatedData.wasteGeneration,
              waterConsumption: updatedData.waterConsumption,
              recycledMaterialPercentage: updatedData.recycledMaterialPercentage,
              productionCapacity: updatedData.productionCapacity,
              machineUtilization: updatedData.machineUtilization,
              qualityDefectRate: updatedData.qualityDefectRate,
              processTechnology: updatedData.processTechnology,
              manufacturingStandard: updatedData.manufacturingStandard,
              automationLevel: updatedData.automationLevel,
              startPoint: updatedData.startPoint,
              endPoint: updatedData.endPoint,
              vehicleType: updatedData.vehicleType,
              fuelEfficiency: updatedData.fuelEfficiency,
              loadFactor: updatedData.loadFactor,
              transportationMode: updatedData.transportationMode,
              transportationDistance: updatedData.transportationDistance,
              packagingMaterial: updatedData.packagingMaterial,
              packagingWeight: updatedData.packagingWeight,
              warehouseEnergy: updatedData.warehouseEnergy,
              storageTime: updatedData.storageTime,
              storageConditions: updatedData.storageConditions,
              distributionNetwork: updatedData.distributionNetwork,
              lifespan: updatedData.lifespan,
              energyConsumptionPerUse: updatedData.energyConsumptionPerUse,
              waterConsumptionPerUse: updatedData.waterConsumptionPerUse,
              consumablesUsed: updatedData.consumablesUsed,
              consumablesWeight: updatedData.consumablesWeight,
              usageFrequency: updatedData.usageFrequency,
              maintenanceFrequency: updatedData.maintenanceFrequency,
              repairRate: updatedData.repairRate,
              userBehaviorImpact: updatedData.userBehaviorImpact,
              efficiencyDegradation: updatedData.efficiencyDegradation,
              standbyEnergyConsumption: updatedData.standbyEnergyConsumption,
              usageLocation: updatedData.usageLocation,
              usagePattern: updatedData.usagePattern,
              recyclingRate: updatedData.recyclingRate,
              landfillPercentage: updatedData.landfillPercentage,
              incinerationPercentage: updatedData.incinerationPercentage,
              compostPercentage: updatedData.compostPercentage,
              reusePercentage: updatedData.reusePercentage,
              hazardousWasteContent: updatedData.hazardousWasteContent,
              biodegradability: updatedData.biodegradability,
              disposalEnergyRecovery: updatedData.disposalEnergyRecovery,
              transportToDisposal: updatedData.transportToDisposal,
              endOfLifeTreatment: updatedData.endOfLifeTreatment,
              recyclingEfficiency: updatedData.recyclingEfficiency,
              dismantlingDifficulty: updatedData.dismantlingDifficulty,
            });

            // 更新节点显示
            node.data.label = `${nodeData.productName} (${nodeData.carbonFootprint.toFixed(2)} kgCO2e)`;
            
            // 更新节点样式
            if (nodeData.completionStatus === 'AI补充') {
              node.style = { ...node.style, backgroundColor: '#e6f7ff' };
            } else {
              node.style = { ...node.style, backgroundColor: '#fff7e6' };
            }

            // 更新节点状态
            setNodes(nds => 
              nds.map(n => {
                if (n.id === node.id) {
                  return {
                    ...n,
                    data: nodeData,
                    style: node.style
                  };
                }
                return n;
              })
            );


            // 重新计算总碳足迹
            calculateTotalCarbonFootprint();

            // 添加一个小延迟，让用户能看到每个节点的更新
            await new Promise(resolve => setTimeout(resolve, 500));

          } else {
            console.warn(`节点 ${node.id} 优化失败:`, response);
            message.error(`节点 ${nodeData.productName} 优化失败`);
          }
          // 更新节点状态
          setNodes([...nodes]);
          // 关闭加载提示
          setIsLoading(false);
          // 显示成功消息
          // 重新计算总碳足迹
          calculateTotalCarbonFootprint();
        } catch (error) {
          console.error('AI优化失败:', error);
          setIsLoading(false);
          message.error('AI优化失败，请重试');


      }
    

    }
  };
  
  // 渲染特定生命周期阶段的属性
  const renderLifecycleSpecificProperties = () => {
    if (!selectedNode) return null;
    
    const lifecycleStage = selectedNode.data.lifecycleStage;
    
    switch (lifecycleStage) {
      case '原材料':
        const productData = selectedNode.data as ProductNodeData;

        return (
          <>
            <h4 className="section-title">原材料阶段属性</h4>
            <Form.Item label="数量">
              <Input
                value={productData.quantity}
                onChange={(e) => updateNodeData('quantity', e.target.value)}
              />
            </Form.Item>

            <Form.Item label="单位重量">
              <Input
                value={productData.weight_per_unit}
                onChange={(e) => updateNodeData('weight_per_unit', e.target.value)}
              />
            </Form.Item>

            <Form.Item label="材料">
              <Input
                value={productData.material}
                onChange={(e) => updateNodeData('material', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="供应商">
              <Input
                value={productData.supplier}
                onChange={(e) => updateNodeData('supplier', e.target.value)}
              />
            </Form.Item>
          </>
        );
        
      case '生产制造':
        // 使用类型断言告诉TypeScript这是ManufacturingNodeData类型
        const manufacturingData = selectedNode.data as ManufacturingNodeData;
        return (
          <>
            <h4 className="section-title">生产制造阶段属性</h4>
            <Form.Item label="能源消耗 (kWh)">
              <InputNumber
                value={manufacturingData.energyConsumption}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('energyConsumption', value)}
              />
            </Form.Item>
            <Form.Item label="能源类型">
              <Input
                value={manufacturingData.energyType}
                onChange={(e) => updateNodeData('energyType', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="工艺效率 (%)">
              <InputNumber
                value={manufacturingData.processEfficiency}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('processEfficiency', value)}
              />
            </Form.Item>
            <Form.Item label="废物产生量 (kg)">
              <InputNumber
                value={manufacturingData.wasteGeneration}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('wasteGeneration', value)}
              />
            </Form.Item>
            <Form.Item label="水资源消耗 (L)">
              <InputNumber
                value={manufacturingData.waterConsumption}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('waterConsumption', value)}
              />
            </Form.Item>
            <Form.Item label="回收材料使用比例 (%)">
              <InputNumber
                value={manufacturingData.recycledMaterialPercentage}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('recycledMaterialPercentage', value)}
              />
            </Form.Item>
            <Form.Item label="生产能力 (units/time)">
              <InputNumber
                value={manufacturingData.productionCapacity}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('productionCapacity', value)}
              />
            </Form.Item>
            <Form.Item label="设备利用率 (%)">
              <InputNumber
                value={manufacturingData.machineUtilization}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('machineUtilization', value)}
              />
            </Form.Item>
            <Form.Item label="质量缺陷率 (%)">
              <InputNumber
                value={manufacturingData.qualityDefectRate}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('qualityDefectRate', value)}
              />
            </Form.Item>
            <Form.Item label="工艺技术">
              <Input
                value={manufacturingData.processTechnology}
                onChange={(e) => updateNodeData('processTechnology', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="生产标准">
              <Input
                value={manufacturingData.manufacturingStandard}
                onChange={(e) => updateNodeData('manufacturingStandard', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="自动化水平">
              <Select
                value={manufacturingData.automationLevel}
                style={{ width: '100%' }}
                onChange={(value) => updateNodeData('automationLevel', value)}
              >
                <Option value="高">高</Option>
                <Option value="中">中</Option>
                <Option value="低">低</Option>
              </Select>
            </Form.Item>
          </>
        );
        
      case '分销和储存':
        // 使用类型断言告诉TypeScript这是DistributionNodeData类型
        const distributionData = selectedNode.data as DistributionNodeData;
        return (
          <>
            <h4 className="section-title">分销阶段属性</h4>
            <Form.Item label="运输方式">
              <Select
                value={distributionData.transportationMode}
                style={{ width: '100%' }}
                onChange={(value) => updateNodeData('transportationMode', value)}
              >
                <Option value="公路">公路</Option>
                <Option value="铁路">铁路</Option>
                <Option value="海运">海运</Option>
                <Option value="空运">空运</Option>
              </Select>
            </Form.Item>
            <Form.Item label="起点">
              <Input
                value={distributionData.startPoint}
                onChange={(e) => updateNodeData('startPoint', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="终点">
              <Input
                value={distributionData.endPoint}
                onChange={(e) => updateNodeData('endPoint', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="运输距离 (km)">
              <InputNumber
                value={distributionData.transportationDistance}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('transportationDistance', value)}
              />
            </Form.Item>
            <Form.Item label="车辆类型">
              <Input
                value={distributionData.vehicleType}
                onChange={(e) => updateNodeData('vehicleType', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="燃料类型">
              <Input
                value={distributionData.fuelType}
                onChange={(e) => updateNodeData('fuelType', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="燃油效率 (km/L)">
              <InputNumber
                value={distributionData.fuelEfficiency}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('fuelEfficiency', value)}
              />
            </Form.Item>
            <Form.Item label="装载因子 (%)">
              <InputNumber
                value={distributionData.loadFactor}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('loadFactor', value)}
              />
            </Form.Item>
            <Form.Item label="是否需要冷藏">
              <Switch
                checked={distributionData.refrigeration}
                onChange={(checked) => updateNodeData('refrigeration', checked)}
              />
            </Form.Item>
            <Form.Item label="包装材料">
              <Input
                value={distributionData.packagingMaterial}
                onChange={(e) => updateNodeData('packagingMaterial', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="包装重量 (kg)">
              <InputNumber
                value={distributionData.packagingWeight}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('packagingWeight', value)}
              />
            </Form.Item>
            <Form.Item label="仓库能源消耗 (kWh)">
              <InputNumber
                value={distributionData.warehouseEnergy}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('warehouseEnergy', value)}
              />
            </Form.Item>
            <Form.Item label="储存时间 (days)">
              <InputNumber
                value={distributionData.storageTime}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('storageTime', value)}
              />
            </Form.Item>
            <Form.Item label="储存条件">
              <Input
                value={distributionData.storageConditions}
                onChange={(e) => updateNodeData('storageConditions', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="分销网络类型">
              <Input
                value={distributionData.distributionNetwork}
                onChange={(e) => updateNodeData('distributionNetwork', e.target.value)}
              />
            </Form.Item>
            {distributionData.aiRecommendation && (
              <Form.Item label="AI推荐">
                <Alert
                  message="低碳运输推荐"
                  description={distributionData.aiRecommendation}
                  type="info"
                  showIcon
                />
              </Form.Item>
            )}

          </>
        );
        
      case '产品使用':
        // 使用类型断言告诉TypeScript这是UsageNodeData类型
        const usageData = selectedNode.data as UsageNodeData;
        return (
          <>
            <h4 className="section-title">使用阶段属性</h4>
            <Form.Item label="产品寿命 (年)">
              <InputNumber
                value={usageData.lifespan}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('lifespan', value)}
              />
            </Form.Item>
            <Form.Item label="每次使用能源消耗 (kWh)">
              <InputNumber
                value={usageData.energyConsumptionPerUse}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('energyConsumptionPerUse', value)}
              />
            </Form.Item>
            <Form.Item label="每次使用水资源消耗 (L)">
              <InputNumber
                value={usageData.waterConsumptionPerUse}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('waterConsumptionPerUse', value)}
              />
            </Form.Item>
            <Form.Item label="使用的消耗品">
              <Input
                value={usageData.consumablesUsed}
                onChange={(e) => updateNodeData('consumablesUsed', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="消耗品重量 (kg)">
              <InputNumber
                value={usageData.consumablesWeight}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('consumablesWeight', value)}
              />
            </Form.Item>
            <Form.Item label="使用频率 (次/年)">
              <InputNumber
                value={usageData.usageFrequency}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('usageFrequency', value)}
              />
            </Form.Item>
            <Form.Item label="维护频率 (次/年)">
              <InputNumber
                value={usageData.maintenanceFrequency}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('maintenanceFrequency', value)}
              />
            </Form.Item>
            <Form.Item label="维修率 (%)">
              <InputNumber
                value={usageData.repairRate}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('repairRate', value)}
              />
            </Form.Item>
            <Form.Item label="用户行为影响 (1-10)">
              <InputNumber
                value={usageData.userBehaviorImpact}
                style={{ width: '100%' }}
                min={1}
                max={10}
                onChange={(value) => updateNodeData('userBehaviorImpact', value)}
              />
            </Form.Item>
            <Form.Item label="效率降级率 (%/年)">
              <InputNumber
                value={usageData.efficiencyDegradation}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('efficiencyDegradation', value)}
              />
            </Form.Item>
            <Form.Item label="待机能耗 (kWh)">
              <InputNumber
                value={usageData.standbyEnergyConsumption}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('standbyEnergyConsumption', value)}
              />
            </Form.Item>
            <Form.Item label="使用地点">
              <Select
                value={usageData.usageLocation}
                style={{ width: '100%' }}
                onChange={(value) => updateNodeData('usageLocation', value)}
              >
                <Option value="室内">室内</Option>
                <Option value="室外">室外</Option>
              </Select>
            </Form.Item>
            <Form.Item label="使用模式">
              <Input
                value={usageData.usagePattern}
                onChange={(e) => updateNodeData('usagePattern', e.target.value)}
              />
            </Form.Item>
          </>
        );
        
      case '废弃处置':
        // 使用类型断言告诉TypeScript这是DisposalNodeData类型
        const disposalData = selectedNode.data as DisposalNodeData;
        return (
          <>
            <h4 className="section-title">处置阶段属性</h4>
            <Form.Item label="回收率 (%)">
              <InputNumber
                value={disposalData.recyclingRate}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('recyclingRate', value)}
              />
            </Form.Item>
            <Form.Item label="填埋比例 (%)">
              <InputNumber
                value={disposalData.landfillPercentage}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('landfillPercentage', value)}
              />
            </Form.Item>
            <Form.Item label="焚烧比例 (%)">
              <InputNumber
                value={disposalData.incinerationPercentage}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('incinerationPercentage', value)}
              />
            </Form.Item>
            <Form.Item label="堆肥比例 (%)">
              <InputNumber
                value={disposalData.compostPercentage}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('compostPercentage', value)}
              />
            </Form.Item>
            <Form.Item label="重复使用比例 (%)">
              <InputNumber
                value={disposalData.reusePercentage}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('reusePercentage', value)}
              />
            </Form.Item>
            <Form.Item label="有害废物含量 (%)">
              <InputNumber
                value={disposalData.hazardousWasteContent}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('hazardousWasteContent', value)}
              />
            </Form.Item>
            <Form.Item label="生物降解性 (%)">
              <InputNumber
                value={disposalData.biodegradability}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('biodegradability', value)}
              />
            </Form.Item>
            <Form.Item label="处置能源回收 (kWh/kg)">
              <InputNumber
                value={disposalData.disposalEnergyRecovery}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('disposalEnergyRecovery', value)}
              />
            </Form.Item>
            <Form.Item label="到处置设施的运输距离 (km)">
              <InputNumber
                value={disposalData.transportToDisposal}
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => updateNodeData('transportToDisposal', value)}
              />
            </Form.Item>
            <Form.Item label="处置方法">
              <Input
                value={disposalData.disposalMethod}
                onChange={(e) => updateNodeData('disposalMethod', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="生命周期末端处理">
              <Input
                value={disposalData.endOfLifeTreatment}
                onChange={(e) => updateNodeData('endOfLifeTreatment', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="回收效率 (%)">
              <InputNumber
                value={disposalData.recyclingEfficiency}
                style={{ width: '100%' }}
                min={0}
                max={100}
                onChange={(value) => updateNodeData('recyclingEfficiency', value)}
              />
            </Form.Item>
            <Form.Item label="拆卸难度">
              <Select
                value={disposalData.dismantlingDifficulty}
                style={{ width: '100%' }}
                onChange={(value) => updateNodeData('dismantlingDifficulty', value)}
              >
                <Option value="高">高</Option>
                <Option value="中">中</Option>
                <Option value="低">低</Option>
              </Select>
            </Form.Item>
          </>
        );
        
      default:
        return null;
    }
  };

  // 文件右键菜单 - 当文件被选中时显示
  const fileContextMenu = (
    <Menu onClick={handleFileMenuClick} style={{ minWidth: '180px' }}>
      <Menu.Item key="preview" icon={<FileOutlined />}>预览文件</Menu.Item>
      <Menu.Divider />
      <Menu.SubMenu key="lifecycle_standardize" title={<span><ExperimentOutlined /> 生命週期标准化</span>}>
        <Menu.Item key="bom_lifecycle_standardize">物料清单(BOM)标准化</Menu.Item>
        <Menu.Item key="manufacturing_standardize">生产制造数据标准化</Menu.Item>
        <Menu.Item key="distribution_standardize">分销存储数据标准化</Menu.Item>
        <Menu.Item key="usage_standardize">产品使用数据标准化</Menu.Item>
        <Menu.Item key="disposal_standardize">废弃处置数据标准化</Menu.Item>
      </Menu.SubMenu>
      <Menu.Divider />
      <Menu.Item key="rename" icon={<EditOutlined />}>重命名</Menu.Item>
      <Menu.Item key="delete" icon={<DeleteOutlined />} danger>删除文件</Menu.Item>
    </Menu>
  );

  // 文件右键菜单
  const fileRightClickMenu = (
    <Menu onClick={handleFileMenuClick} style={{ minWidth: '150px' }}>
      {selectedFile?.isLeaf ? (
        // 如果是文件，显示文件操作菜单
        fileContextMenu
      ) : (
        // 如果是文件夹，显示文件夹操作菜单
        <>
          <Menu.Item key="newFolder" icon={<FolderOutlined />}>新建文件夹</Menu.Item>
          <Menu.Item key="upload" icon={<UploadOutlined />}>上传文件</Menu.Item>
          {!selectedFile?.isLeaf && (
            <>
              <Menu.Item key="rename" icon={<EditOutlined />}>重命名</Menu.Item>
              <Menu.Item key="delete" icon={<DeleteOutlined />}>删除</Menu.Item>
            </>
          )}
        </>
      )}
    </Menu>
  );

  // 添加生成报告的函数
  const handleGenerateReport = () => {
    if (!selectedNodes.length) {
      message.warning('请先选择一个节点以生成报告');
      return;
    }

    setReportGenerating(true);
    
    // 获取最终产品节点（被选中的节点）
    const finalProduct = selectedNodes[0];
    
    // 计算真实数据（排除最终产品节点）
    const totalCarbonFootprint = calculateTotalCarbonFootprint();
    const totalWeight = calculateTotalWeight();
    const carbonIntensity = totalWeight > 0 ? totalCarbonFootprint / totalWeight : 0;
    const dataCompleteness = calculateDataCompleteness();
    const primaryDataRate = calculatePrimaryDataRate();
    const verifiedDataRate = calculateVerifiedDataRate();
    const overallDataQuality = (dataCompleteness * 0.4 + primaryDataRate * 0.3 + verifiedDataRate * 0.3);
    
    // 计算生命周期阶段排放（排除最终产品节点）
    const stageEmissions = calculateStageEmissions();
    const carbonFactorSources = calculateCarbonFactorSources();
    const hotspotNodes = calculateHotspotNodes();
    
    // 收集当前工作流数据
    const reportData = {
      workflowName: workflowName || '产品碳足迹分析报告',
      finalProduct: {
        id: finalProduct.id,
        name: finalProduct.data.productName || finalProduct.data.label || '最终产品',
        totalCarbonFootprint: finalProduct.data.carbonFootprint || 0,
        weight: finalProduct.data.weight || 0
      },
      nodes: nodes.filter(node => !node.id.includes('product-')), // 排除最终产品节点
      edges: edges,
      totalCarbonFootprint,
      totalWeight,
      carbonIntensity,
      dataCompleteness,
      primaryDataRate,
      verifiedDataRate,
      overallDataQuality,
      stageEmissions,
      carbonFactorSources,
      hotspotNodes,
      generatedAt: new Date().toISOString()
    };
    
    // 保存数据到localStorage，以便报告页面获取
    localStorage.setItem('workflowReportData', JSON.stringify(reportData));
    
    // 生成报告
    setTimeout(() => {
      setReportGenerating(false);
      const currentPath = window.location.pathname;
      const workflowId = currentPath.split('/editor/')[1];
      window.open(`/report/${workflowId || '1'}`, '_blank');
    }, 1000);
  };

  // 打开生命周期文件标准化对话框
  const openLifecycleFileStandardization = (stage: string) => {
    if (!selectedFile || !selectedFile.content) {
      message.warning('请先上传或选择一个文件');
      return;
    }
    
    // 如果是BOM标准化，直接调用BOM标准化功能
    if (stage === 'bom') {
      openBomAiStandardization();
      return;
    }
    
    // 设置文件的生命周期阶段信息，方便之后拖拽使用
    selectedFile.lifecycleStage = stage;
    
    setLifecycleStage(stage);
    setOriginalLifecycleContent(selectedFile.content);
    setStandardizedLifecycleContent('');
    setLifecycleFileModalVisible(true);
  };


  // 处理生命周期文件标准化流程
  const handleLifecycleFileStandardize = async () => {
    if (!originalLifecycleContent || !selectedFile || !lifecycleStage) {
      message.warning('请先上传文件并选择生命週期阶段');
      return;
    }
    
    setLifecycleAiProcessing(true);
    message.loading({ 
      content: `正在使用AI进行${getStageName(lifecycleStage)}阶段文件标准化，这可能需要较长时间...`, 
      key: 'lifecycleStandardize', 
      duration: 0 
    });
    
    try {
      // 调用大模型API进行文件规范化
      const standardizedContent = await callLLMForLifecycleStandardization(originalLifecycleContent, lifecycleStage);
      
      if (!standardizedContent || typeof standardizedContent !== 'string') {
        throw new Error('返回的数据格式不正确');
      }
      
      setStandardizedLifecycleContent(standardizedContent);
      message.success({ content: 'AI规范化处理完成！', key: 'lifecycleStandardize' });
    } catch (error: any) {
      console.error('生命週期文件规范化处理失败:', error);
      
      // 处理特定的错误类型
      let errorMsg = '请重试';
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMsg = '处理超时，请尝试减少数据量或稍后再试';
      } else if (error.response) {
        // 服务器返回了错误状态码
        errorMsg = `服务器错误 (${error.response.status}): ${error.response.data?.detail || error.message}`;
      } else if (error.request) {
        // 请求发出但没有收到响应
        errorMsg = '无法连接到服务器，请检查网络连接';
      } else {
        // 请求设置时发生错误
        errorMsg = error.message || '未知错误';
      }
      
      // 显示错误提示
      message.error({ 
        content: `AI规范化处理失败: ${errorMsg}`, 
        key: 'lifecycleStandardize',
        duration: 5
      });
    } finally {
      setLifecycleAiProcessing(false);
    }
  };

  // 调用大模型API进行生命周期文件规范化
  const callLLMForLifecycleStandardization = async (originalContent: string, stage: string): Promise<string> => {
    try {
      console.log(`=== ${getStageName(stage)}阶段文件标准化开始 ===`);
      console.log('原始数据:', originalContent);
      console.log('发送数据到API进行标准化处理');
      
      // 调用后端的standardizeLifecycleDocument端点
      const response = await aiApi.standardizeLifecycleDocument(originalContent, stage);
      
      console.log('API响应状态:', response.status);
      console.log('API返回数据:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('标准化处理失败:', error);
      throw error;
    }
  };

  // 获取生命周期阶段名称
  const getStageName = (stage: string): string => {
    const stageNames: Record<string, string> = {
      'bom': '物料清单(BOM)',
      'manufacturing': '生产制造',
      'distribution': '分销存储',
      'usage': '产品使用',
      'disposal': '废弃处置'
    };
    return stageNames[stage] || '未知阶段';
  };

  // 保存标准化后的生命周期文件
  const saveStandardizedLifecycleFile = () => {
    if (!standardizedLifecycleContent || !selectedFile) return;
    
    try {
      // 构建新的文件名 (添加standardized前缀)
      const originalKey = selectedFile.key;
      const fileExtension = originalKey.includes('.') ? originalKey.split('.').pop() : '';
      const baseName = originalKey.includes('.') ? originalKey.substring(0, originalKey.lastIndexOf('.')) : originalKey;
      const standardizedKey = `${baseName}_standardized${fileExtension ? `.${fileExtension}` : ''}`;
      
      // 在同一个文件夹下创建新文件
      let parentKey: string | null = null;
      if (selectedFile.key.includes('/')) {
        parentKey = selectedFile.key.substring(0, selectedFile.key.lastIndexOf('/'));
      }
      
      // 更新树形数据
      setTreeData(prevData => {
        const newData = [...prevData];
        
        // 寻找父节点
        const findParent = (nodes: TreeNodeType[]): TreeNodeType | null => {
          for (const node of nodes) {
            if (node.key === parentKey) {
              return node;
            }
            if (node.children) {
              const found = findParent(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        // 如果有父节点，添加到父节点的子节点列表中
        if (parentKey) {
          const parent = findParent(newData);
          if (parent && parent.children) {
            parent.children.push({
              title: `${getStageName(lifecycleStage)}标准化_${selectedFile.title}`,
              key: standardizedKey,
              isLeaf: true,
              content: standardizedLifecycleContent,
              fileType: 'csv',
              data: originalLifecycleContent, // 保存原始内容以备参考
              lifecycleStage: lifecycleStage // 添加生命周期阶段信息
            });
          }
        } else {
          // 否则添加到根节点
          newData.push({
            title: `${getStageName(lifecycleStage)}标准化_${selectedFile.title}`,
            key: standardizedKey,
            isLeaf: true,
            content: standardizedLifecycleContent,
            fileType: 'csv',
            data: originalLifecycleContent,
            lifecycleStage: lifecycleStage // 添加生命周期阶段信息
          });
        }
        
        return newData;
      });
      
      // 关闭对话框并显示成功消息
      setLifecycleFileModalVisible(false);
      message.success('标准化文件已保存');
    } catch (error) {
      console.error('保存标准化文件失败:', error);
      message.error('保存标准化文件失败');
    }
  };

  // 产品材料分解函数
  const decomposeProductMaterials = useCallback(async () => {
    if (!selectedNode) return;
    
    const productName = selectedNode.data.productName;
    const totalWeight = selectedNode.data.weight || 0;
    
    if (!productName || totalWeight <= 0) {
      message.error('产品名称和重量必须有效，无法进行材料分解');
      return;
    }
    
    try {
      message.loading({ content: '正在分解产品材料...', key: 'decompose', duration: 0 });
      
      const response = await fetch('/api/ai/decompose-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_name: productName,
          total_weight: totalWeight,
          unit: 'g'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '产品分解失败');
      }
      
      const data = await response.json();
      message.success({ content: '产品材料分解成功', key: 'decompose' });
      
      // 取得材料列表
      const decomposedMaterials = data.materials || [];
      
      if (decomposedMaterials.length === 0) {
        message.info('没有找到可分解的材料');
        return;
      }
      
      // 为每个材料创建新节点
      const nodePosition = { x: selectedNode.position.x, y: selectedNode.position.y + 150 };
      const materialNodes = [];
      
      // 保存当前状态到历史记录
      saveToHistory(nodes, edges);
      
      // 在选中节点下方创建材料节点
      for (let i = 0; i < decomposedMaterials.length; i++) {
        const material = decomposedMaterials[i];
        
        // 计算位置，使节点水平散开
        const xOffset = i * 250 - ((decomposedMaterials.length - 1) * 250) / 2;
        const newPosition = {
          x: nodePosition.x + xOffset,
          y: nodePosition.y
        };
        
        // 创建新节点
        const newNodeId = `${selectedNode.id}-material-${i + 1}`;
        const newNode = {
          id: newNodeId,
          type: 'product',
          position: newPosition,
          data: {
            productName: material.material_name,
            weight: material.weight,
            carbonFactor: material.carbon_factor,
            carbonFootprint: material.carbon_footprint,
            dataSource: 'AI材料分解',
            lifecycleStage: '原材料',
            label: material.material_name,
            percentageOfTotal: material.percentage
          }
        };
        
        materialNodes.push(newNode);
        
        // 创建从选中节点到新节点的边
        const newEdge = {
          id: `${selectedNode.id}-to-${newNodeId}`,
          source: selectedNode.id,
          target: newNodeId,
          type: 'floating',
          style: { stroke: '#1890ff' }
        };
        
        // 添加新节点和边
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      }
      
      // 更新选中节点的信息
      setNodes((nds) => nds.map((node) => {
        if (node.id === selectedNode.id) {
          // 计算总碳足迹
          const totalCarbonFootprint = decomposedMaterials.reduce(
            (sum: number, material: { carbon_footprint: number }) => sum + material.carbon_footprint,
            0
          );
          
          return {
            ...node,
            data: {
              ...node.data,
              carbonFootprint: totalCarbonFootprint,
              carbonFactor: totalWeight > 0 ? totalCarbonFootprint / totalWeight : 0,
              dataSource: '基于材料分解计算'
            }
          };
        }
        return node;
      }));
      
      // 打开材料分解结果面板
      setMaterialDecompositionResults({
        visible: true,
        originalNode: selectedNode,
        materials: decomposedMaterials
      });
      
    } catch (error: unknown) {
      console.error('产品分解错误:', error);
      message.error({ 
        content: `产品分解失败: ${error instanceof Error ? error.message : '未知错误'}`, 
        key: 'decompose' 
      });
    }
  }, [selectedNode, nodes, edges, saveToHistory]);

  // 分发供应商填写功能
  const distributeToVendor = () => {
    console.log('distributeToVendor函数被调用');
    // 直接显示消息，不打开模态框
    message.info('供应商任务功能暂未实现，请等待后续版本。');
    console.log('显示消息而不是打开模态框');
  };
  
  // 监控模态框状态
  useEffect(() => {
    console.log('供应商任务模态框状态变更:', vendorModalVisible);
  }, [vendorModalVisible]);
  
  // 处理确认分发任务
  const handleVendorTaskConfirm = async () => {
    if (!editedVendorName.trim()) {
      message.warning('请输入供应商名称');
      return;
    }
    
    try {
      // 获取工作流ID
      const workflowId = parseInt(id || '0');
      
      if (!workflowId || workflowId <= 0) {
        message.error('工作流ID无效');
        return;
      }
      
      if (!selectedNode) {
        message.warning('请先选择一个节点');
        return;
      }
      
      // 创建任务数据
      const taskData = {
        workflow_id: workflowId,
        product_id: selectedNode.id,
        product_name: selectedNode.data?.productName || selectedNode.data?.label || '未命名产品',
        vendor: editedVendorName,
        description: vendorTaskDescription,
        deadline: vendorTaskDeadline ? vendorTaskDeadline.format('YYYY-MM-DDTHH:mm:ss') : undefined
      };
      
      console.log('创建供应商任务:', taskData);
      
      // 调用API创建任务
      const response = await vendorTaskApi.createVendorTask(taskData);
      
      message.success('供应商任务创建成功');
      setVendorModalVisible(false);
    } catch (error) {
      console.error('创建供应商任务失败:', error);
      message.error('创建供应商任务失败，请稍后再试');
    }
  };
  
  // 取消供应商任务模态框
  const handleVendorModalCancel = () => {
    console.log('关闭供应商任务模态框');
    setVendorModalVisible(false);
    console.log('vendorModalVisible设置为false');
  };

  // 处理生产制造阶段的生命周期文件
  const processManufacturingFile = (file: any, position: { x: number, y: number }) => {
    console.log('开始处理生产制造阶段文件:', file.title);
    console.log('文件内容类型:', typeof file.content, '长度:', 
      typeof file.content === 'string' ? file.content.length : 'N/A');
    console.log('文件内容前100个字符:', typeof file.content === 'string' ? file.content.substring(0, 100) : 'N/A');
    
    // 确保文件内容是字符串类型
    if (typeof file.content !== 'string') {
      message.error('无法读取文件内容或内容格式不正确');
      return;
    }
    
    // 处理内容，尝试不同的行分隔符
    let lines = file.content.split('\n');
    if (lines.length <= 1) {
      lines = file.content.split('\r\n');
    }
    if (lines.length <= 1) {
      lines = file.content.split('\r');
    }
    
    console.log(`CSV内容共有${lines.length}行`);
    if (lines.length < 2) {
      message.error('生产制造文件格式错误：文件内容不足');
      return;
    }
    
    // 第一行是标题，尝试不同的分隔符
    let headers = lines[0].split(',').map((h: string) => h.trim());
    
    // 如果列数太少，尝试其他分隔符
    if (headers.length <= 1) {
      headers = lines[0].split(';').map((h: string) => h.trim());
    }
    if (headers.length <= 1) {
      headers = lines[0].split('\t').map((h: string) => h.trim());
    }
    
    console.log('解析到的标题行:', headers);
    
    // 标题索引映射 - 生产制造阶段特有的字段
    const headerMap = {
      id: headers.findIndex((h: string) => h.includes('ID') || h.includes('编号')),
      name: headers.findIndex((h: string) => h.includes('名称') || h.includes('工序名')),
      weight: headers.findIndex((h: string) => h.includes('重量')),
      carbonFactor: headers.findIndex((h: string) => h.includes('碳排放因子') || h.includes('碳因子')),
      // 生产制造阶段特有字段
      energyConsumption: headers.findIndex((h: string) => h.includes('能源消耗')),
      energyType: headers.findIndex((h: string) => h.includes('能源类型')),
      processEfficiency: headers.findIndex((h: string) => h.includes('工艺效率')),
      wasteGeneration: headers.findIndex((h: string) => h.includes('废物产生量')),
      waterConsumption: headers.findIndex((h: string) => h.includes('水资源消耗')),
      processType: headers.findIndex((h: string) => h.includes('工序类型') || h.includes('加工类型'))
    };
    
    console.log('标题映射:', headerMap);
    
    // 检查是否包含能源类型字段，这可能是我们唯一可以用来分组的字段
    if (headerMap.energyType === -1) {
      console.warn('能源类型字段不存在，可能无法正确分组工序');
    }
    
    // 创建节点数组
    const newNodes: Node<ManufacturingNodeData>[] = [];
    const horizontalSpacing = 300; // 节点水平间距
    const verticalSpacing = 250; // 节点垂直间距
    const itemsPerRow = 3; // 每行最多显示的节点数
    
    // 尝试从data字段中提取产品名称和重量
    let productName = "未知产品";
    let totalWeight = 0;
    
    // 尝试从file.data中解析产品信息
    if (typeof file.data === 'string') {
      const dataLines = file.data.split('\n');
      console.log('解析data字段，行数:', dataLines.length);
      
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 4 && parts[0] === '产品') {
          productName = parts[1] || productName;
          totalWeight = parseFloat(parts[2]) || totalWeight;
          console.log(`从data中提取到产品: ${productName}, 重量: ${totalWeight}${parts[3]}`);
          
          // 如果单位是t，转换为kg
          if (parts[3]?.toLowerCase().includes('t')) {
            totalWeight *= 1000;
            console.log(`转换后重量: ${totalWeight}kg`);
          }
          break;
        }
      }
    }
    
    // 分析处理能源消耗数据
    const energyTypes: {
      type: string;
      consumption: number;
      node?: Node<ManufacturingNodeData>;
    }[] = [];
    
    // 从第二行开始，每行可能包含一种能源类型
    let totalEnergyConsumption = 0;
    let validDataLines = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`跳过空行：${i+1}`);
        continue; // 跳过空行
      }
      
      // 尝试不同的分隔符拆分行
      let values = line.split(',').map((v: string) => v.trim());
      if (values.length <= 1) {
        values = line.split(';').map((v: string) => v.trim());
      }
      if (values.length <= 1) {
        values = line.split('\t').map((v: string) => v.trim());
      }
      
      console.log(`第${i+1}行解析到的值:`, values);
      
      // 提取数据
      let processId = '';
      let processName = '';
      
      // 如果有ID列，提取ID
      if (headerMap.id !== -1 && headerMap.id < values.length) {
        processId = values[headerMap.id];
      }
      
      // 如果有名称列，提取名称
      if (headerMap.name !== -1 && headerMap.name < values.length) {
        processName = values[headerMap.name];
      }
      
      // 尝试提取能源类型
      let energyType = '未知能源';
      if (headerMap.energyType !== -1 && headerMap.energyType < values.length) {
        energyType = values[headerMap.energyType];
      }
      
      // 尝试提取能源消耗
      let energyConsumption = 0;
      if (headerMap.energyConsumption !== -1 && headerMap.energyConsumption < values.length) {
        energyConsumption = parseFloat(values[headerMap.energyConsumption]);
        if (isNaN(energyConsumption)) energyConsumption = 0;
      }
      
      // 如果行中至少有能源类型，则记录这个能源
      if (energyType && energyType !== '未知能源') {
        energyTypes.push({
          type: energyType,
          consumption: energyConsumption
        });
        totalEnergyConsumption += energyConsumption;
        validDataLines++;
        console.log(`记录能源类型: ${energyType}, 消耗: ${energyConsumption}`);
      }
    }
    
    // 如果我们找到了能源类型，为每种能源创建一个节点
    if (energyTypes.length > 0) {
      console.log(`找到${energyTypes.length}种能源类型，总消耗: ${totalEnergyConsumption}kWh`);
      
      // 为每种能源类型创建一个节点
      energyTypes.forEach((energy, index) => {
        // 计算位置
        const col = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);
        
        // 创建节点ID
        const nodeId = `manufacturing-energy-${Date.now()}-${index}`;
        
        // 使用固定的碳排放因子（如果需要，这里可以根据能源类型设置不同的因子）
        // TODO 把这块
        const carbonFactor = energy.type.includes('电力') ? 0.5839 : 
                           energy.type.includes('天然气') ? 0.202 : 
                           energy.type.includes('煤') ? 2.93 : 
                           0; // 默认碳排放因子
        
        // 估计重量 - 这里使用一个假设：每kWh能源对应0.1kg的产品重量
        const estimatedWeight = 0;
        
        // 计算碳足迹
        const carbonFootprint = energy.consumption * carbonFactor;
        
        // 创建节点名称
        const nodeName = `${energy.type}消耗`;
        
        // 创建节点
        const node: Node<ManufacturingNodeData> = {
          id: nodeId,
          type: 'manufacturing',
          position: {
            x: position.x - ((itemsPerRow - 1) * horizontalSpacing / 2) + col * horizontalSpacing + (Math.random() * 50 - 25),
            y: position.y - verticalSpacing + row * verticalSpacing + (Math.random() * 30 - 15),
          },
          data: {
            label: nodeName,
            productName: nodeName,
            weight: estimatedWeight,
            carbonFootprint: carbonFootprint,
            dataSource: '生产制造阶段文件',
            lifecycleStage: '生产制造',
            emissionFactor: `${carbonFactor} kgCO2e/kWh`,
            calculationMethod: '因子法',
            uncertainty: '',
            verificationStatus: '未验证',
            applicableStandard: 'ISO 14040',
            completionStatus: '',
            carbonFactor: carbonFactor,
            uncertaintyScore: 0,
            // 生产制造阶段特有字段
            energyConsumption: energy.consumption,
            energyType: energy.type,
            processEfficiency: 0,
            wasteGeneration: 0,
            waterConsumption: 0,
            recycledMaterialPercentage: 0,
            productionCapacity: 0,
            machineUtilization: 0,
            qualityDefectRate: 0,
            processTechnology: '',
            manufacturingStandard: '',
            automationLevel: '',
            
          }
        };
        
        // 将节点添加到能源类型对象中
        energy.node = node;
        
        // 添加节点到节点数组
        newNodes.push(node);
        
        console.log(`已创建能源节点: ${nodeId}, 名称: ${nodeName}, 能源类型: ${energy.type}, 消耗: ${energy.consumption}kWh`);
      });
      
      
     
      // 添加节点到画布
      setNodes(nds => {
        console.log(`添加${newNodes.length}个节点到现有的 ${nds.length} 个节点中`);
        return [...nds, ...newNodes];
      });
      
      // 添加边到画布
      // setEdges(eds => {
      //   console.log(`添加${newEdges.length}条边`);
      //   return [...eds, ...newEdges];
      // });
      
      // 强制更新视图
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView();
        }
      }, 100);
      
      message.success(`成功从生产制造文件创建了${energyTypes.length}个能源节点和1个产品节点`);
    } else {
      // 如果没有找到能源数据，创建一个通用的制造节点
      const nodeId = `manufacturing-${Date.now()}`;
      
      const node: Node<ManufacturingNodeData> = {
        id: nodeId,
        type: 'manufacturing',
        position: position,
        data: {
          label: productName || file.title || '生产制造',
          productName: productName || file.title || '生产制造',
          weight: totalWeight ,
          carbonFootprint: 0, // 默认碳足迹
          dataSource: '生产制造阶段文件',
          lifecycleStage: '生产制造',
          emissionFactor: '',
          calculationMethod: '默认值',
          uncertainty: '高',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14040',
          completionStatus: '已完成',
          carbonFactor: 50, // 默认碳因子
          uncertaintyScore: 0,
          // 生产制造阶段特有字段
          energyConsumption: 0,
          energyType: '未知',
          processEfficiency: 0,
          wasteGeneration: 0,
          waterConsumption: 0,
          recycledMaterialPercentage: 0,
          productionCapacity: 0,
          machineUtilization: 0,
          qualityDefectRate: 0,
          processTechnology: '',
          manufacturingStandard: '',
          automationLevel: '低',
          
        }
      };
      
      // 添加节点到画布
      setNodes(nds => {
        console.log(`添加单个节点到现有的 ${nds.length} 个节点中`);
        return [...nds, node];
      });
      
      message.success(`成功创建了生产制造节点`);
    }
  };

  // 处理分销和储存阶段的生命周期文件
  const processDistributionFile = (file: any, position: { x: number, y: number }) => {
    console.log('开始处理分销和储存阶段文件:', file.title);
    console.log('文件内容类型:', typeof file.content, '长度:', 
      typeof file.content === 'string' ? file.content.length : 'N/A');
    console.log('文件内容前100个字符:', typeof file.content === 'string' ? file.content.substring(0, 100) : 'N/A');
    
    // 确保文件内容是字符串类型
    if (typeof file.content !== 'string') {
      message.error('无法读取文件内容或内容格式不正确');
      return;
    }
    
    // 处理内容，尝试不同的行分隔符
    let lines = file.content.split('\n');
    if (lines.length <= 1) {
      lines = file.content.split('\r\n');
    }
    if (lines.length <= 1) {
      lines = file.content.split('\r');
    }
    
    console.log(`CSV内容共有${lines.length}行`);
    if (lines.length < 2) {
      message.error('分销和储存文件格式错误：文件内容不足');
      return;
    }
    
    // 第一行是标题，尝试不同的分隔符
    let headers = lines[0].split(',').map((h: string) => h.trim());
    
    // 如果列数太少，尝试其他分隔符
    if (headers.length <= 1) {
      headers = lines[0].split(';').map((h: string) => h.trim());
    }
    if (headers.length <= 1) {
      headers = lines[0].split('\t').map((h: string) => h.trim());
    }
    
    console.log('解析到的标题行:', headers);
    
    // 标题索引映射 - 分销和储存阶段特有的字段
    const headerMap = {
      id: headers.findIndex((h: string) => h.includes('ID') || h.includes('编号')),
      name: headers.findIndex((h: string) => h.includes('名称') || h.includes('地点') || h.includes('仓库')|| h.includes('物品')),
      weight: headers.findIndex((h: string) => h.includes('重量')),
      carbonFactor: headers.findIndex((h: string) => h.includes('碳排放因子') || h.includes('碳因子')),
      // 分销和储存阶段特有字段
      transportationMode: headers.findIndex((h: string) => h.includes('运输方式')),
      transportationDistance: headers.findIndex((h: string) => h.includes('运输距离')),
      startPoint: headers.findIndex((h: string) => h.includes('起点') || h.includes('始发地')),
      endPoint: headers.findIndex((h: string) => h.includes('终点') || h.includes('目的地')),
      vehicleType: headers.findIndex((h: string) => h.includes('车辆类型')),
      fuelType: headers.findIndex((h: string) => h.includes('燃料类型')),
      fuelEfficiency: headers.findIndex((h: string) => h.includes('燃油效率')),
      refrigeration: headers.findIndex((h: string) => h.includes('冷藏')),
      packagingMaterial: headers.findIndex((h: string) => h.includes('包装材料')),
      packagingWeight: headers.findIndex((h: string) => h.includes('包装重量')),
      warehouseEnergy: headers.findIndex((h: string) => h.includes('仓库能源')),
      storageTime: headers.findIndex((h: string) => h.includes('储存时间')),
      storageConditions: headers.findIndex((h: string) => h.includes('储存条件'))
    };
    
    console.log('标题映射:', headerMap);
    
    // 检查名称/地点列，如果缺失只提供警告
    if (headerMap.name === -1) {
      console.warn('分销和储存文件缺少名称/地点列，将使用默认命名');
      message.warning('分销和储存文件缺少名称/地点列，将使用默认命名');
      // 继续处理，不返回错误
    }
    
    // 创建节点数组
    const newNodes: Node<DistributionNodeData>[] = [];
    const horizontalSpacing = 250; // 节点水平间距
    const verticalSpacing = 200; // 节点垂直间距
    const itemsPerRow = 4; // 每行最多显示的节点数
    
    // 从第二行开始，每行是一个分销/储存点
    let validDataLines = 0;
    const locationNodes: Node<DistributionNodeData>[] = [];
    
    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`跳过空行：${i+1}`);
        continue; // 跳过空行
      }
      
      // 尝试不同的分隔符拆分行
      let values = line.split(',').map((v: string) => v.trim());
      if (values.length <= 1) {
        values = line.split(';').map((v: string) => v.trim());
      }
      if (values.length <= 1) {
        values = line.split('\t').map((v: string) => v.trim());
      }
      
      console.log(`第${i+1}行解析到的值:`, values);
      
      // 确保有足够的列
      const minRequiredColumn = Math.max(
        headerMap.name !== -1 ? headerMap.name : 0,
        headerMap.weight !== -1 ? headerMap.weight : 0,
        headerMap.carbonFactor !== -1 ? headerMap.carbonFactor : 0
      );
      
      if (values.length <= minRequiredColumn) {
        console.warn(`跳过行 ${i+1}：列数不足，期望至少 ${minRequiredColumn+1} 列，实际 ${values.length} 列`);
        continue;
      }
      
      // 提取数据
      const locationId = headerMap.id !== -1 && headerMap.id < values.length ? 
                        values[headerMap.id] : `distribution-${i}`;
                      
      const locationName = headerMap.name !== -1 && headerMap.name < values.length ? 
                          values[headerMap.name] : `分销点 ${i}`;
      
      // 提取其他数据，使用默认值如果字段不存在
      let weight = 0;
      if (headerMap.weight !== -1 && headerMap.weight < values.length) {
        weight = parseFloat(values[headerMap.weight]);
        if (isNaN(weight)) {
          console.warn(`行 ${i+1}：重量不是有效数字，使用默认值0`);
          weight = 0;
        }
      }
      
      let carbonFactor = 0;
      if (headerMap.carbonFactor !== -1 && headerMap.carbonFactor < values.length) {
        carbonFactor = parseFloat(values[headerMap.carbonFactor]);
        if (isNaN(carbonFactor)) {
          console.warn(`行 ${i+1}：碳排放因子不是有效数字，使用默认值0`);
          carbonFactor = 0;
        }
      }
      
      // 计算碳足迹
      const carbonFootprint = weight * carbonFactor;
      
      


      // 提取分销和储存阶段特有字段
      let transportationMode = '';
      if (headerMap.transportationMode !== -1 && headerMap.transportationMode < values.length) {
        transportationMode = values[headerMap.transportationMode];
      }
      
      let transportationDistance = 0;
      if (headerMap.transportationDistance !== -1 && headerMap.transportationDistance < values.length) {
        transportationDistance = parseFloat(values[headerMap.transportationDistance]);
        if (isNaN(transportationDistance)) transportationDistance = 0;
      }
      
      let startPoint = '';
      if (headerMap.startPoint !== -1 && headerMap.startPoint < values.length) {
        startPoint = values[headerMap.startPoint];
      }
      
      let endPoint = '';
      if (headerMap.endPoint !== -1 && headerMap.endPoint < values.length) {
        endPoint = values[headerMap.endPoint];
      }
      
      let vehicleType = ''; // 默认为卡车
      if (headerMap.vehicleType !== -1 && headerMap.vehicleType < values.length) {
        vehicleType = values[headerMap.vehicleType];
      }
      
      let fuelType = ''; // 默认为柴油
      if (headerMap.fuelType !== -1 && headerMap.fuelType < values.length) {
        fuelType = values[headerMap.fuelType];
      }
      
      let fuelEfficiency = 0;
      if (headerMap.fuelEfficiency !== -1 && headerMap.fuelEfficiency < values.length) {
        fuelEfficiency = parseFloat(values[headerMap.fuelEfficiency]);
        if (isNaN(fuelEfficiency)) fuelEfficiency = 0;
      }
      
      let refrigeration = false;
      if (headerMap.refrigeration !== -1 && headerMap.refrigeration < values.length) {
        refrigeration = values[headerMap.refrigeration].toLowerCase() === 'true' || 
                        values[headerMap.refrigeration].toLowerCase() === '是' ||
                        values[headerMap.refrigeration] === '1';
      }
      
      // 根据运输距离自动推荐运输方式
      let aiRecommendation = '';
 
      
      validDataLines++;
      
      // 计算位置
      const col = (validDataLines - 1) % itemsPerRow;
      const row = Math.floor((validDataLines - 1) / itemsPerRow);
      
      // 创建节点ID
      const nodeId = `distribution-${Date.now()}-${i}`;
      
      // 创建节点
      const node: Node<DistributionNodeData> = {
        id: nodeId,
        type: 'distribution',
        position: {
          x: position.x + (col - Math.floor(itemsPerRow/2)) * horizontalSpacing + (Math.random() * 40 - 20),
          y: position.y + row * verticalSpacing + (Math.random() * 20 - 10),
        },
        data: {
          label: locationName,
          productName: locationName,
          weight: weight,
          carbonFootprint: carbonFootprint,
          dataSource: '分销和储存阶段文件',
          lifecycleStage: '分销和储存',
          emissionFactor: '',
          calculationMethod: '因子法',
          uncertainty: '',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14040',
          completionStatus: '已完成',
          carbonFactor: carbonFactor,
          uncertaintyScore: 0,
      
          // 分销和储存阶段特有字段
          transportationMode: transportationMode,
          transportationDistance: transportationDistance,
          startPoint: startPoint,
          endPoint: endPoint,
          vehicleType: vehicleType,
          fuelType: fuelType,
          fuelEfficiency: fuelEfficiency,
          refrigeration: refrigeration,
          packagingMaterial: '',
          packagingWeight: 0,
          warehouseEnergy: 0,
          storageTime: 0,
          storageConditions: '',
          loadFactor: 80, // 默认装载因子80%
          distributionNetwork: '',
          aiRecommendation: aiRecommendation
        }
      };
      
      // 添加节点到临时数组
      locationNodes.push(node);
      console.log(`已创建节点: ${nodeId}, 名称: ${locationName}`);
    }
    
    if (locationNodes.length === 0) {
      console.error('未从分销和储存文件中提取到有效数据，有效行数：0');
      message.error('未从分销和储存文件中提取到有效数据');
      return;
    }
    
    console.log(`共从分销和储存文件中提取了${locationNodes.length}条有效数据`);
    
    // 添加所有分销点节点
    locationNodes.forEach(node => newNodes.push(node));
    
    // 创建边数组连接分销节点 - 根据起点和终点创建连接
    const newEdges: Edge[] = [];
    
    // 创建基于起点/终点信息的边
    const locationMap = new Map<string, Node<DistributionNodeData>>();
    locationNodes.forEach(node => {
      // 使用节点名称作为定位键
      locationMap.set(node.data.productName, node);
    });
    
    locationNodes.forEach(node => {
      if (node.data.startPoint && node.data.endPoint) {
        // 查找匹配的起点和终点节点
        const startNode = locationMap.get(node.data.startPoint);
        const endNode = locationMap.get(node.data.endPoint);
        
        if (startNode && endNode) {
          const edge: Edge = {
            id: `edge-${startNode.id}-${endNode.id}`,
            source: startNode.id,
            target: endNode.id,
            type: 'default'
          };
          
          // 添加边
          newEdges.push(edge);
          console.log(`创建运输连接: ${edge.id}, 从: ${startNode.data.productName} 到: ${endNode.data.productName}`);
        }
      }
    });
    
    // 如果没有基于起点/终点的边，则创建顺序连接
    // if (newEdges.length === 0 && locationNodes.length > 1) {
    //   for (let i = 0; i < locationNodes.length - 1; i++) {
    //     const edge: Edge = {
    //       id: `edge-${locationNodes[i].id}-${locationNodes[i+1].id}`,
    //       source: locationNodes[i].id,
    //       target: locationNodes[i+1].id,
    //       type: 'default'
    //     };
        
    //     // 添加边
    //     newEdges.push(edge);
    //     console.log(`创建默认运输连接: ${edge.id}, 从: ${locationNodes[i].data.productName} 到: ${locationNodes[i+1].data.productName}`);
    //   }
    // }
    
    console.log(`创建了${locationNodes.length}个分销/储存节点和${newEdges.length}条连接边`);
    
    // 添加节点到画布
    setNodes(nds => {
      console.log(`添加${newNodes.length}个节点到现有的 ${nds.length} 个节点中`);
      return [...nds, ...newNodes];
    });
    
    // 添加边到画布
    setEdges(eds => {
      console.log(`添加${newEdges.length}条边`);
      return [...eds, ...newEdges];
    });
    
    // 强制更新视图
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView();
      }
    }, 100);
    
    message.success(`成功从分销和储存文件创建了${locationNodes.length}个分销/储存节点`);
  };

  // 处理产品使用阶段的生命周期文件
  const processUsageFile = (file: any, position: { x: number, y: number }) => {
    console.log('开始处理产品使用阶段文件:', file.title);
    console.log('文件内容类型:', typeof file.content, '长度:', 
      typeof file.content === 'string' ? file.content.length : 'N/A');
    console.log('文件内容前100个字符:', typeof file.content === 'string' ? file.content.substring(0, 100) : 'N/A');
    
    // 确保文件内容是字符串类型
    if (typeof file.content !== 'string') {
      message.error('无法读取文件内容或内容格式不正确');
      return;
    }
    
    // 处理内容，尝试不同的行分隔符
    let lines = file.content.split('\n');
    if (lines.length <= 1) {
      lines = file.content.split('\r\n');
    }
    if (lines.length <= 1) {
      lines = file.content.split('\r');
    }
    
    console.log(`CSV内容共有${lines.length}行`);
    if (lines.length < 2) {
      message.error('产品使用文件格式错误：文件内容不足');
      return;
    }
    
    // 第一行是标题，尝试不同的分隔符
    let headers = lines[0].split(',').map((h: string) => h.trim());
    
    // 如果列数太少，尝试其他分隔符
    if (headers.length <= 1) {
      headers = lines[0].split(';').map((h: string) => h.trim());
    }
    if (headers.length <= 1) {
      headers = lines[0].split('\t').map((h: string) => h.trim());
    }
    
    console.log('解析到的标题行:', headers);
    
    // 标题索引映射 - 产品使用阶段特有的字段
    const headerMap = {
      id: headers.findIndex((h: string) => h.includes('ID') || h.includes('编号')),
      name: headers.findIndex((h: string) => h.includes('名称') || h.includes('产品') || h.includes('型号')),
      weight: headers.findIndex((h: string) => h.includes('重量')),
      carbonFactor: headers.findIndex((h: string) => h.includes('碳排放因子') || h.includes('碳因子')),
      // 产品使用阶段特有字段
      lifespan: headers.findIndex((h: string) => h.includes('寿命') || h.includes('生命周期')),
      energyConsumptionPerUse: headers.findIndex((h: string) => h.includes('能源消耗') || h.includes('每次使用能耗')),
      waterConsumptionPerUse: headers.findIndex((h: string) => h.includes('水资源消耗') || h.includes('每次使用水量')),
      consumablesUsed: headers.findIndex((h: string) => h.includes('消耗品')),
      consumablesWeight: headers.findIndex((h: string) => h.includes('消耗品重量')),
      usageFrequency: headers.findIndex((h: string) => h.includes('使用频率')),
      maintenanceFrequency: headers.findIndex((h: string) => h.includes('维护频率')),
      repairRate: headers.findIndex((h: string) => h.includes('维修率')),
      userBehaviorImpact: headers.findIndex((h: string) => h.includes('用户行为影响')),
      efficiencyDegradation: headers.findIndex((h: string) => h.includes('效率降级')),
      standbyEnergyConsumption: headers.findIndex((h: string) => h.includes('待机能耗')),
      usageLocation: headers.findIndex((h: string) => h.includes('使用地点')),
      usagePattern: headers.findIndex((h: string) => h.includes('使用模式'))
    };
    
    console.log('标题映射:', headerMap);
    
    // 验证必要的列是否存在
    if (headerMap.name === -1) {
      console.error('产品使用文件缺少必要的列：产品名称');
      message.error('产品使用文件格式错误：缺少产品名称列');
      return;
    }
    
    // 创建节点数组
    const newNodes: Node<UsageNodeData>[] = [];
    const horizontalSpacing = 250; // 节点水平间距
    const verticalSpacing = 200; // 节点垂直间距
    const itemsPerRow = 4; // 每行最多显示的节点数
    
    // 从第二行开始，每行是一个产品使用场景
    let validDataLines = 0;
    const usageNodes: Node<UsageNodeData>[] = [];
    
    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`跳过空行：${i+1}`);
        continue; // 跳过空行
      }
      
      // 尝试不同的分隔符拆分行
      let values = line.split(',').map((v: string) => v.trim());
      if (values.length <= 1) {
        values = line.split(';').map((v: string) => v.trim());
      }
      if (values.length <= 1) {
        values = line.split('\t').map((v: string) => v.trim());
      }
      
      console.log(`第${i+1}行解析到的值:`, values);
      
      // 确保有足够的列
      const minRequiredColumn = Math.max(
        headerMap.name !== -1 ? headerMap.name : 0,
        headerMap.weight !== -1 ? headerMap.weight : 0,
        headerMap.carbonFactor !== -1 ? headerMap.carbonFactor : 0
      );
      
      if (values.length <= minRequiredColumn) {
        console.warn(`跳过行 ${i+1}：列数不足，期望至少 ${minRequiredColumn+1} 列，实际 ${values.length} 列`);
        continue;
      }
      
      // 提取数据
      const productId = headerMap.id !== -1 && headerMap.id < values.length ? 
                        values[headerMap.id] : `usage-${i}`;
                      
      const productName = headerMap.name !== -1 && headerMap.name < values.length ? 
                          values[headerMap.name] : `产品 ${i}`;
      
      // 提取其他数据，使用默认值如果字段不存在
      let weight = 0;
      if (headerMap.weight !== -1 && headerMap.weight < values.length) {
        weight = parseFloat(values[headerMap.weight]);
        if (isNaN(weight)) {
          console.warn(`行 ${i+1}：重量不是有效数字，使用默认值0`);
          weight = 0;
        }
      }
      
      let carbonFactor = 0;
      if (headerMap.carbonFactor !== -1 && headerMap.carbonFactor < values.length) {
        carbonFactor = parseFloat(values[headerMap.carbonFactor]);
        if (isNaN(carbonFactor)) {
          console.warn(`行 ${i+1}：碳排放因子不是有效数字，使用默认值0`);
          carbonFactor = 0;
        }
      }
      
      // 计算碳足迹
      const carbonFootprint = weight * carbonFactor;
      
      // 提取产品使用阶段特有字段
      let lifespan = 0;
      if (headerMap.lifespan !== -1 && headerMap.lifespan < values.length) {
        lifespan = parseFloat(values[headerMap.lifespan]);
        if (isNaN(lifespan)) lifespan = 5; // 默认寿命5年
      } else {
        lifespan = 5; // 默认寿命5年
      }
      
      let energyConsumptionPerUse = 0;
      if (headerMap.energyConsumptionPerUse !== -1 && headerMap.energyConsumptionPerUse < values.length) {
        energyConsumptionPerUse = parseFloat(values[headerMap.energyConsumptionPerUse]);
        if (isNaN(energyConsumptionPerUse)) energyConsumptionPerUse = 0;
      }
      
      let waterConsumptionPerUse = 0;
      if (headerMap.waterConsumptionPerUse !== -1 && headerMap.waterConsumptionPerUse < values.length) {
        waterConsumptionPerUse = parseFloat(values[headerMap.waterConsumptionPerUse]);
        if (isNaN(waterConsumptionPerUse)) waterConsumptionPerUse = 0;
      }
      
      let consumablesUsed = '';
      if (headerMap.consumablesUsed !== -1 && headerMap.consumablesUsed < values.length) {
        consumablesUsed = values[headerMap.consumablesUsed];
      }
      
      
      let consumablesWeight = 0;
      if (headerMap.consumablesWeight !== -1 && headerMap.consumablesWeight < values.length) {
        consumablesWeight = parseFloat(values[headerMap.consumablesWeight]);
        if (isNaN(consumablesWeight)) consumablesWeight = 0;
      }
      
      let usageFrequency = 0;
      if (headerMap.usageFrequency !== -1 && headerMap.usageFrequency < values.length) {
        usageFrequency = parseFloat(values[headerMap.usageFrequency]);
        if (isNaN(usageFrequency)) usageFrequency = 365; // 默认每年使用365次（每天一次）
      } else {
        usageFrequency = 365; // 默认每年使用365次
      }
      
      validDataLines++;
      
      // 计算位置
      const col = (validDataLines - 1) % itemsPerRow;
      const row = Math.floor((validDataLines - 1) / itemsPerRow);
      
      // 创建节点ID
      const nodeId = `usage-${Date.now()}-${i}`;
      
      // 创建节点
      const node: Node<UsageNodeData> = {
        id: nodeId,
        type: 'usage',
        position: {
          x: position.x + (col - Math.floor(itemsPerRow/2)) * horizontalSpacing + (Math.random() * 40 - 20),
          y: position.y + row * verticalSpacing + (Math.random() * 20 - 10),
        },
        data: {
          label: productName,
          productName: productName,
          weight: weight,
          carbonFootprint: carbonFootprint,
          dataSource: '产品使用阶段文件',
          lifecycleStage: '产品使用',
          emissionFactor: '',
          calculationMethod: '因子法',
          uncertainty: '中',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14040',
          completionStatus: '已完成',
          carbonFactor: carbonFactor,
          uncertaintyScore: 0,
          // 产品使用阶段特有字段
          lifespan: lifespan,
          energyConsumptionPerUse: energyConsumptionPerUse,
          waterConsumptionPerUse: waterConsumptionPerUse,
          consumablesUsed: consumablesUsed,
          consumablesWeight: consumablesWeight,
          usageFrequency: usageFrequency,
          maintenanceFrequency: 2, // 默认每年维护2次
          repairRate: 5, // 默认5%的维修率
          userBehaviorImpact: 5, // 默认中等用户行为影响（1-10）
          efficiencyDegradation: 2, // 默认每年2%的效率降级
          standbyEnergyConsumption: 0, // 默认无待机能耗
          usageLocation: '室内', // 默认室内使用
          usagePattern: '日常使用' // 默认使用模式

          
        }
      };
      
      // 添加节点到临时数组
      usageNodes.push(node);
      console.log(`已创建节点: ${nodeId}, 名称: ${productName}`);
    }
    
    if (usageNodes.length === 0) {
      console.error('未从产品使用文件中提取到有效数据，有效行数：0');
      message.error('未从产品使用文件中提取到有效数据');
      return;
    }
    
    console.log(`共从产品使用文件中提取了${usageNodes.length}条有效数据`);
    
    // 添加所有产品使用节点
    usageNodes.forEach(node => newNodes.push(node));
    
    // 创建边数组连接使用节点 - 这里可以选择不创建边，因为使用阶段节点通常是独立的
    const newEdges: Edge[] = [];
    
    console.log(`创建了${usageNodes.length}个产品使用节点`);
    
    // 添加节点到画布
    setNodes(nds => {
      console.log(`添加${newNodes.length}个节点到现有的 ${nds.length} 个节点中`);
      return [...nds, ...newNodes];
    });
    
    // 添加边到画布（如果有）
    if (newEdges.length > 0) {
      setEdges(eds => {
        console.log(`添加${newEdges.length}条边`);
        return [...eds, ...newEdges];
      });
    }
    
    // 强制更新视图
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView();
      }
    }, 100);
    
    message.success(`成功从产品使用文件创建了${usageNodes.length}个使用阶段节点`);
  };

  // 处理废弃处置阶段的生命周期文件
  const processDisposalFile = (file: any, position: { x: number, y: number }) => {
    console.log('开始处理废弃处置阶段文件:', file.title);
    console.log('文件内容类型:', typeof file.content, '长度:', 
      typeof file.content === 'string' ? file.content.length : 'N/A');
    console.log('文件内容前100个字符:', typeof file.content === 'string' ? file.content.substring(0, 100) : 'N/A');
    
    // 确保文件内容是字符串类型
    if (typeof file.content !== 'string') {
      message.error('无法读取文件内容或内容格式不正确');
      return;
    }
    
    // 处理内容，尝试不同的行分隔符
    let lines = file.content.split('\n');
    if (lines.length <= 1) {
      lines = file.content.split('\r\n');
    }
    if (lines.length <= 1) {
      lines = file.content.split('\r');
    }
    
    console.log(`CSV内容共有${lines.length}行`);
    if (lines.length < 2) {
      message.error('废弃处置文件格式错误：文件内容不足');
      return;
    }
    
    // 第一行是标题，尝试不同的分隔符
    let headers = lines[0].split(',').map((h: string) => h.trim());
    
    // 如果列数太少，尝试其他分隔符
    if (headers.length <= 1) {
      headers = lines[0].split(';').map((h: string) => h.trim());
    }
    if (headers.length <= 1) {
      headers = lines[0].split('\t').map((h: string) => h.trim());
    }
    
    console.log('解析到的标题行:', headers);
    
    // 标题索引映射 - 废弃处置阶段特有的字段
    const headerMap = {
      id: headers.findIndex((h: string) => h.includes('ID') || h.includes('编号')),
      name: headers.findIndex((h: string) => h.includes('名称') || h.includes('处置方法') || h.includes('废弃物')),
      weight: headers.findIndex((h: string) => h.includes('重量')),
      carbonFactor: headers.findIndex((h: string) => h.includes('碳排放因子') || h.includes('碳因子')),
      // 废弃处置阶段特有字段
      recyclingRate: headers.findIndex((h: string) => h.includes('回收率')),
      landfillPercentage: headers.findIndex((h: string) => h.includes('填埋比例')),
      incinerationPercentage: headers.findIndex((h: string) => h.includes('焚烧比例')),
      compostPercentage: headers.findIndex((h: string) => h.includes('堆肥比例')),
      reusePercentage: headers.findIndex((h: string) => h.includes('重复使用比例')),
      hazardousWasteContent: headers.findIndex((h: string) => h.includes('有害废物含量')),
      biodegradability: headers.findIndex((h: string) => h.includes('生物降解性')),
      disposalMethod: headers.findIndex((h: string) => h.includes('处置方法')),
      endOfLifeTreatment: headers.findIndex((h: string) => h.includes('生命周期末端处理')),
      recyclingEfficiency: headers.findIndex((h: string) => h.includes('回收效率')),
      dismantlingDifficulty: headers.findIndex((h: string) => h.includes('拆卸难度')),
      transportToDisposal: headers.findIndex((h: string) => h.includes('运输距离'))
    };
    
    console.log('标题映射:', headerMap);
    
    // 验证必要的列是否存在
    if (headerMap.name === -1) {
      console.error('废弃处置文件缺少必要的列：处置方法/废弃物名称');
      message.error('废弃处置文件格式错误：缺少处置方法/废弃物名称列');
      return;
    }
    
    // 创建节点数组
    const newNodes: Node<DisposalNodeData>[] = [];
    const horizontalSpacing = 250; // 节点水平间距
    const verticalSpacing = 200; // 节点垂直间距
    const itemsPerRow = 4; // 每行最多显示的节点数
    
    // 从第二行开始，每行是一个废弃处置方式
    let validDataLines = 0;
    const disposalNodes: Node<DisposalNodeData>[] = [];
    
    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`跳过空行：${i+1}`);
        continue; // 跳过空行
      }
      
      // 尝试不同的分隔符拆分行
      let values = line.split(',').map((v: string) => v.trim());
      if (values.length <= 1) {
        values = line.split(';').map((v: string) => v.trim());
      }
      if (values.length <= 1) {
        values = line.split('\t').map((v: string) => v.trim());
      }
      
      console.log(`第${i+1}行解析到的值:`, values);
      
      // 确保有足够的列
      const minRequiredColumn = Math.max(
        headerMap.name !== -1 ? headerMap.name : 0,
        headerMap.weight !== -1 ? headerMap.weight : 0,
        headerMap.carbonFactor !== -1 ? headerMap.carbonFactor : 0
      );
      
      if (values.length <= minRequiredColumn) {
        console.warn(`跳过行 ${i+1}：列数不足，期望至少 ${minRequiredColumn+1} 列，实际 ${values.length} 列`);
        continue;
      }
      
      // 提取数据
      const disposalId = headerMap.id !== -1 && headerMap.id < values.length ? 
                        values[headerMap.id] : `disposal-${i}`;
                      
      const disposalName = headerMap.name !== -1 && headerMap.name < values.length ? 
                          values[headerMap.name] : `处置方式 ${i}`;
      
      // 提取其他数据，使用默认值如果字段不存在
      let weight = 0;
      if (headerMap.weight !== -1 && headerMap.weight < values.length) {
        weight = parseFloat(values[headerMap.weight]);
        if (isNaN(weight)) {
          console.warn(`行 ${i+1}：重量不是有效数字，使用默认值0`);
          weight = 0;
        }
      }
      
      let carbonFactor = 0;
      if (headerMap.carbonFactor !== -1 && headerMap.carbonFactor < values.length) {
        carbonFactor = parseFloat(values[headerMap.carbonFactor]);
        if (isNaN(carbonFactor)) {
          console.warn(`行 ${i+1}：碳排放因子不是有效数字，使用默认值0`);
          carbonFactor = 0;
        }
      }
      
      // 计算碳足迹
      const carbonFootprint = weight * carbonFactor;
      
      // 提取废弃处置阶段特有字段
      let recyclingRate = 0;
      if (headerMap.recyclingRate !== -1 && headerMap.recyclingRate < values.length) {
        recyclingRate = parseFloat(values[headerMap.recyclingRate]);
        if (isNaN(recyclingRate)) recyclingRate = 0;
      }
      
      let landfillPercentage = 0;
      if (headerMap.landfillPercentage !== -1 && headerMap.landfillPercentage < values.length) {
        landfillPercentage = parseFloat(values[headerMap.landfillPercentage]);
        if (isNaN(landfillPercentage)) landfillPercentage = 0;
      }
      
      let incinerationPercentage = 0;
      if (headerMap.incinerationPercentage !== -1 && headerMap.incinerationPercentage < values.length) {
        incinerationPercentage = parseFloat(values[headerMap.incinerationPercentage]);
        if (isNaN(incinerationPercentage)) incinerationPercentage = 0;
      }
      
      let disposalMethod = '';
      if (headerMap.disposalMethod !== -1 && headerMap.disposalMethod < values.length) {
        disposalMethod = values[headerMap.disposalMethod];
      } else if (recyclingRate > 50) {
        disposalMethod = '回收';
      } else if (landfillPercentage > 50) {
        disposalMethod = '填埋';
      } else if (incinerationPercentage > 50) {
        disposalMethod = '焚烧';
      } else {
        disposalMethod = '混合处理';
      }
      
      let transportToDisposal = 0;
      if (headerMap.transportToDisposal !== -1 && headerMap.transportToDisposal < values.length) {
        transportToDisposal = parseFloat(values[headerMap.transportToDisposal]);
        if (isNaN(transportToDisposal)) transportToDisposal = 0;
      }
      
      validDataLines++;
      
      // 计算位置
      const col = (validDataLines - 1) % itemsPerRow;
      const row = Math.floor((validDataLines - 1) / itemsPerRow);
      
      // 创建节点ID
      const nodeId = `disposal-${Date.now()}-${i}`;
      
      // 创建节点
      const node: Node<DisposalNodeData> = {
        id: nodeId,
        type: 'disposal',
        position: {
          x: position.x + (col - Math.floor(itemsPerRow/2)) * horizontalSpacing + (Math.random() * 40 - 20),
          y: position.y + row * verticalSpacing + (Math.random() * 20 - 10),
        },
        data: {
          label: disposalName,
          productName: disposalName,
          weight: weight,
          carbonFootprint: carbonFootprint,
          dataSource: '废弃处置阶段文件',
          lifecycleStage: '废弃处置',
          emissionFactor: '',
          calculationMethod: '因子法',
          uncertainty: '中',
          verificationStatus: '未验证',
          applicableStandard: 'ISO 14040',
          completionStatus: '已完成',
          carbonFactor: carbonFactor,
          uncertaintyScore: 0,
       
          // 废弃处置阶段特有字段
          recyclingRate: recyclingRate,
          landfillPercentage: landfillPercentage,
          incinerationPercentage: incinerationPercentage,
          compostPercentage: 0,
          reusePercentage: 0,
          hazardousWasteContent: 0,
          biodegradability: 0,
          disposalEnergyRecovery: 0,
          transportToDisposal: transportToDisposal,
          disposalMethod: disposalMethod,
          endOfLifeTreatment: '',
          recyclingEfficiency: 0,
          dismantlingDifficulty: '中'
        }
      };
      
      // 添加节点到临时数组
      disposalNodes.push(node);
      console.log(`已创建节点: ${nodeId}, 名称: ${disposalName}`);
    }
    
    if (disposalNodes.length === 0) {
      console.error('未从废弃处置文件中提取到有效数据，有效行数：0');
      message.error('未从废弃处置文件中提取到有效数据');
      return;
    }
    
    console.log(`共从废弃处置文件中提取了${disposalNodes.length}条有效数据`);
    
    // 添加所有废弃处置节点
    disposalNodes.forEach(node => newNodes.push(node));
    
    // 创建边数组连接处置节点 - 可以按照处置流程顺序连接
    const newEdges: Edge[] = [];
    
    // 如果有多个节点，创建它们之间的处置流程连接
    // if (disposalNodes.length > 1) {
    //   for (let i = 0; i < disposalNodes.length - 1; i++) {
    //     const edge: Edge = {
    //       id: `edge-${disposalNodes[i].id}-${disposalNodes[i+1].id}`,
    //       source: disposalNodes[i].id,
    //       target: disposalNodes[i+1].id,
    //       type: 'default'
    //     };

    //     // 添加边
    //     newEdges.push(edge);
    //     console.log(`创建处置流程连接: ${edge.id}, 从: ${disposalNodes[i].data.productName} 到: ${disposalNodes[i+1].data.productName}`);
    //   }
    // }
    
    console.log(`创建了${disposalNodes.length}个废弃处置节点和${newEdges.length}条连接边`);
    
    // 添加节点到画布
    setNodes(nds => {
      console.log(`添加${newNodes.length}个节点到现有的 ${nds.length} 个节点中`);
      return [...nds, ...newNodes];
    });
    
    // 添加边到画布
    setEdges(eds => {
      console.log(`添加${newEdges.length}条边`);
      return [...eds, ...newEdges];
    });
    
    // 强制更新视图
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView();
      }
    }, 100);
    
    message.success(`成功从废弃处置文件创建了${disposalNodes.length}个处置节点`);
  };

  // 添加自动布局函数
  const autoLayout = () => {
    console.log('开始自动布局，当前节点数:', nodes.length);
    
    if (!nodes.length) {
      message.warning('没有可布局的节点');
      return;
    }

    // 定义生命周期阶段的顺序
    const stageOrder = ['原材料', '生产制造', '分销和储存', '产品使用', '废弃处置'];
    
    // 找到最终产品节点（通常是最后一个节点）
    const finalProductNode = nodes.find(node => 
      node.data.lifecycleStage === '最终产品' 
    );

    if (!finalProductNode) {
      message.warning('未找到最终产品节点，请确保有一个全生命周期或产品使用阶段的节点');
      return;
    }

    console.log('找到最终产品节点:', finalProductNode);

    // 计算每个阶段的节点
    const stageNodes = stageOrder.reduce((acc, stage) => {
      acc[stage] = nodes.filter(node => node.data.lifecycleStage === stage);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('各阶段节点:', stageNodes);

    // 设置布局参数
    const verticalSpacing = 300; // 垂直间距
    const horizontalSpacing = 400; // 水平间距
    const startX = 100; // 起始X坐标
    const startY = 100; // 起始Y坐标

    // 更新节点位置
    const updatedNodes = nodes.map(node => {
      const stage = node.data.lifecycleStage;
      if (stage === '最终产品') {
        // 最终产品节点放在最右侧
        return {
          ...node,
          position: {
            x: startX + (stageOrder.length - 1) * horizontalSpacing,
            y: startY + (Object.values(stageNodes).reduce((acc, curr) => acc + curr.length, 0) / 2) * verticalSpacing
          }
        };
      }

      const stageIndex = stageOrder.indexOf(stage);
      if (stageIndex === -1) return node;

      const stageNodeIndex = stageNodes[stage].findIndex(n => n.id === node.id);
      const nodesInStage = stageNodes[stage].length;
      
      // 计算节点位置
      const x = startX + stageIndex * horizontalSpacing;
      const y = startY + stageNodeIndex * verticalSpacing;

      return {
        ...node,
        position: { x, y }
      };
    });

    console.log('更新后的节点:', updatedNodes);

    // 更新连接
    const updatedEdges: Edge[] = [];
    
    // 首先连接到最终产品节点
    stageOrder.forEach((stage, index) => {
      const currentStageNodes = stageNodes[stage];
      if (!currentStageNodes.length) return;

      // 连接到最终产品节点
      currentStageNodes.forEach(currentNode => {
        updatedEdges.push({
          id: `e${currentNode.id}-${finalProductNode.id}`,
          source: currentNode.id,
          target: finalProductNode.id,
          type: 'smoothstep',
          animated: true
        });
      });

   
    });

    console.log('更新后的连接:', updatedEdges);

    // 更新状态
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    
    // 显示成功消息
    message.success('自动布局完成！');
  };

  // 更新AI总结信息
  const updateAiSummary = useCallback(() => {
    if (!nodes || nodes.length === 0) {
      setAiSummary(prev => ({...prev, credibilityScore: 0, missingLifecycleStages: [], optimizableNode: null, manualRequiredNodes: [], uncertainAiNodes: []}));
      return;
    }
    
    // 1. 计算可信度
    let manual_finish_NodesCount = 0;
    let aiNodesCount = 0;
    let aiUncertaintySum = 0;
    let manual_need_NodesCount = 0;

    
    nodes.forEach(node => {
      if (node.data) {
        if (node.data.completionStatus === 'completed') {
          manual_finish_NodesCount++;
        } else if (node.data.completionStatus === 'ai-supplemented') {
          aiNodesCount++;
          const certainty = 1 - (node.data.uncertaintyScore || 0) / 100;
          aiUncertaintySum += certainty;
        }else if (node.data.completionStatus === 'manual-required') {
          manual_need_NodesCount++;
        }
      }
    });
    
    const totalNodes = manual_finish_NodesCount + aiNodesCount + manual_need_NodesCount;
    const credibilityScore = totalNodes > 0 ? 
    (manual_finish_NodesCount + aiUncertaintySum) / totalNodes : 0;
    
    //log credibilityScore , manualNodesCount, aiNodesCount, needManualNodesCount
    console.log('credibilityScore:', credibilityScore);
    console.log('totalNodes:', totalNodes);
    console.log('manual_finish_NodesCount:', manual_finish_NodesCount);
    console.log('aiNodesCount:', aiNodesCount);
    console.log('manual_need_NodesCount:', manual_need_NodesCount);
    console.log('aiUncertaintySum:', aiUncertaintySum);
    
    // 2. 检查生命周期缺失
    const lifecycle = ['原材料', '生产制造', '分销和储存', '产品使用', '废弃处置'];
    const existingStages = new Set(nodes.map(node => node.data?.lifecycleStage).filter(Boolean));
    const missingLifecycleStages = lifecycle.filter(stage => !existingStages.has(stage));
    
    // 3. 找出优化空间最大的节点
    let optimizableNode: {
      id: string;
      label: string;
      reason: string;
    } | null = null;
    let maxOptimizationPotential = 0;
    
    nodes.forEach(node => {
      if (!node.data) return;
      // 简单算法：数据完整性低且碳足迹高的节点优化空间大
      const uncertainty = node.data.uncertaintyScore || 0;
      const completeness = 1 - uncertainty / 100;
                          
      const carbonImpact = node.data.carbonFootprint || 0;
      const optimizationPotential = (1 - completeness) * carbonImpact;
      
      if (optimizationPotential > maxOptimizationPotential) {
        maxOptimizationPotential = optimizationPotential;
        optimizableNode = {
          id: node.id,
          label: node.data.label || node.data.productName || '未命名节点',
          reason: `完成度(${(completeness * 100).toFixed(0)}%), 碳足迹高(${carbonImpact.toFixed(2)} kgCO₂e)`
        };
      }
    });
    
    setAiSummary(prev => ({
      ...prev,
      credibilityScore,
      missingLifecycleStages,
      optimizableNode,
      manualRequiredNodes: nodes.filter(node => node.data.completionStatus === 'manual-required').map(node => ({
        id: node.id,
        label: node.data.label || node.data.productName || '未命名节点'
      })),
      uncertainAiNodes: nodes.filter(node => node.data.completionStatus === 'ai-supplemented' && node.data.uncertaintyScore > 10).map(node => ({
        id: node.id,
        label: node.data.label || node.data.productName || '未命名节点',
        uncertaintyScore: node.data.uncertaintyScore
      }))
    }));
  }, [nodes]);
  
  // 在节点变化或AI生成后更新总结
  useEffect(() => {
    updateAiSummary();
  }, [nodes, updateAiSummary]);
  
  // 切换AI总结模块展开/折叠状态
  const toggleAiSummaryExpand = () => {
    setAiSummary(prev => ({...prev, isExpanded: !prev.isExpanded}));
  };
  
  // AI总结展示组件
  const renderAiSummary = () => {
    const { credibilityScore, missingLifecycleStages, optimizableNode, manualRequiredNodes, uncertainAiNodes, isExpanded } = aiSummary;
    const credibilityScorePercent = Math.round(credibilityScore * 100);
    
    return (
      <div className={`ai-summary-module ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="ai-summary-header" onClick={toggleAiSummaryExpand}>
          <h4>AI工作流分析</h4>
          {isExpanded ? <UpOutlined /> : <DownOutlined />}
        </div>
        
        {isExpanded && (
          <div className="ai-summary-content" style={{ 
            maxHeight: '1000px', 
            overflowY: 'auto', 
            paddingRight: '5px' 
          }}>
            <div className="summary-item">
              <div className="summary-label">数据可信度:</div>
              <div 
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: credibilityScorePercent >= 90 ? '#52c41a' : 
                         credibilityScorePercent >= 60 ? '#faad14' : 
                         '#f5222d',
                  textAlign: 'center',
                  marginTop: '5px'
                }}
              >
                {credibilityScorePercent}
              </div>
            </div>
            
            <div className="summary-item">
              <div className="summary-label">生命周期完整性:</div>
              {missingLifecycleStages.length > 0 ? (
                <div className="missing-stages">
                  <Tag color="error">缺失{missingLifecycleStages.length}个阶段</Tag>
                  <div className="stage-list">
                    {missingLifecycleStages.map(stage => (
                      <Tag key={stage} color="warning">{stage}</Tag>
                    ))}
                  </div>
                </div>
              ) : (
                <Tag color="success">请先拖拉BOM到工作台中</Tag>
              )}
            </div>
            
            {optimizableNode && (
              <div className="summary-item">
                <div className="summary-label">优化建议:</div>
                <div className="optimization-target">
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => {
                      const node = nodes.find(n => n.id === optimizableNode.id);
                      if (node) {
                        setSelectedNode(node);
                        setSelectedNodeId(node.id);
                      }
                    }}
                  >
                    {optimizableNode.label}
                  </Button>
                  <div className="optimization-reason">{optimizableNode.reason}</div>
                </div>
              </div>
            )}
            {manualRequiredNodes.length > 0 && (
              <div className="summary-item">
                <div className="summary-label">需要人工介入的节点:</div>
                <div className="manual-nodes">
                  {manualRequiredNodes.map(node => (
                    <Button 
                      key={node.id}
                      type="link"
                      size="small" 
                      onClick={() => {
                        const nodeObj = nodes.find(n => n.id === node.id);
                        if (nodeObj) {
                          setSelectedNode(nodeObj);
                          setSelectedNodeId(nodeObj.id);
                        }
                      }}
                      style={{ margin: '2px', padding: '0 8px' }}
                    >
                      <Tag color="error">{node.label}</Tag>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {uncertainAiNodes.length > 0 && (
              <div className="summary-item">
                <div className="summary-label">AI不确定的节点:</div>
                <div className="uncertain-nodes">
                  {uncertainAiNodes.map(node => (
                    <Button
                      key={node.id}
                      type="link"
                      size="small"
                      onClick={() => {
                        const nodeObj = nodes.find(n => n.id === node.id);
                        if (nodeObj) {
                          setSelectedNode(nodeObj);
                          setSelectedNodeId(nodeObj.id);
                        }
                      }}
                      style={{ margin: '2px', padding: '0 8px' }}
                    >
                      <Tag color="warning">
                        {node.label} (不确定性: {Math.round((node.uncertaintyScore))}%)
                      </Tag>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 组件返回的JSX结构
  return (
    <Layout className="editor-layout">
      <Header className="editor-header">
        <div className="header-left">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={goToDashboard}
          >
            返回
          </Button>
          <div className="workflow-title">
          <Input 
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            bordered={false}
              className="title-input"
          />
          </div>
        </div>
        <div className="header-right">
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={autoLayout}
            style={{ marginLeft: '8px' }}
          >
            自动布局
          </Button>

          <Button 
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleAutoAIGenerate}
            style={{ marginRight: '8px' }}
          >
            AI一键生成
          </Button>

          <Button 
            icon={<ExportOutlined />}
            onClick={calculateCarbonFootprint}
          >
            计算碳足迹
          </Button>

          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={saveWorkflow}
            style={{ marginRight: '8px' }}
          >
            保存
          </Button>

          <Button 
            type="primary" 
            icon={<BarChartOutlined />} 
            onClick={handleGenerateReport}
            loading={reportGenerating}
          >
            生成报告
          </Button>
        </div>
      </Header>
      <Layout className="main-content">
        <Sider
          width={siderWidth}
          className="editor-sider"
          theme="light"
        >
          <div className="file-browser">
            <div className="file-browser-header">
              <h3>文件管理</h3>
              <Upload
                accept=".csv,.xlsx,.xls"
                showUploadList={false}
                customRequest={({ file }) => handleTopUpload(file as File)}
                beforeUpload={(file) => {
                  const fileName = file.name.toLowerCase();
                  if (!fileName.endsWith('.csv') && 
                      !fileName.endsWith('.xlsx') && 
                      !fileName.endsWith('.xls')) {
                    message.error('仅支持CSV和Excel文件上传');
                    return Upload.LIST_IGNORE;
                  }
                  return true;
                }}
              >
            
              </Upload>
                    </div>
            <DirectoryTree
              showIcon
              defaultExpandAll
              onSelect={onSelectFile}
              treeData={treeData}
              draggable
              blockNode
              onDragStart={(info) => onDragStart(info, {} as React.DragEvent<HTMLDivElement>)}
              onDragEnd={(info) => handleDragEnd({} as React.DragEvent<HTMLDivElement>)}
              onRightClick={onFileTreeRightClick}
            />
            <div className="file-tree-info">
              <p>支持导入的BOM表格式：CSV、Excel</p>
              <p>拖拽BOM文件到产品节点可关联物料清单</p>
              <p>上传的BOM文件将添加到文件列表中</p>
              </div>
          </div>
          <div 
            className="resizer" 
            onMouseDown={handleResizeStart}
          ></div>
        </Sider>
        
        {/* 添加AI总结模块到面板右侧 */}
        <div className="ai-summary-floating-container">
          {renderAiSummary()}
        </div>
        
        <Content 
          className="editor-content"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
          style={{ 
            position: 'relative',
            backgroundColor: isDraggingOver ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
            transition: 'background-color 0.3s'
          }}
        >
          {isDraggingOver && (
            <div className="drop-message">
              拖放BOM文件到此处创建节点
            </div>
          )}
          <div
            className="reactflow-wrapper"
            ref={reactFlowWrapper}
            style={{ 
              height: '100%'
            }}
          >
          {isLoading ? (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              background: '#f0f2f5'
            }}>
              <Spin size="large" tip="加载工作流数据中..." />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2}
              attributionPosition="bottom-left"
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode="Shift"
              onSelectionChange={({ nodes }) => {
                console.log('选中节点数量:', nodes.length);
                setSelectedNodes(nodes);
              }}
              onNodeClick={(evt, node) => {
                // 如果按住Shift键，不触发单节点选择逻辑，保留多选状态
                if (evt.shiftKey) {
                  console.log('按住Shift键点击节点，保留多选状态');
                  evt.preventDefault();
                  return;
                }
                handleNodeClick(evt, node);
              }}
              onNodeDragStop={(evt, node) => {
                // 在拖动停止时更新节点位置
                console.log(`节点 ${node.id} 拖动到新位置:`, node.position);
              }}
              onPaneClick={() => {
                onPaneClick();
              }}
              onContextMenu={(event) => onContextMenu(event)}
            >
              <Background color="#aaa" gap={16} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
          </div>
          {menuVisible && (
            <div 
              style={{ 
                position: 'fixed', // 改为fixed以相对于视口定位
                left: menuPosition.x + 'px', 
                top: menuPosition.y + 'px',
                zIndex: 1000 
              }}
              onClick={(e) => e.stopPropagation()} // 阻止点击事件冒泡，避免菜单立即消失
            >
              {rightClickMenu}
            </div>
          )}
        </Content>
        {rightSiderVisible && selectedNode && (
          <Sider 
            width={350} 
            className="properties-sider"
            theme="light"
          >
            <div className="properties-header">
              <h3>节点属性</h3>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => deleteSelectedNodes()}
                size="small"
              />
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={closePropertiesPanel}
                className="close-panel-btn"
                size="small"
              />
            </div>
            <div className="properties-content">
              <Form layout="vertical">
                <h4 className="section-title">基本属性</h4>
                <Form.Item label="产品名称">
                  <Input 
                    value={selectedNode?.data.productName}
                    onChange={(e) => {
                      console.log('产品名称修改:', e.target.value);
                      updateNodeData('productName', e.target.value);
                    }}
                    onBlur={() => console.log('产品名称输入完成，当前值:', selectedNode?.data.productName)}
                    placeholder="请输入产品名称"
                    style={{ 
                      width: '100%',
                      borderColor: '#1890ff',
                      boxShadow: '0 0 0 2px rgba(24,144,255,0.2)'
                    }}
                    autoComplete="off"
                    autoFocus={false}
                  />
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    提示：直接输入即可修改产品名称
                </div>
                </Form.Item>
                <Form.Item label="重量 (kg)">
                  <InputNumber
                    value={selectedNode?.data.weight}
                        style={{ width: '100%' }}
                    min={0}
                        onChange={(value) => {
                      updateNodeData('weight', value);
                      updateNodeCarbonFootprint(selectedNode.id);
                    }}
                  />
                </Form.Item>
                <Form.Item 
                  label="碳排放量 (kgCO2e)" 
                  tooltip="此值由重量和碳排放因子自动计算得出，不可手动修改"
                >
                  <InputNumber
                    value={selectedNode?.data.carbonFootprint}
                    style={{ width: '100%' }}
                    precision={2}
                    min={0}
                    disabled={true}
                    readOnly={true}
                    className="readonly-input"
                  />
                  <div className="calculation-formula">
                    计算公式: 重量 × 碳排放因子 = 碳排放量
                  </div>
                </Form.Item>
                <Form.Item label="碳排放因子 (kgCO2e/kg)">
                  <InputNumber
                    value={selectedNode?.data.carbonFactor}
                    style={{ width: '100%' }}
                    precision={2}
                    min={0}
                    onChange={(value) => {
                      updateNodeData('carbonFactor', value);
                      updateNodeCarbonFootprint(selectedNode.id);
                    }}
                  />
                </Form.Item>
                <Form.Item label="生命周期阶段">
                  <Select
                    value={selectedNode?.data.lifecycleStage}
                    style={{ width: '100%' }}
                    onChange={(value) => updateNodeData('lifecycleStage', value)}
                  >
                    <Option value="原材料">原材料</Option>
                    <Option value="生产制造">生产制造</Option>
                    <Option value="分销和储存">分销和储存</Option>
                    <Option value="产品使用">产品使用</Option>
                    <Option value="废弃处置">废弃处置</Option>
                    <Option value="最终产品">最终产品</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="数据来源">
                  <Select
                    value={selectedNode?.data.dataSource}
                    style={{ width: '100%' }}
                    onChange={(value) => updateNodeData('dataSource', value)}
                  >
                    <Option value="手动输入">手动输入</Option>
                    <Option value="BOM">BOM数据</Option>
                    <Option value="累加计算">累加计算 (最终产品)</Option>
                  
                    <OptGroup label="数据库匹配">
                      <Option value="数据库匹配 - 原材料库">数据库匹配 - 原材料库</Option>
                      <Option value="数据库匹配 - 生产工艺库">数据库匹配 - 生产工艺库</Option>
                      <Option value="数据库匹配 - 分销库">数据库匹配 - 分销库</Option>
                      <Option value="数据库匹配 - 使用阶段库">数据库匹配 - 使用阶段库</Option>
                      <Option value="数据库匹配 - 处置库">数据库匹配 - 处置库</Option>
                    </OptGroup>
                    <OptGroup label="AI生成">
                      <Option value="AI生成 - DeepSeek查询">AI生成 - DeepSeek查询</Option>
                      <Option value="AI生成 - DeepSeek (专家估算)">AI生成 - DeepSeek (专家估算)</Option>
                      <Option value="AI生成 - DeepSeek (文本提取)">AI生成 - DeepSeek (文本提取)</Option>
                      <Option value="AI生成 - DeepSeek (行业报告)">AI生成 - DeepSeek (行业报告)</Option>
                      <Option value="AI生成 - DeepSeek (学术文献)">AI生成 - DeepSeek (学术文献)</Option>
                      <Option value="AI生成 - DeepSeek (政府数据)">AI生成 - DeepSeek (政府数据)</Option>
                    </OptGroup>

                  </Select>
                </Form.Item>
                <Form.Item label="不确定性类型">
                  <Select
                    value={selectedNode?.data.uncertainty}
                    style={{ width: '100%' }}
                    disabled={true}
                    className="readonly-input"
                  >
                    <Option value="低">低 (10%以内)</Option>
                    <Option value="中">中 (10-40%)</Option>
                    <Option value="高">高 (40%以上)</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="不确定性分数">
                  <InputNumber
                    value={selectedNode?.data.uncertaintyScore}
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    disabled={true}
                    readOnly={true}
                    className="readonly-input"
                  />
                </Form.Item>
                
                <Form.Item label="完成状态">
                  <Select
                    value={selectedNode?.data.completionStatus}
                    style={{ width: '100%' }}
                    onChange={(value) => updateNodeData('completionStatus', value)}
                  >
                    <Option value="completed">已完成</Option>
                    <Option value="ai-supplemented">AI补充</Option>
                    <Option value="manual-required">需要人工介入</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="验证状态">
                  <Select
                    value={selectedNode?.data.verificationStatus}
                    style={{ width: '100%' }}
                    onChange={(value) => updateNodeData('verificationStatus', value)}
                  >
                    <Option value="未验证">未验证</Option>
                    <Option value="内部验证">内部验证</Option>
                    <Option value="第三方验证">第三方验证</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="适用标准">
                  <Select
                    value={selectedNode?.data.applicableStandard}
                    style={{ width: '100%' }}
                    onChange={(value) => updateNodeData('applicableStandard', value)}
                  >
                    <Option value="ISO 14040">ISO 14040</Option>
                    <Option value="PAS 2050">PAS 2050</Option>
                    <Option value="GHG Protocol">GHG Protocol</Option>
                    <Option value="ISO 14067">ISO 14067</Option>
                  </Select>
                </Form.Item>
                
                {/* 渲染特定生命周期阶段的属性 */}
                {renderLifecycleSpecificProperties()}
              </Form>
                    </div>
          </Sider>
        )}
      </Layout>
      
      {/* AI辅助分析对话框 */}
      <Modal
        title="AI辅助分析"
        open={aiModalVisible}
        onCancel={() => setAiModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAiModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={submitAiRequest}>
            提交
          </Button>
        ]}
        width={700}
      >
        <div className="ai-modal-content">
          <Form layout="vertical">
            <Form.Item label="请描述您需要AI帮助分析的问题">
              <Input.TextArea
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：'分析这个产品的碳足迹热点区域'"
              />
            </Form.Item>
          </Form>
          {aiResponse && (
            <div className="ai-response">
              <h4>AI分析结果：</h4>
              <div className="response-content">{aiResponse}</div>
                      </div>
                    )}
        </div>
      </Modal>
      
      {/* 文件右键菜单 */}
      {fileMenuVisible && (
        <div 
          style={{ 
            position: 'fixed',
            left: fileMenuPosition.x + 'px', 
            top: fileMenuPosition.y + 'px',
            zIndex: 1000 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {fileRightClickMenu}
        </div>
      )}
      
      {/* BOM AI规范化对话框 */}
      <Modal
        title="BOM文件AI规范化处理"
        open={bomAiModalVisible}
        onCancel={() => setBomAiModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBomAiModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="standardize" 
            type="primary" 
            loading={bomAiProcessing}
            onClick={handleBomAiStandardize}
            disabled={!!standardizedBomContent || bomAiProcessing}
          >
            开始AI规范化
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            disabled={!standardizedBomContent || bomAiProcessing}
            onClick={saveStandardizedBom}
          >
            保存规范化BOM
          </Button>
        ]}
        width={800}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4>原始BOM文件内容</h4>
            {originalBomContent ? (
              <div className="bom-table-container" style={{ overflowX: 'auto', maxHeight: '300px' }}>
                <Table 
                  dataSource={parseCSVToTableData(originalBomContent)}
                  columns={generateColumnsFromCSV(originalBomContent)}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </div>
            ) : (
              <Empty description="暂无BOM数据" />
            )}
              </div>
          {bomAiProcessing ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin tip="AI正在处理中...">
                <div style={{ padding: '30px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }}></div>
              </Spin>
            </div>
          ) : (
            standardizedBomContent && (
              <div>
                <h4>规范化后的BOM文件内容</h4>
                <div className="bom-table-container" style={{ overflowX: 'auto', maxHeight: '300px' }}>
                  <Table 
                    dataSource={parseCSVToTableData(standardizedBomContent)}
                    columns={generateColumnsFromCSV(standardizedBomContent)}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 'max-content' }}
                  />
                </div>
                <div style={{ marginTop: '10px', color: '#389e0d' }}>
                  <CheckCircleOutlined /> BOM数据已规范化为标准格式，可以点击"保存规范化BOM"生成新文件
                </div>
              </div>
            )
            )}
          </div>
      </Modal>
      
      {/* 生命周期文件标准化弹窗 */}
      <Modal
        title={`${getStageName(lifecycleStage)}阶段文件标准化`}
        open={lifecycleFileModalVisible}
        width={1200}
        style={{ top: 20 }}
        onCancel={() => setLifecycleFileModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setLifecycleFileModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="process" 
            type="primary" 
            loading={lifecycleAiProcessing}
            onClick={handleLifecycleFileStandardize}
            disabled={!originalLifecycleContent}
          >
            <ExperimentOutlined /> 开始AI标准化处理
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            disabled={!standardizedLifecycleContent} 
            onClick={saveStandardizedLifecycleFile}
          >
            <SaveOutlined /> 保存标准化文件
          </Button>
        ]}
      >
        <div className="bom-comparison">
          <div className="bom-original">
            <h3>原始文件内容</h3>
            {originalLifecycleContent ? (
              <div className="bom-table-container" style={{ overflowX: 'auto', maxHeight: '300px' }}>
                <Table 
                  dataSource={parseCSVToTableData(originalLifecycleContent)}
                  columns={generateColumnsFromCSV(originalLifecycleContent)}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </div>
            ) : (
              <Empty description="暂无文件数据" />
            )}
          </div>
          <div className="bom-processed">
            <h3>标准化后内容</h3>
            {lifecycleAiProcessing ? (
              <div className="loading-spinner">
                <Spin size="large" tip="AI正在处理中，请耐心等待..." />
              </div>
            ) : (
              standardizedLifecycleContent ? (
                <div className="bom-table-container" style={{ overflowX: 'auto', maxHeight: '300px' }}>
                  <Table 
                    dataSource={parseCSVToTableData(standardizedLifecycleContent)}
                    columns={generateColumnsFromCSV(standardizedLifecycleContent)}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ) : (
                <Empty description="点击「开始AI标准化处理」按钮进行标准化" />
              )
            )}
          </div>
        </div>
        <div className="bom-process-info">
          <p>提示：标准化处理可能需要1-2分钟，取决于文件大小和服务器负载。</p>
          <p>AI会将原始数据转换为标准格式，方便后续分析和计算。</p>
          <p>建议在上传前尽量清理和整理数据，以获得更好的标准化效果。</p>
        </div>
      </Modal>
      
      {/* 供应商任务分发Modal */}
      <Modal
        title="分发供应商填写任务"
        open={vendorModalVisible}
        onOk={handleVendorTaskConfirm}
        onCancel={handleVendorModalCancel}
        okText="确认分发"
        cancelText="取消"
      >
          <div>
          <p>您将为 <strong>{selectedNode?.data?.productName || selectedNode?.data?.label || '未命名产品'}</strong> 创建供应商填写任务。</p>
          
          <Form.Item label="供应商:" style={{ marginBottom: '15px' }}>
            <Input
              value={editedVendorName}
              onChange={(e) => {
                console.log('供应商名称修改:', e.target.value);
                setEditedVendorName(e.target.value);
              }}
              placeholder="请输入供应商名称"
            />
          </Form.Item>
          
          {!editedVendorName.trim() && (
            <Alert
              type="warning"
              message="请输入供应商名称，否则无法创建任务。"
              style={{ marginBottom: '15px' }}
            />
          )}
          
          <p style={{ marginTop: '15px' }}>请填写任务说明：</p>
          
          <Input.TextArea 
            rows={4} 
            style={{ marginTop: '10px' }} 
            placeholder="请填写您希望供应商提供的信息"
            value={vendorTaskDescription}
            onChange={(e) => {
              console.log('TextArea onChange被触发，新值:', e.target.value);
              setVendorTaskDescription(e.target.value);
            }}
          />
          <p style={{ marginTop: '15px' }}>请选择截止日期：</p>
          <DatePicker 
            style={{ width: '100%', marginTop: '10px' }} 
            onChange={(date) => setVendorTaskDeadline(date)}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default WorkflowEditor; 
  
// 将CSV文本解析为表格数据
const parseCSVToTableData = (csvText: string) => {
  try {
    // 分割为行
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // 分割标题行以获取列数
    const header = lines[0].split(',');
    const columnCount = header.length;
    
    // 创建数据行
    return lines.slice(1).map((line, index) => {
      const values = line.split(',');
      // 确保每行都有正确数量的列
      const rowData: any = { key: index.toString() };
      
      // 处理每一列
      for (let i = 0; i < columnCount; i++) {
        const columnKey = `col${i}`;
        rowData[columnKey] = i < values.length ? values[i] : '';
      }
      
      return rowData;
    });
  } catch (error) {
    console.error('解析CSV数据时出错:', error);
    return [];
  }
};

// 从CSV生成表格列配置
const generateColumnsFromCSV = (csvText: string) => {
  try {
    // 分割为行并获取标题行
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // 分割标题行
    const headers = lines[0].split(',');
    
    // 创建列配置
    return headers.map((header, index) => ({
      title: header || `列 ${index + 1}`,
      dataIndex: `col${index}`,
      key: `col${index}`,
      width: Math.max(100, header.length * 15), // 根据标题长度设置宽度
      ellipsis: true,
      render: (text: any) => (
        <div style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          maxWidth: '200px'
        }}>
          {text || ''}
        </div>
      )
    }));
  } catch (error) {
    console.error('生成表格列时出错:', error);
    return [];
  }
};
