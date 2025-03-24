import React from 'react';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService, RegisterData } from '../services/auth';

const { Title } = Typography;

const ERROR_MESSAGES: { [key: string]: string } = {
  'User already registered': '该邮箱已被注册',
  'Password too short': '密码长度不足',
  'Invalid email': '邮箱格式不正确',
};

const SafeRegisterForm: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const onFinish = async (values: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      await authService.register(values);
      message.success('注册成功！请检查邮箱完成验证。');
      navigate('/login');
    } catch (error: any) {
      console.error('注册失败:', error);
      const errorMessage = ERROR_MESSAGES[error.message] || error.message || '注册失败，请稍后再试';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      name="register"
      onFinish={onFinish}
      layout="vertical"
      requiredMark={false}
    >
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱!' },
          { type: 'email', message: '请输入有效的邮箱地址!' }
        ]}
      >
        <Input size="large" placeholder="请输入邮箱" />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码!' },
          { min: 6, message: '密码至少6个字符!' }
        ]}
      >
        <Input.Password size="large" placeholder="请输入密码" />
      </Form.Item>

      <Form.Item
        name="full_name"
        label="姓名"
        rules={[
          { required: true, message: '请输入姓名!' },
          { min: 2, message: '姓名至少2个字符!' }
        ]}
      >
        <Input size="large" placeholder="请输入姓名" />
      </Form.Item>

      <Form.Item
        name="company"
        label="公司"
        rules={[
          { required: true, message: '请输入公司名称!' }
        ]}
      >
        <Input size="large" placeholder="请输入公司名称" />
      </Form.Item>

      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon />
        </Form.Item>
      )}

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          注册
        </Button>
      </Form.Item>

      <Form.Item>
        <Button type="link" onClick={() => navigate('/login')} block>
          已有账号？立即登录
        </Button>
      </Form.Item>
    </Form>
  );
};

const Register: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          ESG AI 平台注册
        </Title>
        <SafeRegisterForm />
      </Card>
    </div>
  );
};

export default Register;
