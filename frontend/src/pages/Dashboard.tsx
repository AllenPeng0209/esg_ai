import {
  BulbOutlined,
  CloudOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  PlusOutlined,
  RiseOutlined,
  SearchOutlined,
  SettingOutlined,
  ToolOutlined,
  BellOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Layout,
  List,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Spin,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography,
  notification,
  Tooltip,
} from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productApi, workflowApi } from "../services/api"; // vendorTaskApi 临时禁用
import { ensureUUID } from "../utils/uuid";

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Workflow {
  id: string;
  name: string;
  description: string;
  total_carbon_footprint: number;
  created_at: string;
  industry_type?: string;
}

interface Product {
  id: number;
  name: string;
  product_type: string;
  carbon_footprint: number;
}

interface BOMFile {
  id: number;
  title: string;
  file_type: string;
  created_at: string;
}

interface IndustryTemplate {
  id: number;
  name: string;
  industry: string;
  description: string;
  carbon_reduction_potential: number;
}

interface VendorTask {
  id: number;
  product_id: string;
  product_name: string;
  vendor: string;
  description: string;
  deadline: string;
  workflow_id: string;
  status: "pending" | "completed" | "overdue";
  created_at: string;
}

// 行业类型列表
const industries = ["电子制造", "纺织业", "汽车制造", "食品加工", "化工"];

// 模拟行业模板数据
const industryTemplates: IndustryTemplate[] = [
  {
    id: 1,
    name: "电子产品标准流程",
    industry: "电子制造",
    description:
      "适合消费电子产品的碳足迹分析流程，包含元器件生产、组装和运输环节",
    carbon_reduction_potential: 15.8,
  },
  {
    id: 2,
    name: "纺织品生产流程",
    industry: "纺织业",
    description: "针对纺织品生产的碳足迹分析，包含原料种植、加工、染色和物流",
    carbon_reduction_potential: 23.5,
  },
  {
    id: 3,
    name: "汽车零部件分析",
    industry: "汽车制造",
    description: "适用于汽车零部件生产的碳足迹计算，含材料获取、成型和组装",
    carbon_reduction_potential: 18.2,
  },
  {
    id: 4,
    name: "食品加工标准",
    industry: "食品加工",
    description: "食品加工行业的碳足迹核算流程，包含原料种植、加工和包装",
    carbon_reduction_potential: 27.6,
  },
  {
    id: 5,
    name: "化工产品分析",
    industry: "化工",
    description: "化工产品生产的碳足迹评估，含原料获取、反应过程和废弃物处理",
    carbon_reduction_potential: 21.3,
  },
];

