import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Form, Input, Typography } from 'antd';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { userApi } from '../services/api';
import safeMessage from '../utils/message';

const { Title, Text } = Typography;

// 安全的登录表单提交处理器
const SafeLoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      setFormError(null);
      setDebug(null);
      
      // 输出调试信息
      console.log('尝试登录:', values);
      
      const response = await userApi.login(values);
      
      // 输出响应以便调试
      console.log('登录成功，响应:', response);
      
      // 保存调试信息，使用安全格式
      setDebug({
        success: true,
        data: typeof response.data === 'object' ? JSON.stringify(response.data) : response.data
      });
      
      // 检查响应结构
      if (!response.data?.access_token) {
        throw new Error('服务器返回的数据格式不正确');
      }
      
      // 保存 token 到 localStorage
      localStorage.setItem('token', response.data.access_token);
      
      safeMessage.success('登录成功！');
      
      // 延迟一会再跳转，以便查看调试信息
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('登录失败:', error);
      
      // 安全地保存调试信息
      setDebug({
        success: false,
        error: typeof error === 'object' ? JSON.stringify(error) : error,
        message: error.message,
        status: error.status
      });
      
      // 详细记录错误信息
      console.log('错误状态:', error.status);
      console.log('错误消息:', error.message);
      
      // 设置表单错误
      if (error.isValidationError) {
        setFormError('用户名或密码格式错误，请检查您的输入');
      } else if (error.status === 401) {
        setFormError('用户名或密码错误');
      } else {
        setFormError(typeof error.message === 'string' ? error.message : '登录失败，请稍后再试');
      }
      
      // 使用安全的消息组件显示错误
      if (error.isValidationError) {
        safeMessage.error('用户名或密码格式错误，请检查您的输入');
      } else if (error.status === 401) {
        safeMessage.error('用户名或密码错误');
      } else {
        safeMessage.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Alert 
        type="info" 
        message="测试账号"
        description={<>
          用户名: <Text code>test@example.com</Text><br />
          密码: <Text code>password123</Text>
        </>}
        style={{ marginBottom: '20px' }}
      />
      
      <Form
        name="login"
        initialValues={{ username: 'test', password: 'password123' }}
        onFinish={onFinish}
        size="large"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名!' }]}
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="用户名" 
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码!' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
          />
        </Form.Item>

        {formError && (
          <Alert
            message="登录失败"
            description={formError}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            style={{ width: '100%' }}
            loading={loading}
          >
            登录
          </Button>
        </Form.Item>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span>还没有账号？</span>
          <Link to="/register">立即注册</Link>
        </div>
      </Form>
      
      
    </>
  );
};

// 登录页面组件，包含错误边界
const Login: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '20px 0'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>ESG AI 平台</Title>
          <Divider />
          <Title level={4}>用户登录</Title>
        </div>
        
        <ErrorBoundary>
          <SafeLoginForm />
        </ErrorBoundary>
      </Card>
    </div>
  );
};

export default Login; 