import {
    FileExcelOutlined,
    FileTextOutlined,
    InboxOutlined,
    RobotOutlined
} from '@ant-design/icons';
import {
    Button,
    Card,
    Divider,
    Layout,
    message,
    Modal,
    Table,
    Typography,
    Upload
} from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bomApi } from '../services/api';
import safeMessage from '../utils/message';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Content } = Layout;

interface BOMData {
  id: number;
  title: string;
  file_type: string;
  content: string;
  standardized_content: string | null;
  created_at: string;
}

const BomUpload: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedBom, setUploadedBom] = useState<BOMData | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [standardizing, setStandardizing] = useState(false);
  
  const navigate = useNavigate();

  const handleUpload = async () => {
    const formData = new FormData();
    
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }
    
    const file = fileList[0];
    formData.append('file', file as any);
    
    setUploading(true);
    
    try {
      const response = await bomApi.uploadBomFile(file as any);
      setUploadedBom(response.data);
      safeMessage.success('BOM 文件上传成功');
    } catch (error: any) {
      console.error('上传失败:', error);
      safeMessage.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleStandardize = async () => {
    if (!uploadedBom) {
      message.error('请先上传 BOM 文件');
      return;
    }
    
    setStandardizing(true);
    
    try {
      const response = await bomApi.standardizeBomFile(uploadedBom.id);
      setUploadedBom(response.data);
      safeMessage.success('BOM 文件标准化成功');
    } catch (error: any) {
      console.error('标准化失败:', error);
      safeMessage.error(error);
    } finally {
      setStandardizing(false);
    }
  };

  const handlePreview = (content: string) => {
    setPreviewContent(content);
    setPreviewVisible(true);
  };

  const uploadProps: UploadProps = {
    onRemove: file => {
      setFileList([]);
      setUploadedBom(null);
    },
    beforeUpload: file => {
      // 检查文件类型
      const isCSV = file.type === 'text/csv';
      const isExcel = 
        file.type === 'application/vnd.ms-excel' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      if (!isCSV && !isExcel) {
        message.error('只支持上传 CSV 或 Excel 文件!');
        return Upload.LIST_IGNORE;
      }
      
      setFileList([file]);
      return false;
    },
    fileList,
  };

  // 将 CSV 内容转换为表格数据
  const csvToTableData = (csvContent: string) => {
    if (!csvContent) return { columns: [], dataSource: [] };
    
    const rows = csvContent.trim().split('\n');
    if (rows.length === 0) return { columns: [], dataSource: [] };
    
    const headers = rows[0].split(',').map(header => ({
      title: header.trim(),
      dataIndex: header.trim(),
      key: header.trim(),
    }));
    
    const dataSource = rows.slice(1).map((row, index) => {
      const values = row.split(',');
      const rowData: any = { key: index };
      
      headers.forEach((header, i) => {
        rowData[header.dataIndex] = values[i] ? values[i].trim() : '';
      });
      
      return rowData;
    });
    
    return { columns: headers, dataSource };
  };

  // 解析上传的 BOM 内容
  const originalBomTable = uploadedBom ? csvToTableData(uploadedBom.content) : { columns: [], dataSource: [] };
  
  // 解析标准化后的 BOM 内容
  const standardizedBomTable = uploadedBom?.standardized_content 
    ? csvToTableData(uploadedBom.standardized_content) 
    : { columns: [], dataSource: [] };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2}>BOM 文件上传与标准化</Title>
        <Text type="secondary">
          上传您的 BOM (物料清单) 文件，系统将自动分析并标准化格式，便于碳足迹计算。
          支持 CSV 和 Excel 格式。
        </Text>
        
        <Card style={{ marginTop: '24px' }}>
          <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 CSV 和 Excel 格式的 BOM 文件
            </p>
          </Dragger>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={uploading}
              disabled={fileList.length === 0}
              style={{ marginRight: '8px' }}
            >
              {uploading ? '上传中' : '上传 BOM 文件'}
            </Button>
            
            <Button
              type="default"
              onClick={() => navigate('/boms')}
            >
              返回 BOM 列表
            </Button>
          </div>
        </Card>
        
        {uploadedBom && (
          <Card style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4}>
                <FileExcelOutlined /> {uploadedBom.title}
              </Title>
              
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleStandardize}
                loading={standardizing}
                disabled={!!uploadedBom.standardized_content}
              >
                {standardizing ? '标准化中...' : 'AI 标准化 BOM'}
              </Button>
            </div>
            
            <Divider />
            
            <Title level={5}>原始 BOM 内容</Title>
            <div style={{ overflowX: 'auto' }}>
              <Table 
                columns={originalBomTable.columns} 
                dataSource={originalBomTable.dataSource}
                size="small"
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
              />
            </div>
            
            <Button 
              type="link" 
              onClick={() => handlePreview(uploadedBom.content)}
              icon={<FileTextOutlined />}
            >
              查看原始内容
            </Button>
            
            {uploadedBom.standardized_content && (
              <>
                <Divider />
                <Title level={5}>标准化后的 BOM 内容</Title>
                <div style={{ overflowX: 'auto' }}>
                  <Table 
                    columns={standardizedBomTable.columns} 
                    dataSource={standardizedBomTable.dataSource}
                    size="small"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
                
                <Button 
                  type="link" 
                  onClick={() => handlePreview(uploadedBom.standardized_content || '')}
                  icon={<FileTextOutlined />}
                >
                  查看标准化内容
                </Button>
              </>
            )}
          </Card>
        )}
        
        <Modal
          title="BOM 内容预览"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={null}
          width={800}
        >
          <pre style={{ 
            maxHeight: '500px', 
            overflow: 'auto', 
            background: '#f5f5f5', 
            padding: '16px',
            borderRadius: '4px'
          }}>
            {previewContent}
          </pre>
        </Modal>
      </Content>
    </Layout>
  );
};

export default BomUpload; 