// 生成模拟供应商任务数据的辅助函数
const generateMockVendorTasks = (workflows: Workflow[]): VendorTask[] => {
  const vendors = ["富士康", "和硕", "广达", "仁宝", "纬创"];
  const statuses: Array<VendorTask["status"]> = [
    "pending",
    "completed",
    "overdue",
  ];

  return workflows.flatMap((workflow) => {
    const tasksCount = Math.floor(Math.random() * 3) + 1; // 1-3个任务
    return Array.from({ length: tasksCount }, (_, index) => ({
      id: index + 1,
      workflow_id: workflow.id,
      product_id: `P${index + 1}`,
      product_name: `${workflow.name}的组件${index + 1}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      description: `为${workflow.name}提供组件${index + 1}的碳足迹数据`,
      deadline: new Date(
        Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date().toISOString(),
    }));
  });
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
    null,
  );
  const [vendorTasks, setVendorTasks] = useState<VendorTask[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);

  // Simplify navigation without UUID validation
  const navigateToWorkflow = (id: string, route: "workflow" | "report") => {
    const formattedId = ensureUUID(id);
    if (!formattedId) {
      message.error("无效的工作流ID格式");
      return;
    }
    navigate(`/${route}/${formattedId}`);
  };

  // 添加刷新数据的函数
  const refreshData = async () => {
    try {
      console.log("开始刷新 Dashboard 数据");
      setLoading(true);

      const [workflowsRes, productsRes] = await Promise.all([
        workflowApi.getWorkflows(),
        productApi.getProducts(),
      ]);

      console.log("收到工作流数据:", workflowsRes.data);
      console.log("收到产品数据:", productsRes.data);

      // 工作流数据中的 ID 已经在 API 层被处理为正确的 UUID 格式
      const workflowsWithIndustry = workflowsRes.data.map((workflow: any) => ({
        ...workflow,
        industry_type:
          workflow.industry_type ||
          industries[Math.floor(Math.random() * industries.length)],
      }));

      setWorkflows(workflowsWithIndustry);
      setProducts(productsRes.data);

      // 模拟供应商任务数据
      const mockVendorTasks = generateMockVendorTasks(workflowsWithIndustry);
      setVendorTasks(mockVendorTasks);
      setPendingTasksCount(
        mockVendorTasks.filter((task: VendorTask) => task.status === "pending")
          .length,
      );
    } catch (error) {
      console.error("刷新数据失败:", error);
      message.error("获取数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 修改 useEffect，使用 refreshData 函数
  useEffect(() => {
    refreshData();
  }, []);

  // 添加 focus 事件监听器，当页面重新获得焦点时刷新数据
  useEffect(() => {
    const handleFocus = () => {
      console.log("页面重新获得焦点，刷新数据");
      refreshData();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    message.success("已成功退出登录");
  };

  // 根据搜索和筛选条件过滤工作流
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      searchQuery === "" ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIndustry =
      industryFilter === "all" || workflow.industry_type === industryFilter;

    return matchesSearch && matchesIndustry;
  });

  // 渲染不同的内容区域
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "20px" }}>加载数据中...</div>
        </div>
      );
    }

    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "workbench":
        return renderWorkbench();
      case "settings":
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  // 仪表板内容
  const renderDashboard = () => {
    // 计算平均碳足迹
    const avgCarbonFootprint =
      products.length > 0
        ? products.reduce((sum, product) => sum + product.carbon_footprint, 0) /
          products.length
        : 0;

    // 计算碳减排潜力（模拟数据）
    const carbonReductionPotential = avgCarbonFootprint * 0.25;

    return (
      <>
        <Title level={2}>企业碳足迹仪表板</Title>

        <Card
          className="company-profile"
          style={{ marginBottom: "24px", backgroundColor: "#f8f9fa" }}
        >
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Avatar size={80} style={{ backgroundColor: "#87d068" }}>
                ESG
              </Avatar>
            </Col>
            <Col span={20}>
              <Title level={4}>绿色科技有限公司</Title>
              <Paragraph>
                <Tag color="green">ISO 14064 认证</Tag>
                <Tag color="blue">碳中和路径规划</Tag>
                <Tag color="orange">ESG 披露就绪</Tag>
              </Paragraph>
              <Paragraph>
                致力于可持续发展的高科技企业，专注于降低产品生命周期碳足迹，实现2030碳中和目标。
              </Paragraph>
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="产品总数"
                value={products.length}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="工作流总数"
                value={workflows.length}
                prefix={<DashboardOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均碳足迹 (kgCO2e)"
                value={avgCarbonFootprint.toFixed(2)}
                precision={2}
                prefix={<CloudOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="碳足迹趋势分析" style={{ marginBottom: "24px" }}>
              <div
                style={{
                  height: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                }}
              >
                <Text type="secondary">此处将显示碳足迹趋势图表</Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="行业对标分析" style={{ marginBottom: "24px" }}>
              <div
                style={{
                  height: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                }}
              >
                <Text type="secondary">此处将显示与行业平均水平对比图表</Text>
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="碳足迹热点分析">
          <Tabs defaultActiveKey="1">
            <TabPane tab="生命周期阶段" key="1">
              <div
                style={{
                  height: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                }}
              >
                <Text type="secondary">
                  此处将显示各生命周期阶段碳足迹占比图表
                </Text>
              </div>
            </TabPane>
            <TabPane tab="材料组成" key="2">
              <div
                style={{
                  height: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                }}
              >
                <Text type="secondary">此处将显示各材料碳足迹贡献图表</Text>
              </div>
            </TabPane>
            <TabPane tab="改进建议" key="3">
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: "优化供应链物流",
                    description: "通过整合运输路线，可减少碳排放约12%",
                    impact: "high",
                  },
                  {
                    title: "更换低碳原材料",
                    description: "使用回收塑料替代原生塑料，可减少碳排放约18%",
                    impact: "high",
                  },
                  {
                    title: "提升能源效率",
                    description: "工厂设备能效提升可减少生产阶段碳排放约15%",
                    impact: "medium",
                  },
                  {
                    title: "包装减量化",
                    description:
                      "优化产品包装设计，减少材料使用可降低2-5%碳足迹",
                    impact: "low",
                  },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <BulbOutlined
                          style={{ fontSize: "24px", color: "#1890ff" }}
                        />
                      }
                      title={
                        <span>
                          {item.title}{" "}
                          <Badge
                            color={
                              item.impact === "high"
                                ? "red"
                                : item.impact === "medium"
                                  ? "orange"
                                  : "green"
                            }
                            text={
                              item.impact === "high"
                                ? "高影响"
                                : item.impact === "medium"
                                  ? "中等影响"
                                  : "低影响"
                            }
                          />
                        </span>
                      }
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* 暂时隐藏供应商任务部分，因为后端API未实现 */}
        {/* {vendorTasks.length > 0 && (
          <Card title="供应商任务列表" extra={<Button type="primary" onClick={refreshData}>刷新</Button>} style={{ marginBottom: '24px' }}>
            <List
              itemLayout="horizontal"
              dataSource={vendorTasks}
              renderItem={(task: VendorTask) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      onClick={() => navigate(`/vendor-task/${task.id}`)}
                    >
                      {task.status === 'pending' ? '填写资料' : '查看详情'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor:
                        task.status === 'pending' ? '#1890ff' :
                        task.status === 'completed' ? '#52c41a' :
                        '#ff4d4f'
                      }}>
                        {task.vendor.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <span>
                        {task.product_name}
                        <Tag color={
                          task.status === 'pending' ? 'blue' :
                          task.status === 'completed' ? 'green' :
                          'red'
                        } style={{ marginLeft: '10px' }}>
                          {task.status === 'pending' ? '待处理' :
                           task.status === 'completed' ? '已完成' :
                           '已逾期'}
                        </Tag>
                      </span>
                    }
                    description={
                      <>
                        <div>{task.description}</div>
                        <div style={{ marginTop: '5px' }}>
                          <CalendarOutlined /> 截止日期: {task.deadline}
                        </div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )} */}
      </>
    );
  };

  // 工作台内容
  const renderWorkbench = () => {
    return (
      <>
        <Title level={2}>碳足迹工作台</Title>

        <Card
          title="我的产品碳足迹工作流"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/workflow/new")}
            >
              创建新工作流
            </Button>
          }
        >
          <div style={{ marginBottom: "16px" }}>
            <Row gutter={16}>
              <Col span={16}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="搜索工作流"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                />
              </Col>
              <Col span={8}>
                <Select
                  style={{ width: "100%" }}
                  placeholder="按行业筛选"
                  onChange={(value) => setIndustryFilter(value)}
                  defaultValue="all"
                >
                  <Select.Option value="all">全部行业</Select.Option>
                  <Select.Option value="电子制造">电子制造</Select.Option>
                  <Select.Option value="纺织业">纺织业</Select.Option>
                  <Select.Option value="汽车制造">汽车制造</Select.Option>
                  <Select.Option value="食品加工">食品加工</Select.Option>
                  <Select.Option value="化工">化工</Select.Option>
                </Select>
              </Col>
            </Row>
          </div>

          <List
            dataSource={filteredWorkflows}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Button
                    type="link"
                    onClick={() => navigateToWorkflow(item.id, "workflow")}
                  >
                    编辑
                  </Button>,
                  <Button
                    type="link"
                    onClick={() => navigateToWorkflow(item.id, "report")}
                  >
                    查看报告
                  </Button>,
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => showDeleteModal(item)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <EnvironmentOutlined
                      style={{ fontSize: "24px", color: "#1890ff" }}
                    />
                  }
                  title={
                    <>
                      {item.name}
                      {item.industry_type && (
                        <Tag color="blue" style={{ marginLeft: "8px" }}>
                          {item.industry_type}
                        </Tag>
                      )}
                    </>
                  }
                  description={
                    <>
                      <Text type="secondary">{item.description}</Text>
                      <br />
                      <Text type="secondary">
                        碳足迹: {item.total_carbon_footprint.toFixed(2)} kg CO₂e
                      </Text>
                      <Text type="secondary" style={{ marginLeft: "16px" }}>
                        创建时间:{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: "暂无工作流数据" }}
            pagination={{
              onChange: (page) => {
                console.log(page);
              },
              pageSize: 5,
            }}
          />
        </Card>

        <Divider />

        <Card title="行业碳足迹分析模板">
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
            dataSource={industryTemplates}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  title={item.name}
                  extra={<Tag color="green">{item.industry}</Tag>}
                >
                  <Paragraph>{item.description}</Paragraph>
                  <Statistic
                    title="减排潜力"
                    value={item.carbon_reduction_potential}
                    suffix="%"
                    valueStyle={{ color: "#3f8600" }}
                  />
                  <div style={{ marginTop: "16px" }}>
                    <Button
                      type="primary"
                      block
                      onClick={() => {
                        message.success(
                          `已选择 ${item.name} 模板，正在创建工作流...`,
                        );
                        setTimeout(() => navigate("/workflow/new"), 500);
                      }}
                    >
                      使用此模板
                    </Button>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      </>
    );
  };

  // 设置内容
  const renderSettings = () => {
    return (
      <>
        <Title level={2}>用户与系统设置</Title>

        <Tabs defaultActiveKey="1">
          <TabPane tab="个人资料" key="1">
            <Card>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: "center" }}>
                    <Avatar size={100} style={{ backgroundColor: "#1890ff" }}>
                      用户
                    </Avatar>
                    <div style={{ marginTop: "16px" }}>
                      <Button type="default">更换头像</Button>
                    </div>
                  </div>
                </Col>
                <Col span={18}>
                  <Form
                    layout="vertical"
                    initialValues={{
                      email: "user@example.com",
                      username: "张三",
                      company: "绿色科技有限公司",
                      role: "可持续发展经理",
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="用户名" name="username">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="电子邮箱" name="email">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="公司名称" name="company">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="职位" name="role">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item>
                      <Button type="primary">保存更改</Button>
                    </Form.Item>
                  </Form>
                </Col>
              </Row>
            </Card>
          </TabPane>

          <TabPane tab="密码安全" key="2">
            <Card>
              <Form layout="vertical">
                <Form.Item label="当前密码" name="currentPassword">
                  <Input.Password />
                </Form.Item>
                <Form.Item label="新密码" name="newPassword">
                  <Input.Password />
                </Form.Item>
                <Form.Item label="确认新密码" name="confirmPassword">
                  <Input.Password />
                </Form.Item>
                <Form.Item>
                  <Button type="primary">更新密码</Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab="通知设置" key="3">
            <Card>
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: "产品碳足迹提醒",
                    description: "当产品碳足迹超过行业平均值时发出提醒",
                    checked: true,
                  },
                  {
                    title: "报告生成通知",
                    description: "当新的碳足迹报告生成完成时通知",
                    checked: true,
                  },
                  {
                    title: "系统更新",
                    description: "接收有关系统功能更新的通知",
                    checked: false,
                  },
                  {
                    title: "数据导出完成",
                    description: "当数据导出任务完成时发送通知",
                    checked: true,
                  },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[<Switch defaultChecked={item.checked} />]}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>

          <TabPane tab="数据与导出" key="4">
            <Card>
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="数据导出" bordered={false}>
                    <Text>
                      导出企业碳足迹数据和分析报告，用于外部报告或进一步分析。
                    </Text>
                    <div style={{ marginTop: "16px" }}>
                      <Select
                        defaultValue="all"
                        style={{ width: 200, marginRight: "16px" }}
                      >
                        <Select.Option value="all">全部数据</Select.Option>
                        <Select.Option value="products">
                          仅产品数据
                        </Select.Option>
                        <Select.Option value="workflows">
                          仅工作流数据
                        </Select.Option>
                        <Select.Option value="reports">
                          仅报告数据
                        </Select.Option>
                      </Select>
                      <Button type="primary">导出数据</Button>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="数据备份" bordered={false}>
                    <Text>
                      创建企业数据备份，确保碳足迹计算和分析数据安全。
                    </Text>
                    <div style={{ marginTop: "16px" }}>
                      <Button type="primary">创建备份</Button>
                      <Button style={{ marginLeft: "16px" }}>还原备份</Button>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </TabPane>

          <TabPane tab="API设置" key="5">
            <Card>
              <Form layout="vertical">
                <Form.Item label="OpenAI API密钥" name="openaiKey">
                  <Input.Password placeholder="sk-xxxxxxxxxxxxxxxxxxxx" />
                </Form.Item>
                <Form.Item label="API请求限制" name="apiLimit">
                  <Select defaultValue="50">
                    <Select.Option value="20">每日20次</Select.Option>
                    <Select.Option value="50">每日50次</Select.Option>
                    <Select.Option value="100">每日100次</Select.Option>
                    <Select.Option value="unlimited">无限制</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary">保存API设置</Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab="关于系统" key="6">
            <Card>
              <Title level={4}>ESG AI平台</Title>
              <Paragraph>版本: 1.0.0</Paragraph>
              <Paragraph>
                ESG
                AI是一个帮助企业计算、分析和管理产品碳足迹的智能平台。利用人工智能技术，
                我们帮助企业识别减排机会，制定可持续发展战略，满足日益严格的环境法规要求。
              </Paragraph>
              <Divider />
              <Title level={5}>功能亮点</Title>
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: "智能碳足迹计算",
                    description: "基于AI的碳足迹计算引擎，支持多种产品和行业",
                  },
                  {
                    title: "BOM智能解析",
                    description: "自动解析物料清单，识别碳足迹热点",
                  },
                  {
                    title: "行业基准对比",
                    description: "与行业基准进行对比，找出改进空间",
                  },
                  {
                    title: "减排策略建议",
                    description:
                      "AI生成的减排策略建议，帮助企业实现可持续发展目标",
                  },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>
        </Tabs>
      </>
    );
  };

  // 添加删除工作流的函数
  const handleDeleteWorkflow = async (workflow: Workflow) => {
    try {
      // 从后端删除
      await workflowApi.deleteWorkflow(workflow.id);

      // 从本地存储删除
      localStorage.removeItem(`workflow_${workflow.id}`);

      // 更新状态
      setWorkflows((prevWorkflows) =>
        prevWorkflows.filter((w) => w.id !== workflow.id),
      );

      message.success("工作流删除成功");
      setDeleteModalVisible(false);
    } catch (error) {
      console.error("删除工作流失败:", error);
      message.error("删除工作流失败");
    }
  };

  // 显示删除确认对话框
  const showDeleteModal = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setDeleteModalVisible(true);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 1px 4px rgba(0,21,41,.08)",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: "bold" }}>ESG AI 平台</div>
        <div style={{ marginLeft: "auto" }}>
          <Button type="link" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider
          width={200}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ background: "#fff" }}
        >
          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            onClick={({ key }) => setActiveSection(key as string)}
            style={{ height: "100%", borderRight: 0 }}
          >
            <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
              仪表板
            </Menu.Item>
            <Menu.Item key="workbench" icon={<ToolOutlined />}>
              工作台
            </Menu.Item>
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              设置
            </Menu.Item>
          </Menu>
        </Sider>

        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            background: "#fff",
            minHeight: 280,
          }}
        >
          {renderContent()}
        </Content>
      </Layout>

      {/* 添加删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={() => workflowToDelete && handleDeleteWorkflow(workflowToDelete)}
        onCancel={() => setDeleteModalVisible(false)}
      >
        <p>确定要删除工作流 "{workflowToDelete?.name}" 吗？此操作无法撤销。</p>
      </Modal>
    </Layout>
  );
};

export default Dashboard;
